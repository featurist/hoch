var argv = require('yargs').argv;
var app = require('./app')();

var port = process.env.PORT || 5000;

app.listen(port, function () {
  console.log(`listening on http://localhost:${port}/`);
});
