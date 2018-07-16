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
  board.pinMode(12, board.MODES.OUTPUT);
});

function handler(req, res) {
  fs.readFile(__dirname + "/example06.html",
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
  var timeout = false;
  var last_value = -1;
  var last_sent = -1;
  board.digitalRead(2, function(value) {
    if (timeout !== false) { // if timeout below has been started (on unstable input 0 1 0 1) clear it
	     clearTimeout(timeout); // clears timeout until digital input is not stable i.e. timeout = false
    }
    timeout = setTimeout(function() { // this part of code will be run after 50 ms; if in-between input changes above code clears it
      console.log("Timeout set to false");
      timeout = false;
      if (last_value != last_sent) {
        if (value == 0) {
          console.log("LED OFF");
          board.digitalWrite(13, board.LOW);
          board.digitalWrite(12, board.LOW);
          console.log("Value = 0");
        }
        if (value == 1) {
          console.log("LED ON");
          board.digitalWrite(13, board.HIGH);
          board.digitalWrite(12, board.HIGH);
          console.log("Value = 1");
        }
        socket.emit("messageToClient", "Value = " + value);
      }
      last_sent = last_value;
    }, 50);
    last_value = value;
  });
});
