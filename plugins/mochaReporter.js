var pick = require('underscore').pick;

exports = module.exports = function(send) {
  return function(runner) {
    runner.on('start', function () {
      send('start');
    });

    runner.on('suite', function (suite) {
      send('suite', cleanSuite(suite));
    });

    runner.on('suite end', function (suite) {
      send('suite end', cleanSuite(suite));
    });

    runner.on('test end', function(test) {
      send('test end', cleanTest(test));
    });

    runner.on('pass', function(test) {
      console.log('%cpass', 'color: green', test.fullTitle());
      send('pass', cleanTest(test));
    });

    runner.on('fail', function(test, err) {
      console.log('%cfail', 'color: red', test.fullTitle());
      console.error(err);
      if (err.stack) {
        console.error(err.stack);
      }
      send('fail', cleanTest(test), errorJSON(err));
    });

    runner.on('pending', function(test) {
      console.log('%cpending', 'color: lightblue', test.fullTitle());
      send('pending', cleanTest(test));
    });

    runner.on('end', function() {
      send('end');
    });
  };
};

/**
 * Return a plain-object representation of `test`
 * free of cyclic properties etc.
 *
 * @api private
 * @param {Object} test
 * @return {Object}
 */
function cleanTest(test) {
  var clone = pick(test, "title", "body", "async", "sync", "_timeout", "_slow", "_enableTimeouts", "timedOut", "_trace", "_retries", "_currentRetry", "pending", "type", "file");
  clone._fullTitle = test.fullTitle();
  return clone;
}

function cleanSuite(suite) {
  return {
    delayed: suite.delayed,
    pending: suite.pending,
    root: suite.root,
    suites: suite.suites.map(cleanSuite),
    test: suite.tests.map(cleanTest),
    title: suite.title
  };
}

/**
 * Transform `error` into a JSON object.
 *
 * @api private
 * @param {Error} err
 * @return {Object}
 */
function errorJSON(err) {
  var res = {};
  Object.getOwnPropertyNames(err).forEach(function(key) {
    res[key] = err[key];
  }, err);
  return res;
}
