const crypto = require("crypto");
const fs = require("fs");
const { loadBaileys } = require("../../helpers");
const { logger } = require("../../../config");
const { storeMessage } = require("../../store");
const { getBuffer } = require("../../net");
const { getAlbumMessages } = require("./album-lookup");

// sends an album: the parent message first, then every image or video as a child of it
async function albumMessage(bot, jid, array, quoted) {
  const { generateWAMessage, generateWAMessageFromContent } = await loadBaileys();
  // Helper function to process media input
  const processMedia = async (media) => {
    if (typeof media === "string") {
      if (media.startsWith("http://") || media.startsWith("https://")) {
        return await getBuffer(media);
      } else if (fs.existsSync(media)) {
        return fs.readFileSync(media);
      } else {
        throw new Error(`Invalid media path: ${media}`);
      }
    } else if (Buffer.isBuffer(media)) {
      return media;
    } else {
      throw new Error("Media must be a URL, file path, or Buffer");
    }
  };

  const album = generateWAMessageFromContent(
    jid,
    {
      messageContextInfo: {
        messageSecret: crypto.randomBytes(32),
      },
      albumMessage: {
        expectedImageCount: array.filter((a) =>
          a.hasOwnProperty("image"),
        ).length,
        expectedVideoCount: array.filter((a) =>
          a.hasOwnProperty("video"),
        ).length,
      },
    },
    {
      userJid: bot.sock.user.jid,
      quoted,
      upload: bot.sock.waUploadToServer,
    },
  );

  await bot.sock.relayMessage(jid, album.message, {
    messageId: album.key.id,
  });

  // store album parent message to database using storeMessage
  try {
    const botJid = bot.sock.user.id.split(":")[0] + "@s.whatsapp.net";
    const albumParentCacheEntry = {
      key: {
        ...album.key,
        fromMe: true,
        participant: botJid,
      },
      message: album.message,
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: null,
    };
    await storeMessage(albumParentCacheEntry);
    // also cache in memory for immediate retrieval
    const cacheKey = `${album.key.remoteJid}_${album.key.id}`;
    bot.messageCache.set(cacheKey, albumParentCacheEntry);

    logger.debug(
      { session: bot.sessionId, albumId: album.key.id },
      `album parent message stored to database`,
    );
  } catch (storeError) {
    logger.error(
      {
        session: bot.sessionId,
        albumId: album.key.id,
        err: storeError,
      },
      `failed to store album parent message to database`,
    );
  }

  for (let content of array) {
    // Process media content
    const processedContent = { ...content };
    if (processedContent.image) {
      processedContent.image = await processMedia(
        processedContent.image,
      );
    }
    if (processedContent.video) {
      processedContent.video = await processMedia(
        processedContent.video,
      );
    }

    const img = await generateWAMessage(jid, processedContent, {
      upload: bot.sock.waUploadToServer,
    });

    img.message.messageContextInfo = {
      messageSecret: crypto.randomBytes(32),
      messageAssociation: {
        associationType: 1,
        parentMessageKey: album.key,
      },
      participant: "0@s.whatsapp.net",
      remoteJid: "status@broadcast",
      forwardingScore: 99999,
      isForwarded: true,
      mentionedJid: [jid],
      starred: true,
      labels: ["Y", "Important"],
      isHighlighted: true,
      businessMessageForwardInfo: {
        businessOwnerJid: jid,
      },
      dataSharingContext: {
        showMmDisclosure: true,
      },
    };

    img.message.forwardedNewsletterMessageInfo = {
      newsletterJid: "0@newsletter",
      serverMessageId: 1,
      newsletterName: `WhatsApp`,
      contentType: 1,
      timestamp: new Date().toISOString(),
      senderName: "Raganork",
      content: "Album Message",
      priority: "high",
      status: "sent",
    };

    img.message.disappearingMode = {
      initiator: 3,
      trigger: 4,
      initiatorDeviceJid: jid,
      initiatedByExternalService: true,
      initiatedByUserDevice: true,
      initiatedBySystem: true,
      initiatedByServer: true,
      initiatedByAdmin: true,
      initiatedByUser: true,
      initiatedByApp: true,
      initiatedByBot: true,
      initiatedByMe: true,
    };

    await bot.sock.relayMessage(jid, img.message, {
      messageId: img.key.id,
      quoted: {
        key: {
          remoteJid: album.key.remoteJid,
          id: album.key.id,
          fromMe: true,
          participant: bot.sock.user.jid,
        },
        message: album.message,
      },
    });

    // store album child message to database using storeMessage
    try {
      const botJid =
        bot.sock.user.id.split(":")[0] + "@s.whatsapp.net";
      const albumChildCacheEntry = {
        key: {
          ...img.key,
          fromMe: true,
          participant: botJid,
        },
        message: img.message,
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: null,
      };

      // remove relay-only fields before storing
      delete albumChildCacheEntry.message
        .forwardedNewsletterMessageInfo;
      delete albumChildCacheEntry.message.disappearingMode;

      await storeMessage(albumChildCacheEntry);
      const cacheKey = `${img.key.remoteJid}_${img.key.id}`;
      bot.messageCache.set(cacheKey, albumChildCacheEntry);

      logger.debug(
        { session: bot.sessionId, messageId: img.key.id },
        `album child message stored to database`,
      );
    } catch (storeError) {
      logger.error(
        {
          session: bot.sessionId,
          messageId: img.key.id,
          err: storeError,
        },
        `failed to store album child message to database`,
      );
    }
  }
  return album;
}

module.exports = { albumMessage, getAlbumMessages };
