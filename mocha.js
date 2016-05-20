var run = require('./run');
var baseurl = 'http://localhost:5000/';
var EventEmitter = require('events');
var testEvents = new EventEmitter();

var Spec = require('mocha/lib/reporters/spec');

new Spec(testEvents);

run(baseurl, './plugins/mocha', process.argv.slice(2), function (data) {
  var args = [data.name].concat(data.arguments);

  if (data.name == 'pass' || data.name == 'test end' || data.name == 'fail' || data.name == 'pending') {
    var test = data.arguments[0];
    test.fullTitle = function () {
      return this._fullTitle;
    };
    test.currentRetry = function () {
      return this._currentRetry;
    };
    test.slow = function () {
      return this._slow;
    };
    test.retries = function () {
      return this._retries;
    };

    data.arguments[0].slow = function() {
      return this.duration > 50;
    };
  }

  testEvents.emit.apply(testEvents, args);
});
