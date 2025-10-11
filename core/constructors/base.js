"use strict";

class Base {
  constructor(client) {
    Object.defineProperty(this, "client", { value: client });
  }

  _clone() {
    return Object.assign(Object.create(this), this);
  }

  _patch(data) {
    return data;
  }
}

module.exports = Base;
