var requestId = 0;
var requests = {};

module.exports = function(socket, type, msg) {
  var request = {};
  var id = requestId++;
  requests[id] = request;

  addHandler(socket, type);

  return new Promise((resolve, reject) => {
    request.resolve = msg => {
      resolve(msg);
    };
    request.reject = msg => {
      reject(msg);
    };

    socket.emit(type, {id: id, value: msg});
  });
};

function findRequest(msg) {
  if (typeof msg.id !== 'undefined') {
    return requests[msg.id];
  } else {
    console.error('no id on response', msg);
  }
}

function addHandler(socket, type) {
  socket.on(type + ':response', msg => {
    findRequest(msg).resolve(msg.value);
  });

  socket.on(type + ':error', msg => {
    var error = new Error(msg.value.message);
    error.stack = msg.value.stack;
    findRequest(msg).reject(error);
  });
}
