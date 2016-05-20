var urlUtils = require('url');
var querystring = require('querystring');
var httpism = require('httpism');

module.exports = function (baseurl, module, filenames) {
  return httpism.post(urlUtils.resolve(baseurl, '/.hoch/shorturl'), {
    url: '/.hoch?' + querystring.stringify({
      module: module,
      filenames: filenames
    })
  }).then(function (response) {
    return urlUtils.resolve(baseurl, response.body.url);
  });
};
