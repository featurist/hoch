module.exports = function(socket, type, handler) {
  socket.on(type, function (msg) {
    function respond(type, result) {
      socket.emit(type, {id: msg.id, value: serialise(result)});
    }

    try {
      var result = handler(msg.value);

      if (result && typeof result.then === 'function') {
        result.then(function (result) {
          respond(type + ':response', result);
        }, function (error) {
          respond(type + ':error', error);
        });
      } else {
        respond(type + ':response', result);
      }
    } catch (e) {
      respond(type + ':error', e);
    }
  });
}

function serialise(obj) {
  if (obj instanceof Error) {
    return {
      message: obj.message,
      stack: obj.stack
    }
  } else {
    return obj;
  }
}
