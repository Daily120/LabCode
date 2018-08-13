var http = require("http").createServer(handler);
var io = require("socket.io").listen(http);
var fs = require("fs");
var firmata = require("firmata");
var pwm = 0; //for logging the speed of DC-Motor

var board = new firmata.Board("/dev/ttyACM0", function(){
  console.log("Enabling analog Pin 0");
  board.pinMode(0, board.MODES.ANALOG);
  console.log("Enabling analog Pin 1");
  board.pinMode(1, board.MODES.ANALOG);
  board.pinMode(2, board.MODES.OUTPUT); // direction of DC motor
  board.pinMode(3, board.MODES.PWM); // PWM of motor i.e. speed of rotation
  board.pinMode(4, board.MODES.OUTPUT); // direction DC motor
});

function handler(req, res) {
  fs.readFile(__dirname + "/example12.html",
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

  socket.on("startControlAlgorithm", function(){
      startControlAlgorithm();
  });

  socket.on("stopControlAlgorithm", function(){
      stopControlAlgorithm();
  });

  socket.emit("messageToClient", "Server connected, board ready.");
  setInterval(sendValues, 40, socket); // na 40ms we send message to client
});

function sendValues (socket) {
  socket.emit("clientReadValues",
  {
    "desiredValue": desiredValue,
    "actualValue": actualValue,
    "pwm": pwm
  });
};

//DC-Motor Position Algorithm
var factor = 0.1; // proportional factor that determines the speed of aproaching toward desired value
var controlAlgorihtmStartedFlag = 0; // flag in global scope to see weather ctrlAlg has been started
var intervalCtrl; // var for setInterval in global space

// PID Algorithm variables
var Kp = 0.55; // proportional factor
var Ki = 0.008; // integral factor
var Kd = 0.15; // differential factor
var pwm = 0;
var pwmLimit = 254;

var err = 0; // variable for second pid implementation
var errSum = 0; // sum of errors
var dErr = 0; // difference of error
var lastErr = 0; // to keep the value of previous error

function controlAlgorithm () {
    err = desiredValue - actualValue; // error
    errSum += err; // sum of errors, like integral
    dErr = err - lastErr; // difference of error
    pwm = Kp*err + Ki*errSum + Kd*dErr;
    lastErr = err; // save the value for the next cycle
    if(pwm > pwmLimit) {pwm = pwmLimit}; // to limit the value for pwm / positive
    if(pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit the value for pwm / negative
    if (pwm > 0) {board.digitalWrite(2,0);};
    if (pwm < 0) {board.digitalWrite(2,1);};
    board.analogWrite(3, Math.abs(pwm));
};

function startControlAlgorithm () {
    if (controlAlgorihtmStartedFlag == 0) {
        controlAlgorihtmStartedFlag = 1; // set flag that the algorithm has started
        intervalCtrl = setInterval(function() {controlAlgorithm(); }, 30);
        console.log("Control algorithm started");
    }
};

function stopControlAlgorithm () {
    clearInterval(intervalCtrl); // clear the interval of control algorihtm
    board.analogWrite(3,0); // write 0 on pwm pin to stop the motor
    controlAlgorihtmStartedFlag = 0; // set flag that the algorithm has stopped
};
