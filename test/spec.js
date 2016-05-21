var createApp = require('../app');
var fs = require('fs-promise');
var run = require('./run');
var expect = require('chai').expect;
var DirectoryStructure = require('./directoryStructure');

describe('hoch', function () {
  var app;
  var pathsWaitingForChanges = {};

  beforeEach(function () {
    if (app) {
      app.close();
    }
  });

  beforeEach(function () {
    app = createApp();
    app.listen(4000);

    app.on('changes', function (changes) {
      changes.changed.forEach(f => {
        var changed = pathsWaitingForChanges[f.id];
        delete pathsWaitingForChanges[f.id];
        if (changed) {
          changed();
        }
      });
    });
  });

  function waitForFileChange(filename) {
    return new Promise(resolve => pathsWaitingForChanges[filename] = resolve);
  }

  context('with browser connected', function () {
    context('with source directory', function () {
      var dirname = __dirname + '/tmp';
      var dir;

      beforeEach(function () {
        dir = new DirectoryStructure(dirname);
        return fs.emptyDir(dirname);
      });

      function write(paths) {
        dir.write(paths);
      }

      function path(filename) {
        return dirname + '/' + filename;
      }

      describe('running files', function () {
        it('can run a file', function () {
          write({
            'app.js': 'console.log("hi from test");'
          });

          return run('./plugins/log', [path('app.js')]).then((results) => {
            expect(results).to.eql([
              ["'hi from test'"]
            ]);
          });
        });

        it('can run a file, change it, run it again and see the changes', function () {
          write({
            'app.js': 'console.log("hi from test");'
          });

          return run('./plugins/log', [path('app.js')]).then(() => {
            write({
              'app.js': 'console.log("hi from test again");'
            });

            return waitForFileChange(path('app.js'));
          }).then(function () {
            return run('./plugins/log', [path('app.js')]);
          }).then((results) => {
            expect(results).to.eql([
              ["'hi from test again'"]
            ]);
          });
        });
      });

      describe('dependencies', function () {
        it('can run a file with dependencies', function () {
          write({
            'one.js': `
              module.exports = 'one';
              console.log('loading one');
            `,
            'two.js': `
              var one = require('./one');
              console.log("loading two, one = " + one);
            `
          });

          return run('./plugins/log', [path('two.js')]).then((results) => {
            expect(results).to.eql([
              ["'loading one'"],
              ["'loading two, one = one'"]
            ]);
          });
        });

        it('can run a file with dependencies, change the dependency, run the file and see the changes', function () {
          this.timeout(5000);
          var paths = {
            'one.js': `
              module.exports = 'one';
              console.log('loading one');
            `,
            'two.js': `
              var one = require('./one');
              console.log("loading two, one = " + one);
            `
          };

          write(paths);

          return run('./plugins/log', [path('two.js')]).then(() => {
            paths['one.js'] = `
              module.exports = 'one, changed';
              console.log('loading one, changed');
            `;

            write(paths);

            return waitForFileChange(path('one.js'));
          }).then(function () {
            return run('./plugins/log', [path('two.js')]);
          }).then((results) => {
            expect(results).to.eql([
              ["'loading one, changed'"],
              ["'loading two, one = one, changed'"]
            ]);
          });
        });
      });

      describe('compilation', function () {
        var compiled;

        beforeEach(function () {
          compiled = {};

          app.on('compile', function (filename) {
            if (compiled[filename]) {
              compiled[filename]++;
            } else {
              compiled[filename] = 1;
            }
          });
        });

        function expectCompiled(file, number) {
          expect(compiled[path(file)]).to.equal(number, `expect ${file} to be compiled ${number} times`);
        }

        it('only compiles files that have changed', function () {
          write({
            'a.js': `
              var dep = require('./dep');
              console.log('loading a');
            `,
            'b.js': `
              var dep = require('./dep');
              console.log('loading b');
            `,
            'dep.js': `
              console.log('loading dep');
            `
          });

          return run('./plugins/log', [path('a.js'), path('b.js')]).then(() => {
            expectCompiled('a.js', 1);
            expectCompiled('b.js', 1);
            expectCompiled('dep.js', 1);
          }).then(() => {
            write({
              'a.js': `
                var dep = require('./dep');
                console.log('loading a');
              `,
              'b.js': `
                var dep = require('./dep');
                console.log('loading b');
              `,
              'dep.js': `
                console.log('loading dep (changed)');
              `
            });

            return waitForFileChange(path('dep.js'));
          }).then(() => {
            return run('./plugins/log', [path('a.js'), path('b.js')]).then(() => {
              expectCompiled('a.js', 1);
              expectCompiled('b.js', 1);
              expectCompiled('dep.js', 2);
            });
          });
        });
      });
    });
  });
});
