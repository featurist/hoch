"use strict";

var debug = require('debug')('hoch');
var respond = require('./respond');
var useragent = require('useragent');

module.exports = class {
  constructor(id, socket, server) {
    this.id = id;
    this.socket = socket;

    this.debug('connection');

    respond(this.socket, 'run', msg => server.run(this, msg.module, msg.ids));
  }

  debug() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.name());
    debug.apply(undefined, args);
  }

  data(msg) {
    this.socket.emit('data', msg);
  }

  name() {
    return this._name || (this._name = 'client (' + this.id + '):' + useragent.parse(this.socket.request.headers['user-agent']).toAgent());
  }

  disconnect() {
    this.debug('disconnected');
  }
};
