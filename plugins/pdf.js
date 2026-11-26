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

// true once sent; a pdfkit failure is answered here
async function sendPdf(message, imagePaths) {
  // pdfkit is heavy, only load it when a pdf is actually built
  const { convert: imageToPdf, sizes } = require("image-to-pdf");
  const output = uniqueTempPath("converted.pdf");
  try {
    try {
      await new Promise((resolve, reject) => {
        const pdfStream = imageToPdf(imagePaths, sizes.A4);
        const writeStream = fs.createWriteStream(output);
        pdfStream.on("error", reject);
        writeStream.on("error", reject);
        writeStream.on("finish", resolve);
        pdfStream.pipe(writeStream);
      });
    } catch (error) {
      await message.sendReply(Lang.FAILED.format(error.message));
      return false;
    }
    await message.client.sendMessage(
      message.jid,
      { document: { url: output }, mimetype: "application/pdf", fileName: "converted.pdf" },
      { quoted: message.data }
    );
    return true;
  } finally {
    await fileSystem.unlink(output).catch(() => {});
  }
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

      if (await sendPdf(message, imageFilePaths)) await removeDir(imageInputDirectory);
    } else if (message.reply_message && message.reply_message.album) {
      const albumData = await message.reply_message.download();
      const allImages = albumData.images || [];
      try {
        const images = [];
        for (const file of allImages) {
          const type = await getFileType(await fileSystem.readFile(file)).catch(() => null);
          if (type?.mime.startsWith("image")) images.push(file);
        }
        if (!images.length) return await message.sendReply(Lang.NO_ALBUM_IMAGES);
        await message.send(Lang.MAKING_ALBUM_PDF.format(images.length));
        await sendPdf(message, images);
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
