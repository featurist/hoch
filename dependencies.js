"use strict";

var mdeps = require('module-deps');
var extend = require('lowscore/extend');
var debug = require('debug')('hoch');
var browserifyBuiltins = require('browserify/lib/builtins');
var sanitize = require('htmlescape').sanitize;

class Dependencies {
  constructor(options) {
    this.cache = {};
    this.packageCache = {};
    this.fileCache = {};
    this.idForFilename = {};
    this.options = options;
  }

  changed(filename) {
    debug('refreshing', filename);
    var id = this.idForFilename[filename];
    delete this.cache[id];
  }

  deps(filenames) {
    debug('dependencies for', filenames);
    return new Promise((resolve, reject) => {
      var files = [];
      var mopts = extend({
        cache: this.cache,
        packageCache: this.packageCache,
        fileCache: this.fileCache,
        modules: browserifyBuiltins,
        transform: [],
        extensions: []
      }, this.options);

      mopts.extensions.unshift('.js', '.json');

      var md = mdeps(extend({
          cache: this.cache,
          packageCache: this.packageCache,
          fileCache: this.fileCache,
          modules: browserifyBuiltins
      }, this.options))

      filenames.forEach((filename, i) => {
        debug('loading', filename);
        if (i < filenames.length - 1) {
          md.write({ file: filename });
        } else {
          md.end({ file: filename });
        }
      })

      md.on('data', function (file) {
        if (/\.json$/.test(file.file) && !/^module\.exports=/.test(file.source)) {
          file.source = 'module.exports=' + sanitize(file.source);
        }
        files.push(file);
      });

      md.on('transform', function (transform, file) {
        debug('compiling', file);
      });

      md.on('error', reject);
      md.on('end', () => resolve(files));
    }).then(files => {
      files.forEach(file => {
        this.idForFilename[file.file] = file.id;
        this.cache[file.id] = file;
      });

      return files;
    });
  }
}

module.exports = Dependencies;
