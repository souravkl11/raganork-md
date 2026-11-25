const { Module } = require("../main");
const fileSystem = require("node:fs/promises");
const path = require("path");
const fs = require("fs");
const { uniqueTempPath } = require("../core/helpers");
const { helpPrefix } = require("../core/plugins/registry");
const { accountKey } = require("./utils");
const { stagingDir, removeDir } = require("./utils/mediaProcessors");
const { getString } = require("./utils/lang");
const Lang = getString("pdf");

const getFileType = async (buffer) => {
  try {
    const fileType = require("file-type");
    if (fileType.fileTypeFromBuffer) {
      return await fileType.fileTypeFromBuffer(buffer);
    }

    if (fileType.fromBuffer) {
      return await fileType.fromBuffer(buffer);
    }

    return await fileType(buffer);
  } catch (error) {
    console.log("file-type detection failed:", error);
    return null;
  }
};

const imageFiles = async (directory) =>
  (await fileSystem.readdir(directory)).filter((fileName) => fileName.includes("topdf")).sort();

// numbered after the images already staged; "wx" keeps two quick additions from overwriting each other
async function saveImage(directory, buffer) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const index = (await imageFiles(directory)).length + attempt;
    const target = path.join(directory, `topdf_${String(index).padStart(4, "0")}.jpg`);
    try {
      await fileSystem.writeFile(target, buffer, { flag: "wx" });
      return index + 1;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }
  throw new Error("could not save the image");
}

Module(
  {
    pattern: "pdf ?(.*)",
    desc: Lang.DESC,
    use: "converters",
    usage: ".pdf help",
  },
  async (message, commandArguments) => {
    const subCommand = commandArguments[1]?.toLowerCase();
    const prefix = helpPrefix();

    if (subCommand === "help") {
      return await message.sendReply(
        Lang.HELP.replaceAll("{p}", prefix)
      );
    }

    const imageInputDirectory = await stagingDir(
      "pdf",
      accountKey(message.jid, message.sender)
    );

    if (subCommand === "delete") {
      await removeDir(imageInputDirectory);
      await message.sendReply(Lang.CLEARED);
    } else if (subCommand === "get") {
      const imageFilePaths = (await imageFiles(imageInputDirectory)).map(
        (fileName) => path.join(imageInputDirectory, fileName)
      );

      if (!imageFilePaths.length) {
        return await message.sendReply(Lang.NO_FILES);
      }

      // pdfkit is heavy, only load it when a pdf is actually built
      const { convert: imageToPdf, sizes } = require("image-to-pdf");
      const finalPdfOutputPath = uniqueTempPath("converted.pdf");
      try {
        await new Promise((resolve, reject) => {
          const pdfGenerationStream = imageToPdf(imageFilePaths, sizes.A4);
          const pdfWriteStream = fs.createWriteStream(finalPdfOutputPath);
          pdfGenerationStream.on("error", reject);
          pdfWriteStream.on("error", reject);
          pdfWriteStream.on("finish", resolve);
          pdfGenerationStream.pipe(pdfWriteStream);
        });
      } catch (error) {
        await fileSystem.unlink(finalPdfOutputPath).catch(() => {});
        return await message.sendReply(Lang.FAILED.format(error.message));
      }
      try {
        await message.client.sendMessage(
          message.jid,
          {
            document: { url: finalPdfOutputPath },
            mimetype: "application/pdf",
            fileName: "converted.pdf",
          },
          { quoted: message.data }
        );
      } finally {
        await fileSystem.unlink(finalPdfOutputPath).catch(() => {});
        await removeDir(imageInputDirectory);
      }
    } else if (message.reply_message && message.reply_message.album) {
      const albumData = await message.reply_message.download();
      const allImages = albumData.images || [];

      try {
        if (allImages.length === 0)
          return await message.sendReply(Lang.NO_ALBUM_IMAGES);

        await message.send(
          Lang.ADDING_ALBUM.format(allImages.length)
        );

        let added = 0;
        for (const file of allImages) {
          try {
            const imageBuffer = await fileSystem.readFile(file);
            const detectedFileType = await getFileType(imageBuffer);

            if (detectedFileType && detectedFileType.mime.startsWith("image")) {
              await saveImage(imageInputDirectory, imageBuffer);
              added++;
            }
          } catch (err) {
            console.error("Failed to add album image to PDF:", err);
          }
        }

        await message.sendReply(
          Lang.ALBUM_SAVED.format(added).replaceAll("{p}", prefix)
        );
      } finally {
        await Promise.all(
          [...allImages, ...(albumData.videos || [])].map((file) =>
            fileSystem.unlink(file).catch(() => {})
          )
        );
      }
    } else if (message.reply_message) {
      const repliedMessageBuffer = await message.reply_message.download(
        "buffer"
      );
      const detectedFileType = await getFileType(repliedMessageBuffer);

      if (detectedFileType && detectedFileType.mime.startsWith("image")) {
        const total = await saveImage(imageInputDirectory, repliedMessageBuffer);
        return await message.sendReply(
          Lang.SAVED.format(total).replaceAll("{p}", prefix)
        );
      } else {
        return await message.sendReply(
          Lang.NEED_IMAGE
        );
      }
    } else {
      return await message.sendReply(
        Lang.NEED_REPLY.replaceAll("{p}", prefix)
      );
    }
  }
);
