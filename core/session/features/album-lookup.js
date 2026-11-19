const { logger } = require("../../../config");
const { getFullMessage, AntiDeleteCache, reviveBuffers } = require("../../store");

async function getAlbumMessages(bot, albumMessageId) {
  let expectedImageCount = 0;
  let expectedVideoCount = 0;
  let albumTimestamp = 0;
  let parentRemoteJid = null;
  let parentFromMe = false;
  let inCache = false;
  const parentCacheKey = (
    bot.messageCache.keys
      ? bot.messageCache.keys()
      : Object.keys(bot.messageCache.data || {})
  ).find((key) => key.endsWith(`_${albumMessageId}`));
  if (parentCacheKey) {
    const parentMsg = bot.messageCache.get(parentCacheKey);
    if (parentMsg?.message?.albumMessage) {
      expectedImageCount =
        parentMsg.message.albumMessage.expectedImageCount || 0;
      expectedVideoCount =
        parentMsg.message.albumMessage.expectedVideoCount || 0;
      albumTimestamp = parentMsg.messageTimestamp || 0;
      parentRemoteJid = parentMsg.key?.remoteJid;
      parentFromMe = parentMsg.key?.fromMe || false;
      inCache = true;
    }
  }
  if (!expectedImageCount && !expectedVideoCount) {
    try {
      const dbResult = await getFullMessage(albumMessageId);
      if (
        dbResult.found &&
        dbResult.messageData?.message?.albumMessage
      ) {
        expectedImageCount =
          dbResult.messageData.message.albumMessage
            .expectedImageCount || 0;
        expectedVideoCount =
          dbResult.messageData.message.albumMessage
            .expectedVideoCount || 0;
        albumTimestamp = dbResult.messageData.messageTimestamp || 0;
        parentRemoteJid = dbResult.messageData.key?.remoteJid;
        parentFromMe = dbResult.messageData.key?.fromMe || false;
        inCache = false;
      }
    } catch (err) {
      logger.error(
        { session: bot.sessionId, albumId: albumMessageId, err },
        "Failed to get album parent from database",
      );
    }
  }
  if (!expectedImageCount && !expectedVideoCount) {
    return {
      images: [],
      videos: [],
      complete: false,
      expectedImageCount: 0,
      expectedVideoCount: 0,
    };
  }

  const childMessages = [];
  const TIMESTAMP_WINDOW = 5;

  if (inCache) {
    const cacheKeys = bot.messageCache.keys
      ? bot.messageCache.keys()
      : Object.keys(bot.messageCache.data || {});
    for (const key of cacheKeys) {
      const msg = bot.messageCache.get(key);
      if (
        msg?.message?.messageContextInfo?.messageAssociation
          ?.parentMessageKey?.id === albumMessageId
      ) {
        childMessages.push(msg);
      }
    }
  } else {
    try {
      const { Op } = require("sequelize");
      const dbMessages = await AntiDeleteCache.findAll({
        where: {
          timestamp: { [Op.gte]: new Date(albumTimestamp * 1000) },
        },
        limit: 500,
        order: [["timestamp", "ASC"]],
      });
      for (const dbMsg of dbMessages) {
        const fullContent = reviveBuffers(dbMsg.fullContent);
        if (
          fullContent?.message?.messageContextInfo?.messageAssociation
            ?.parentMessageKey?.id === albumMessageId &&
          !childMessages.some((m) => m.key.id === fullContent.key.id)
        ) {
          childMessages.push(fullContent);
        }
      }
    } catch (err) {
      logger.error(
        { session: bot.sessionId, albumId: albumMessageId, err },
        "Failed to fetch album child messages from database",
      );
    }
  }

  const images = [];
  const videos = [];

  for (const msg of childMessages) {
    if (msg.message?.imageMessage) {
      images.push(msg);
    } else if (msg.message?.videoMessage) {
      videos.push(msg);
    }
  }

  const complete =
    images.length === expectedImageCount &&
    videos.length === expectedVideoCount;

  if (!complete && parentRemoteJid && albumTimestamp) {
    logger.debug(
      { session: bot.sessionId, albumId: albumMessageId },
      `album children incomplete (${images.length}/${expectedImageCount} images, ${videos.length}/${expectedVideoCount} videos), trying fallback timestamp matching`,
    );

    const fallbackCandidates = [];

    if (inCache) {
      const cacheKeys = bot.messageCache.keys
        ? bot.messageCache.keys()
        : Object.keys(bot.messageCache.data || {});
      for (const key of cacheKeys) {
        const msg = bot.messageCache.get(key);
        if (
          msg &&
          msg.key?.id !== albumMessageId &&
          !childMessages.some((m) => m.key.id === msg.key.id)
        ) {
          const msgTimestamp = msg.messageTimestamp || 0;
          const timeDiff = Math.abs(msgTimestamp - albumTimestamp);

          if (
            msg.key?.remoteJid === parentRemoteJid &&
            msg.key?.fromMe === parentFromMe &&
            timeDiff <= TIMESTAMP_WINDOW &&
            (msg.message?.imageMessage || msg.message?.videoMessage)
          ) {
            fallbackCandidates.push({ msg, timeDiff });
          }
        }
      }
    } else {
      try {
        const { Op } = require("sequelize");
        const startTime = new Date(
          (albumTimestamp - TIMESTAMP_WINDOW) * 1000,
        );
        const endTime = new Date(
          (albumTimestamp + TIMESTAMP_WINDOW) * 1000,
        );

        const dbMessages = await AntiDeleteCache.findAll({
          where: {
            timestamp: {
              [Op.between]: [startTime, endTime],
            },
          },
          limit: 100,
          order: [["timestamp", "ASC"]],
        });

        for (const dbMsg of dbMessages) {
          const fullContent = reviveBuffers(dbMsg.fullContent);
          if (
            fullContent &&
            fullContent.key?.id !== albumMessageId &&
            !childMessages.some((m) => m.key.id === fullContent.key.id)
          ) {
            const msgTimestamp = fullContent.messageTimestamp || 0;
            const timeDiff = Math.abs(msgTimestamp - albumTimestamp);

            if (
              fullContent.key?.remoteJid === parentRemoteJid &&
              fullContent.key?.fromMe === parentFromMe &&
              (fullContent.message?.imageMessage ||
                fullContent.message?.videoMessage)
            ) {
              fallbackCandidates.push({ msg: fullContent, timeDiff });
            }
          }
        }
      } catch (err) {
        logger.error(
          { session: bot.sessionId, albumId: albumMessageId, err },
          "Failed to fetch fallback candidates from database",
        );
      }
    }

    fallbackCandidates.sort((a, b) => a.timeDiff - b.timeDiff);

    const neededImages = expectedImageCount - images.length;
    const neededVideos = expectedVideoCount - videos.length;
    let addedImages = 0;
    let addedVideos = 0;

    for (const { msg } of fallbackCandidates) {
      if (msg.message?.imageMessage && addedImages < neededImages) {
        images.push(msg);
        childMessages.push(msg);
        addedImages++;
        logger.debug(
          { session: bot.sessionId, msgId: msg.key.id },
          `fallback matched image child for album ${albumMessageId}`,
        );
      } else if (
        msg.message?.videoMessage &&
        addedVideos < neededVideos
      ) {
        videos.push(msg);
        childMessages.push(msg);
        addedVideos++;
        logger.debug(
          { session: bot.sessionId, msgId: msg.key.id },
          `fallback matched video child for album ${albumMessageId}`,
        );
      }

      if (addedImages >= neededImages && addedVideos >= neededVideos) {
        break;
      }
    }
  }

  const finalComplete =
    images.length === expectedImageCount &&
    videos.length === expectedVideoCount;

  return {
    images,
    videos,
    complete: finalComplete,
    expectedImageCount,
    expectedVideoCount,
  };
}

module.exports = { getAlbumMessages };
