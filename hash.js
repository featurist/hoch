var crypto = require('crypto');

module.exports = function(text) {
  var sha = crypto.createHash('sha1');
  sha.update(text);
  return sha.digest('hex');
};
