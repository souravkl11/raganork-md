const { Module } = require("../main");
const fileSystem = require("node:fs/promises");
const path = require("path");
const fs = require("fs");
const { uniqueTempPath } = require("../core/helpers");
const { helpPrefix } = require("../core/plugins/registry");
const { accountKey } = require("./utils");
const { stagingDir, removeDir } = require("./utils/mediaProcessors");

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
    desc: "Images to PDF",
    use: "converters",
    usage: ".pdf help",
  },
  async (message, commandArguments) => {
    const subCommand = commandArguments[1]?.toLowerCase();
    const prefix = helpPrefix();

    if (subCommand === "help") {
      return await message.sendReply(
        `_1. Input images using ${prefix}pdf_\n_2. Get output pdf using ${prefix}pdf get_\n_3. Added images by mistake? then delete all inputted images using ${prefix}pdf delete_\n_4. All files will be auto deleted after the output is produced_`
      );
    }

    const imageInputDirectory = await stagingDir(
      "pdf",
      accountKey(message.jid, message.sender)
    );

    if (subCommand === "delete") {
      await removeDir(imageInputDirectory);
      await message.sendReply(`_Successfully cleared all files!_`);
    } else if (subCommand === "get") {
      const imageFilePaths = (await imageFiles(imageInputDirectory)).map(
        (fileName) => path.join(imageInputDirectory, fileName)
      );

      if (!imageFilePaths.length) {
        return await message.sendReply("_No files inputted_");
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
        return await message.sendReply(`_PDF conversion failed: ${error.message}_`);
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
          return await message.sendReply("_No images in album (videos can't be converted to PDF)_");

        await message.send(
          `_Adding ${allImages.length} album images to PDF..._`
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
          `_*Successfully saved ${added} album images*_\n_*Total images ready. Use '${prefix}pdf get' to generate PDF!*_`
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
          `*_Successfully saved image_*\n_*Total saved images: ${total}*_\n*_After saving all images, use '${prefix}pdf get' to get the result. Images will be deleted after conversion!_*`
        );
      } else {
        return await message.sendReply(
          "_Reply to an image to add it for PDF conversion!_"
        );
      }
    } else {
      return await message.sendReply(
        `_Reply to an image, or use "${prefix}pdf help" for more information._`
      );
    }
  }
);
