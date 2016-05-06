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

    msg.id = id;
    socket.emit(type, msg);
  });
};

function addHandler(socket, type) {
  socket.on(type + ':response', msg => {
    requests[msg.id].resolve(msg);
  });
  socket.on(type + ':error', msg => {
    requests[msg.id].reject(msg);
  });
}
