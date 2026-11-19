const { albumMessage, getAlbumMessages } = require("./album");
const { setProfilePicture } = require("./profile-picture");

// socket methods plugins call as message.client.*. they read bot.sock at call time so a
// held client survives reconnects.
function attachSocketFeatures(sock, bot) {
  sock.setProfilePicture = (jid, content) => setProfilePicture(bot, jid, content);
  sock.albumMessage = (jid, array, quoted) => albumMessage(bot, jid, array, quoted);
  sock.getAlbumMessages = (albumMessageId) => getAlbumMessages(bot, albumMessageId);
  return sock;
}

module.exports = { attachSocketFeatures };
