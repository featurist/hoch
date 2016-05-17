module.exports = function (args) {
  if (args.length) {
    var message = args[0];
    var numberOfEscapes = message.split('%c').length - 1;

    var withoutColors = args.slice();
    withoutColors.splice(1, numberOfEscapes);
    withoutColors[0] = message.replace(/%c/g, '');
    return withoutColors;
  } else {
    return args;
  }
}
