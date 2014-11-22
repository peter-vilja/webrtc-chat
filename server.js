var app = require('express')();
var https = require('https');
var fs = require('fs');
var options = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.crt')
};
var server = https.createServer(options, app).listen(3000, function () {
  console.log('listening on *:3000');
});
var io = require('socket.io')(server);

io.on('connection', function (socket) {
  console.log('a user connected');
  socket.on('offerAnswer', function (description) {
    socket.broadcast.emit('offerAnswer', description);
  });

  socket.on('iceCandidate', function (candidate) {
    socket.broadcast.emit('iceCandidate', candidate);
  });
});
