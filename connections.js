"use strict";

module.exports = function(io, createConnection) {
  var connectionId = 1;
  var connections = [];

  io.on('connection', (socket) => {
    var connection = createConnection(socket, connectionId++);
    connections.push(connection);

    socket.on('disconnect', function () {
      connection.disconnect();
      var index = connections.indexOf(connection);
      if (index >= 0) {
        connections.splice(index, 1);
      }
    });
  });

  return connections;
};
