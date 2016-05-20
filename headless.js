"use strict";

var debug = require('debug')('hoch');
var debugBrowser = require('debug')('hoch:test:browser');
var Nightmare = require('nightmare');

module.exports = class Headless {
  constructor() {
    var nightmare = Nightmare();
    nightmare.on('console', function() {
      var args = removeColorEscapes(Array.prototype.slice.call(arguments, 1));
      debugBrowser.apply(debugBrowser, args);
    });
  }

  start(url) {
    nightmare.goto(`http://localhost:${port}/.hoch`).then(() => {
      debug('started browser');
    }).catch(e => {
      debug('could not start browser', e);
    });
  }
};
