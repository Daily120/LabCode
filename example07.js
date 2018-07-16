var http = require("http").createServer(handler);
var io = require("socket.io").listen(http);
var fs = require("fs");
var firmata = require("firmata");

var board = new firmata.Board("/dev/ttyACM0", function(){
  console.log("Enabling analog Pin 0");
  board.pinMode(0, board.MODES.ANALOG);
});

function handler(req, res) {
  fs.readFile(__dirname + "/example07.html",
  function(err, data)  {
    if (err) {
      res.writeHea(500, {"Content-Type": "text/plain"});
      return res.end("Error loading html page.");
      }
      res.writeHead(200);
      res.end(data);
  })
}

var desiredValue = 0;
http.listen(8080);

io.sockets.on("connection", function(socket) {
  board.analogRead(0, function(value){
    desiredValue = value; // continuous read of analog pin 0
  });

  socket.emit("messageToClient", "Server connected, board ready.");
  setInterval(sendValues, 40, socket); // na 40ms we send message to client
});

function sendValues (socket) {
  socket.emit("clientReadValues",
  {
    "desiredValue": desiredValue
  });
};
