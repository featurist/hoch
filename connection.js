"use strict";

var debug = require('debug')('hoch');
var respond = require('./respond');
var request = require('./request');

module.exports = class {
  constructor(id, socket) {
    this.id = id;
    this.socket = socket;

    this.debug('connection');

    this.socket.on('data', msg => {
      if (this.client) {
        this.client.data(msg);
      }
    });
  }

  debug() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.name());
    debug.apply(undefined, args);
  }

  refresh(version, files) {
    if (this.refreshing) {
      return this.refreshing.then(() => this.refresh(version, files));
    } else if (this.running) {
      return this.running.then(() => this.refresh(version, files));
    } else {
      this.debug('refreshing', version);
      return this.refreshing = request(this.socket, 'refresh', {files: summariseFiles(files), version: version}).then(() => {
        this.refreshing = undefined;
        this.debug('refreshed');
      });
    }
  }

  plugin(pluginName) {
    this.debug('installing plugin', pluginName);
    return request(this.socket, 'plugin', {name: pluginName}).then(() => {
      this.debug('installed plugin', pluginName);
    });
  }

  run(client, module, ids) {
    if (this.refreshing) {
      return this.refreshing.then(() => this.run(client, module, ids));
    } else if (this.running) {
      return this.running.then(() => this.run(client, module, ids));
    } else {
      this.client = client;
      this.debug('running', ids);
      return this.running = request(this.socket, 'run', {module: module, ids: ids}).then(() => {
        this.running = undefined;
        this.debug('ran', ids);
      });
    }
  }

  name() {
    return this.id + ':' + this.socket.request.headers['user-agent'];
  }

  disconnect() {
    this.debug('disconnected');
  }
};

function summariseFiles(files) {
  var result = {};

  Object.keys(files).forEach(key => {
    var file = files[key];
    result[key] = {
      id: file.id,
      version: file.version,
      deps: file.deps
    };
  });

  return result;
}
