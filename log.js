var run = require('./run');
var baseurl = 'http://localhost:5000/';

run(baseurl, './plugins/log', process.argv.slice(2), function (data) {
  console.log.apply(console, data.arguments);
});
