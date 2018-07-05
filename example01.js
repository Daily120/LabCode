var http = require("http");
var firmata = require("firmata");

var board = new firmata.Board("/dev/ttyACM0", function() {
    board.pinMode(12, board.MODES.OUTPUT);
    board.pinMode(13, board.MODES.OUTPUT);
});

http.createServer(function(req, res){
  var parts = req.url.split("/"),
  operator= parseInt(parts[1],10);

  if(operator == 0) {
    board.digitalWrite(13, board.LOW);
  }
  else if (operator == 1) {
    board.digitalWrite(13, board.HIGH);
  }
  else if(operator == 2) {
    board.digitalWrite(12, board.LOW);
  }
  else if (operator == 3) {
    board.digitalWrite(12, board.HIGH);
  }

  res.writeHead(200, {"Content-Type": "text/plain"});
  res.write("For test write into browser address line: http://192.168.1.134:8080/1 \n");
  res.end("The value of operator: " + operator);
}).listen(8080, "192.168.1.134");
