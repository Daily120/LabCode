var http = require("http");
var firmata = require("firmata");

var board = new firmata.Board("/dev/ttyACM0", function() {
    board.pinMode(12, board.MODES.OUTPUT);
    board.pinMode(13, board.MODES.OUTPUT);
});

http.createServer(function(req, res){
  var parts = req.url.split("/"),
  operator1= parseInt(parts[1],10);
  operator2 = parseInt(parts[2],10);

  if(operator1 == 0 && operator2 == 0) {
    board.digitalWrite(13, board.LOW);
    board.digitalWrite(12, board.LOW);
  }
  else if (operator1 == 1 && operator2 == 0) {
    board.digitalWrite(13, board.HIGH);
    board.digitalWrite(12, board.LOW);

  }
  else if(operator1 == 0 && operator2 == 1) {
    board.digitalWrite(13, board.LOW);
    board.digitalWrite(12, board.HIGH);
  }
  else if (operator1 == 1 && operator2 == 1) {
    board.digitalWrite(13, board.HIGH);
    board.digitalWrite(12, board.HIGH);
  }

  res.writeHead(200, {"Content-Type": "text/plain"});
  res.write("For test write into browser address line: http://192.168.1.134:8080/1 \n");
  res.end("The value of operator: " + operator1 +" "+ operator2);
}).listen(8080, "192.168.1.134");
