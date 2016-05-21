"use strict";

var debug = require('debug')('hoch');
var request = require('./request');
var useragent = require('useragent');

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
    if (version != this.version) {
      if (this.refreshing) {
        return this.refreshing.then(() => this.refresh(version, files));
      } else if (this.running) {
        return this.running.then(() => this.refresh(version, files));
      } else {
        var startTime = Date.now();
        this.debug('refreshing browser', version);
        return this.refreshing = request(this.socket, 'refresh', {files: summariseFiles(files), version: version}).then(() => {
          this.refreshing = undefined;
          this.debug('refreshed browser in ' + (Date.now() - startTime) + 'ms');
          this.version = version;
        });
      }
    } else {
      this.debug('not refreshing, browser already at version', version);
      return Promise.resolve();
    }
  }

  plugin(pluginName) {
    this.debug('installing plugin', pluginName);
    return request(this.socket, 'plugin', {name: pluginName}).then(() => {
      this.debug('installed plugin', pluginName);
    });
  }

  run(client, module, filenames) {
    if (this.refreshing) {
      return this.refreshing.then(() => this.run(client, module, filenames));
    } else if (this.running) {
      return this.running.then(() => this.run(client, module, filenames));
    } else {
      this.client = client;
      var startTime = Date.now();
      this.debug('running', filenames);
      return this.running = request(this.socket, 'run', {module: module, filenames: filenames}).then(() => {
        this.running = undefined;
        this.debug('ran in ' + (Date.now() - startTime) + 'ms');
      });
    }
  }

  name() {
    return this._name || (this._name = this.id + ':' + useragent.parse(this.socket.request.headers['user-agent']).toAgent());
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
