module.exports = function(socket, type, handler) {
  socket.on(type, function (msg) {
    function respond(type, result) {
      if (result) {
        result.id = msg.id;
      } else {
        result = {id: msg.id};
      }
      socket.emit(type, result);
    }

    var result = handler(msg);

    if (result && typeof result.then === 'function') {
      result.then(function (result) {
        respond(type + ':response', result);
      }, function (error) {
        respond(type + ':error', error);
      });
    } else {
      respond(type + ':response', result);
    }
  });
}
