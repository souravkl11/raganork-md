const Base = require("./base");

class GroupUpdate extends Base {
  constructor(client, data) {
    super(client);
    if (data) this._patch(data);
  }

  _patch(data) {
    this.jid = data.id;
    this.action = data.action;

    this.participant = data.participants || [];

    this.from = data.author || null;

    return super._patch(data);
  }
}

module.exports = GroupUpdate;
