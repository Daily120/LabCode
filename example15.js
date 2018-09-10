var http = require("http").createServer(handler); // on req - hand
var io = require("socket.io").listen(http); // socket library
var fs = require("fs"); // variable for file system for providing html
var firmata = require("firmata");

console.log("Starting the code");

var board = new firmata.Board("COM3", function () {
    console.log("Connecting to Arduino");
    board.pinMode(0, board.MODES.ANALOG); // enable analog pin 0
    board.pinMode(1, board.MODES.ANALOG); // enable analog pin 1
    board.pinMode(2, board.MODES.OUTPUT); // direction of DC motor
    board.pinMode(3, board.MODES.PWM); // PWM of motor
});

function handler(req, res) {
    fs.readFile(__dirname + "/example15.html",
        function (err, data) {
            if (err) {
                res.writeHead(500, {
                    "Content-Type": "text/plain"
                });
                return res.end("Error loading html page.");
            }
            res.writeHead(200);
            res.end(data);
        })
}

var desiredValue = 0; // desired value var
var actualValue = 0; // actual value var

var pwm = 0; // set pwm as global variable
var pwmLimit = 254; // to limit value of the pwm that is sent to the motor

var err = 0; // error
var errSum = 0; // sum of errors as integral
var dErr = 0; // difference of error
var lastErr = 0; // to keep the value of previous error to estimate derivative

var controlAlgorithmStartedFlag = 0; // variable for indicating weather the Alg has benn sta.
var intervalCtrl; // var for setInterval in global scope

var readAnalogPin0Flag = 1; // flag for reading the pin if the pot is driver

var activeEmit; // for setInterval object

http.listen(8080); // server will listen on port 8080

var sendStaticMsgViaSocket = function () {}; // for sending static messages

board.on("ready", function () {

    board.analogRead(0, function (value) {
        if (readAnalogPin0Flag == 1) desiredValue = value; // continuous read of analog pin 0 if Flag == 1
    });

    board.analogRead(1, function (value) {
        actualValue = value; // continuous read of analog pin 1
    });

    io.sockets.on("connection", function (socket) {
        socket.emit("messageToClient", "Srv connected, board OK");
        socket.emit("staticMsgToClient", "Srv connected, board OK");

        socket.on("startServerEmit", function () {
            clearInterval(activeEmit); // stop just in case if it was started before
            activeEmit = setInterval(sendValues, 20, socket); // on 40ms trigerr func. sendValues
        });

        socket.on("stopServerEmit", function () {
            clearInterval(activeEmit); // stop triggering sendValues function
        });

        socket.on("startControlAlgorithm", function (numberOfControlAlgorithm) {
            startControlAlgorithm(numberOfControlAlgorithm);
        });

        socket.on("stopControlAlgorithm", function () {
            stopControlAlgorithm();
        });

        socket.on("sendPosition", function (position) {
            readAnalogPin0Flag = 0; // we don't read from the analog pin anymore, value comes from GUI
            desiredValue = position; // GUI takes control
            socket.emit("messageToClient", "Position set to: " + position)
        });

        socket.on("enablePot", function () {
            readAnalogPin0Flag = 1; // we again read back from the analog pin
            socket.emit("messageToClient", "Pot enabled");
        });

        sendValueViaSocket = function (value) {
            io.sockets.emit("messageToClient", value);
        };

        sendStaticMsgViaSocket = function (value) {
            io.sockets.emit("staticMsgToClient", value);
        };

    }); // end of sockets.on connection

}); // end of board.on ready

function controlAlgorithm(parameters) {
    switch (parameters.ctrlAlgNo) {
        case 1:
            pwm = parameters.pCoeff * (desiredValue - actualValue);
            sendPwmToArduino();
            break;
        case 2:
            err = desiredValue - actualValue; // error as difference between desired and actual val.
            errSum += err; // sum of errors | like integral
            dErr = err - lastErr; // difference of error
            pwm = parameters.Kp1 * err + parameters.Ki1 * errSum + parameters.Kd1 * dErr; // PID expression
            lastErr = err; // save the value of error for next cycle to estimate the derivative
            sendPwmToArduino();
            break;
        case 3:
            err = desiredValue - actualValue; // error as difference between desired and actual val.
            errSum += err; // sum of errors | like integral
            dErr = err - lastErr; // difference of error
            pwm = parameters.Kp2 * err + parameters.Ki2 * errSum + parameters.Kd2 * dErr; // PID expression
            console.log(parameters.Kp2 + "|" + parameters.Ki2 + "|" + parameters.Kd2);
            lastErr = err; // save the value of error for next cycle to estimate the derivative
            sendPwmToArduino();
            break;
    }
}

function sendPwmToArduino() {
    if (pwm > pwmLimit) {
        pwm = pwmLimit
    } // to limit pwm values
    if (pwm < -pwmLimit) {
        pwm = -pwmLimit
    } // to limit pwm values
    if (pwm > 0) {
        board.digitalWrite(2, 0)
    } // direction if > 0
    if (pwm < 0) {
        board.digitalWrite(2, 1)
    } // direction if < 0
    board.analogWrite(3, Math.abs(pwm));
}

function startControlAlgorithm(parameters) {
    if (controlAlgorithmStartedFlag == 0) {
        controlAlgorithmStartedFlag = 1;
        intervalCtrl = setInterval(function () {
            controlAlgorithm(parameters);
        }, 20); // call the alg. on 30ms
        console.log("Control algorithm has been started.");
        sendStaticMsgViaSocket("Control alg " + parameters.ctrlAlgNo + " started | " + JSON.stringify(parameters));
    }

};

function stopControlAlgorithm() {
    clearInterval(intervalCtrl); // clear the interval of control algorihtm
    board.analogWrite(3, 0);
    err = 0; // error as difference between desired and actual val.
    errSum = 0; // sum of errors | like integral
    dErr = 0;
    lastErr = 0; // difference
    pwm = 0;
    controlAlgorithmStartedFlag = 0;
    console.log("Control algorithm has been stopped.");
    sendStaticMsgViaSocket("Stopped.")
};

function sendValues(socket) {
    socket.emit("clientReadValues", {
        "desiredValue": desiredValue,
        "actualValue": actualValue,
        "pwm": pwm
    });
};
