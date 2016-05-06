"use strict";

var debug = require('debug')('hoch');
var respond = require('./respond');

module.exports = class {
  constructor(id, socket, server) {
    this.id = id;
    this.socket = socket;

    this.debug('connection');

    respond(this.socket, 'run', msg => server.run(this, msg.ids));
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
    return 'client (' + this.id + ') ' + this.socket.request.headers['user-agent'];
  }

  disconnect() {
    this.debug('disconnected');
  }
};
