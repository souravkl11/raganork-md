const { albumMessage, getAlbumMessages } = require("./album");
const { setProfilePicture } = require("./profile-picture");

// the socket methods plugins call as message.client.*. attached once per socket, right
// after it is created, so they exist before the first connection.update. each call reads
// bot.sock at call time, like the listeners do, so a held client keeps working after a reconnect
function attachSocketFeatures(sock, bot) {
  sock.setProfilePicture = (jid, content) => setProfilePicture(bot, jid, content);
  sock.albumMessage = (jid, array, quoted) => albumMessage(bot, jid, array, quoted);
  sock.getAlbumMessages = (albumMessageId) => getAlbumMessages(bot, albumMessageId);
  return sock;
}

module.exports = { attachSocketFeatures };
