var http = require("http").createServer(handler);
var firmata = require("firmata");
var fs = require("fs");
var io = require("socket.io").listen(http);

console.log("Connecting to Arduino");

var board = new firmata.Board("/dev/ttyACM0", function(){
    console.log("Activation of pin 2");
    board.pinMode(2, board.MODES.OUTPUT);
    console.log("Activation of pin 3");
    board.pinMode(3, board.MODES.PWM);
    console.log("Enabling analog Pin 0");
    board.pinMode(0, board.MODES.ANALOG);
});

function handler(req, res) {
    fs.readFile(__dirname + "/example11.html",
    function(err, data) {
        if (err) {
            res.writeHead(500, {"Content-Type": "text/plain"});
            return res.end("You didn't connect html file!");
        }
        res.writeHead(200);
        res.end(data);
    });
}

http.listen(8080);

var desiredValue = 0;

console.log("Running the system");

board.on("ready", function(){
    console.log("Board is ready!");
    board.analogRead(0, function(value){
        desiredValue = value;
    });

    io.sockets.on("connection", function(socket){

        socket.on("sendPWM", function(pwm){
            board.analogWrite(3,pwm);
            console.log("PWM value:" + pwm);
        });

        socket.on("left", function(value) {
            board.digitalWrite(2,value);
        });

        socket.on("right", function(value) {
            board.digitalWrite(2,value);
        });

        socket.on("stop", function(value) {
            board.analogWrite(3,value);
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

});
