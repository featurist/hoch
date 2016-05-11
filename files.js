"use strict";

var fs = require('fs-promise');
var Watcher = require('./watcher');
var interval = require('./interval');
var debug = require('debug')('hoch');
var indexBy = require('lowscore/indexBy');
var events = require('events');
var hash = require('./hash');

module.exports = class extends events.EventEmitter {
  constructor(configFilename, server) {
    super();
    this.files = [];

    fs.readFile(configFilename, 'utf-8').then(configString => {
      var config = JSON.parse(configString);

      this.watcher = new Watcher(config.pattern || config.patterns, config.browserify || {});
      this.watcher.start();

      if (config.refreshInterval) {
        this.refreshInterval = interval(() => {
          this.watcher.refresh();
        }, config.refreshInterval)
      }

      this.watcher.on('change', () => {
        this.version = computeVersions(this.watcher.files);
        debug('version', this.version);
        this.files = indexBy(this.watcher.files, 'id');

        server.refresh();

        if (this.refreshInterval) {
          this.refreshInterval.start();
        }

        this.loaded = true;
      });

      this.watcher.on('error', function (error) {
        console.error(error);
      });
    }).catch(error => {
      console.error(error && error.stack || error);
    });
  }
};

function computeVersions(files) {
  files.forEach(file => {
    file.version = hash(file.source);
  });

  var versions = files.map(file => `${file.id}:${file.version}`);
  versions.sort();

  return hash(versions.join(','));
}
