const { Module } = require("../main");
const { convert: imageToPdf, sizes } = require("image-to-pdf");
const fileSystem = require("node:fs/promises");
const fileType = require("file-type");
const { MODE } = require("../config");
const path = require("path");
const fs = require("fs");
const { getTempSubdir, getTempPath } = require("../core/helpers");

const getFileType = async (buffer) => {
  try {
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

const imageInputDirectory = getTempSubdir("pdf");
const finalPdfOutputPath = getTempPath("converted.pdf");

Module(
  {
    pattern: "pdf ?(.*)",
    fromMe: MODE === "private",
    desc: "Images to PDF",
    use: "converters",
    usage: ".pdf help",
  },
  async (message, commandArguments) => {
    const subCommand = commandArguments[1]?.toLowerCase();

    if (subCommand === "help") {
      await message.sendReply(
        `_1. Input images using .pdf_\n_2. Get output pdf using .pdf get_\n_3. Added images by mistake? then delete all inputted images using .pdf delete_\n_4. All files will be auto deleted after the output is produced_`
      );
    } else if (subCommand === "delete") {
      const currentFiles = await fileSystem.readdir(imageInputDirectory);
      const filesToDelete = currentFiles.map((fileName) =>
        path.join(imageInputDirectory, fileName)
      );

      await Promise.all(
        filesToDelete.map((filePath) => fileSystem.unlink(filePath))
      );

      try {
        await fileSystem.unlink(finalPdfOutputPath);
      } catch (error) {}
      await message.sendReply(`_Successfully cleared all files!_`);
    } else if (subCommand === "get") {
      const allStoredFiles = await fileSystem.readdir(imageInputDirectory);
      const imageFilePaths = allStoredFiles
        .filter((fileName) => fileName.includes("topdf"))
        .map((fileName) => path.join(imageInputDirectory, fileName));

      if (!imageFilePaths.length) {
        return await message.sendReply("_No files inputted_");
      }

      const pdfGenerationStream = imageToPdf(imageFilePaths, sizes.A4);
      const pdfWriteStream = fs.createWriteStream(finalPdfOutputPath);

      pdfGenerationStream.pipe(pdfWriteStream);

      pdfWriteStream.on("finish", async () => {
        await message.client.sendMessage(
          message.jid,
          {
            document: { url: finalPdfOutputPath },
            mimetype: "application/pdf",
            fileName: "converted.pdf",
          },
          { quoted: message.data }
        );

        const filesToCleanUp = await fileSystem.readdir(imageInputDirectory);
        const tempFilesForDeletion = filesToCleanUp.map((fileName) =>
          path.join(imageInputDirectory, fileName)
        );
        await Promise.all(
          tempFilesForDeletion.map((filePath) => fileSystem.unlink(filePath))
        );
        await fileSystem.unlink(finalPdfOutputPath);
      });

      pdfWriteStream.on("error", async (error) => {
        await message.sendReply(`_PDF conversion failed: ${error.message}_`);
      });
    } else if (message.reply_message && message.reply_message.album) {
      // handle album
      const albumData = await message.reply_message.download();
      const allImages = albumData.images || [];

      if (allImages.length === 0)
        return await message.sendReply("_No images in album (videos can't be converted to PDF)_");

      await message.send(
        `_Adding ${allImages.length} album images to PDF..._`
      );

      for (let i = 0; i < allImages.length; i++) {
        try {
          const file = allImages[i];
          const detectedFileType = await getFileType(
            fs.readFileSync(file)
          );

          if (detectedFileType && detectedFileType.mime.startsWith("image")) {
            const newImagePath = path.join(
              imageInputDirectory,
              `topdf_album_${i}.jpg`
            );
            fs.copyFileSync(file, newImagePath);
          }
        } catch (err) {
          console.error("Failed to add album image to PDF:", err);
        }
      }

      await message.sendReply(
        `_*Successfully saved ${allImages.length} album images*_\n_*Total images ready. Use '.pdf get' to generate PDF!*_`
      );
    } else if (message.reply_message) {
      const repliedMessageBuffer = await message.reply_message.download(
        "buffer"
      );
      const detectedFileType = await getFileType(repliedMessageBuffer);

      if (detectedFileType && detectedFileType.mime.startsWith("image")) {
        const existingImageFiles = (
          await fileSystem.readdir(imageInputDirectory)
        ).filter((fileName) => fileName.includes("topdf"));
        const nextImageIndex = existingImageFiles.length;
        const newImagePath = path.join(
          imageInputDirectory,
          `topdf_${nextImageIndex}.jpg`
        );

        await fileSystem.writeFile(newImagePath, repliedMessageBuffer);
        return await message.sendReply(
          `*_Successfully saved image_*\n_*Total saved images: ${
            nextImageIndex + 1
          }*_\n*_After saving all images, use '.pdf get' to get the result. Images will be deleted after conversion!_*`
        );
      } else {
        return await message.sendReply(
          "_Reply to an image to add it for PDF conversion!_"
        );
      }
    } else {
      return await message.sendReply(
        '_Reply to an image, or use ".pdf help" for more information._'
      );
    }
  }
);
