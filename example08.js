var http = require("http").createServer(handler);
var io = require("socket.io").listen(http);
var fs = require("fs");
var firmata = require("firmata");

var board = new firmata.Board("/dev/ttyACM0", function(){
  console.log("Enabling analog Pin 0");
  board.pinMode(0, board.MODES.ANALOG);
  console.log("Enabling analog Pin 1");
  board.pinMode(1, board.MODES.ANALOG);
});

function handler(req, res) {
  fs.readFile(__dirname + "/example08.html",
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
var actualValue = 0; // variable for seccond potentiometer
http.listen(8080);

io.sockets.on("connection", function(socket) {
  board.analogRead(0, function(value){
    desiredValue = value; // continuous read of analog pin 0
  });
  board.analogRead(1, function(value) {
    actualValue = value; // continuous read of pin A1
  });

  socket.emit("messageToClient", "Server connected, board ready.");
  setInterval(sendValues, 40, socket); // na 40ms we send message to client
});

function sendValues (socket) {
  socket.emit("clientReadValues",
  {
    "desiredValue": desiredValue,
    "actualValue": actualValue
  });
};
