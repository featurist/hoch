"use strict";

var debug = require('debug')('hoch');
var debugBrowser = require('debug')('hoch:browser');
var Nightmare = require('nightmare');
var removeColorEscapes = require('./removeColorEscapes');

module.exports = class Headless {
  constructor() {
    this.nightmare = Nightmare();
    this.nightmare.on('console', function() {
      var args = removeColorEscapes(Array.prototype.slice.call(arguments, 1));
      debugBrowser.apply(debugBrowser, args);
    });
  }

  start(url) {
    this.nightmare.goto(url).then(() => {
      debug('started browser');
    }).catch(e => {
      debug('could not start browser', e);
    });
  }
};
