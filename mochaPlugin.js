require('mocha/support/browser-entry');
console.log('this is mocha plugin');

module.exports = function(run, send) {
  createMochaDiv();

  var m = new window.Mocha({
    reporter: 'html'
  });
  m.suite.emit('pre-require', global, null, m);
  run();
  return new Promise(function (resolve) {
    m.run(function (errors) {
      console.log(errors);
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
