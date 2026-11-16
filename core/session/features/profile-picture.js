const { loadBaileys } = require("../../helpers");

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function generateProfilePicture(mediaUpload) {
  let bufferOrFilePath;

  if (Buffer.isBuffer(mediaUpload)) {
    bufferOrFilePath = mediaUpload;
  } else if (
    typeof mediaUpload === "object" &&
    "url" in mediaUpload &&
    typeof mediaUpload.url === "string"
  ) {
    bufferOrFilePath = mediaUpload.url;
  } else if (typeof mediaUpload === "object" && "stream" in mediaUpload) {
    try {
      bufferOrFilePath = await streamToBuffer(mediaUpload.stream);
    } catch (streamErr) {
      throw new Error(
        `Failed to convert stream to buffer: ${streamErr.message}`,
      );
    }
  } else {
    throw new Error(
      "Invalid mediaUpload format. Expected Buffer, { url: string }, or { stream: ReadableStream }.",
    );
  }

  try {
    const jimp = await require("jimp").read(bufferOrFilePath);

    const maxWidth = 720;
    const maxHeight = 720;

    let width = jimp.bitmap.width;
    let height = jimp.bitmap.height;

    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;

    const ratio = Math.min(widthRatio, heightRatio);

    if (ratio < 1) {
      width = width * ratio;
      height = height * ratio;
    }

    const finalWidth = parseInt(width);
    const finalHeight = parseInt(height);

    console.log(
      `Engine: Resizing image from ${jimp.bitmap.width}x${jimp.bitmap.height} to ${finalWidth}x${finalHeight}`,
    );
    return await jimp
      .resize(finalWidth, finalHeight)
      .getBufferAsync("image/jpeg");
  } catch (error) {
    console.error("Error processing image for profile picture:", error);
    throw new Error(`Could not generate profile picture: ${error.message}`);
  }
}

// sets the bot's own picture, or another jid's when the bot may (group admin)
async function setProfilePicture(bot, jid, content) {
  const { jidNormalizedUser } = await loadBaileys();
  if (!jid) {
    throw new Error("JID is required for profile picture update");
  }

  let targetJid;
  if (jidNormalizedUser(jid) !== jidNormalizedUser(bot.sock.user.id)) {
    targetJid = jidNormalizedUser(jid);
  }

  const img = await generateProfilePicture(content);
  await bot.sock.query({
    tag: "iq",
    attrs: {
      target: targetJid,
      to: "@s.whatsapp.net",
      type: "set",
      xmlns: "w:profile:picture",
    },
    content: [
      {
        tag: "picture",
        attrs: { type: "image" },
        content: img,
      },
    ],
  });
}

module.exports = { generateProfilePicture, setProfilePicture };
