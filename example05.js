var http = require("http").createServer(handler);
var io = require("socket.io").listen(http);
var fs = require("fs");
var firmata = require("firmata");

var board = new firmata.Board("/dev/ttyACM0", function(){
    console.log("Connecting to Arduino");
    console.log("Acctivation of Pin 13");
    console.log("Enabling Push Button on pin 2");
    board.pinMode(2, board.MODES.INPUT);
    board.pinMode(13, board.MODES.OUTPUT);
});

function handler(req, res) {
  fs.readFile(__dirname + "/example05.html",
  function(err, data)  {
    if (err) {
        res.writeHea(500, {"Content-Type": "text/plain"});
        return res.end("Error loading html page.");
    }
  res.writeHead(200);
  res.end(data);
})
}

http.listen(8080);

io.sockets.on("connection", function(socket) {
  board.digitalRead(2, function(value) {
    if (value == 0) {
        console.log("LED OFF");
        board.digitalWrite(13, board.LOW);
        console.log("Value = 0");
        socket.emit("messageToClient", "Value = 0");
        }
    if (value == 1) {
        console.log("LED ON");
        board.digitalWrite(13, board.HIGH);
        console.log("Value = 1");
        socket.emit("messageToClient", "Value = 1");
        }

    });
  });
