"use strict";

var fs = require('fs-promise');
var debug = require('debug')('writedir');

module.exports = class DirectoryStructure {
  constructor(dir) {
    this.path = dir;
    this.last = {};
    fs.emptyDirSync(dir);
  }

  write(next) {
    function sync(parentPath, current, next) {
      Object.keys(next).forEach(key => {
        var path = parentPath + '/' + key;
        var currentValue = normaliseContents(current[key]);
        var nextValue = normaliseContents(next[key]);

        if (!currentValue && nextValue) {
          if (typeof nextValue === 'string') {
            fs.writeFileSync(path, nextValue);
            debug('new file', path);
          } else {
            sync(path, {}, nextValue);
          }
        } else if (currentValue && !nextValue) {
          fs.removeSync(path);
          debug('removed', path);
        } else if (currentValue && nextValue) {
          var currentFile = typeof currentValue === 'string';
          var nextFile = typeof nextValue === 'string';

          if (currentFile && nextFile && currentValue != nextValue) {
            fs.writeFileSync(path, nextValue);
            debug('change file', path);
          } else if (currentFile && !nextFile) {
            fs.removeSync(path);
            fs.ensureDirSync(path);
            debug('file => directory', path);
            sync(path, {}, nextValue);
          } else if (!currentFile && nextFile) {
            fs.removeSync(path);
            fs.writeFileSync(path, nextValue);
            debug('directory => file', path);
          } else if (!currentFile && !nextFile) {
            sync(path, currentValue, nextValue);
          }
        }
      });
    }

    sync(this.path, this.last, next);
    this.last = JSON.parse(JSON.stringify(next));
  }
};

function normaliseContents(value) {
  if (typeof value === 'string') {
    var re = /\n(\s*)[^$]/g;

    var indents = [];

    do {
      var m = re.exec(value);
      if (m) {
        indents.push(m[1].length);
      } else {
        break;
      }
    } while(re.lastIndex >= 0)

    var minIndentSpaces = Math.min.apply(Math, indents);

    return value.replace(new RegExp(`\n {${minIndentSpaces}}`, 'g'), '\n').trim() + '\n';
  } else {
    return value;
  }
}
