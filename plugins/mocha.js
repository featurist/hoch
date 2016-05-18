require('mocha/support/browser-entry');
var reporter = require('./mochaReporter');

module.exports = function(run, send) {
  createMochaDiv();

  var m = new window.Mocha({
    reporter: reporter(send)
  });
  m.suite.emit('pre-require', global, null, m);
  run();
  return new Promise(function (resolve) {
    m.run(function (errors) {
      if (errors) {
        console.log('%cfailure: ', 'color: red', errors + ' errors');
      } else {
        console.log('%csuccess!', 'color: green');
      }
      resolve();
    });
  });
}

function createMochaDiv() {
  var mochaDiv = document.getElementById('mocha');

  if (mochaDiv) {
    mochaDiv.parentNode.removeChild(mochaDiv);
  }

  mochaDiv = document.createElement('div');
  mochaDiv.id = 'mocha';
  document.body.appendChild(mochaDiv);
}
