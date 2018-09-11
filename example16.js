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
    fs.readFile(__dirname + "/example16.html",
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

http.listen(8080); // server will listen on port 8080

board.on("ready", function () {

    board.analogRead(0, function (value) {
        desiredValue = value; // continuous read of analog pin 0
    });

    board.analogRead(1, function (value) {
        actualValue = value; // continuous read of analog pin 1
    });

    startControlAlgorithm();

    io.sockets.on("connection", function (socket) {
        socket.emit("messageToClient", "Srv connected, board OK");

        setInterval(sendValues, 40, socket); // on 40ms trigerr func. sendValues

    }); // end of sockets.on connection

}); // end of board.on ready

////////////////////////////////////////////////fuzzy
var NFuzzyVars = 2;
var NFuzzyOutputs = 1;
var NFuzzySets = new Array(NFuzzyVars);
NFuzzySets[0] = 3;
NFuzzySets[1] = 3;

var FSvalues = new Array(NFuzzyVars);
for (var i = 0; i != NFuzzyVars; i++) {
    FSvalues[i] = new Array(NFuzzySets[i]);
    for (var j = 0; j != NFuzzySets[i]; j++) {
        FSvalues[i][j] = new Array(3);
    }
}

var NRules = 3;
var RBase = new Array(NRules);
for (var i = 0; i != NRules; i++) {
    RBase[i] = new Array(NFuzzyVars);
}

var ValuesForFuzzy = new Array(NFuzzyVars);
ValuesForFuzzy[0] = 0;
ValuesForFuzzy[1] = 0;

var AlphaCut = new Array(NFuzzySets[0]);

var RN = 0;
RBase[RN][0] = 0;
RBase[RN][1] = 0;
RN++;
RBase[RN][0] = 1;
RBase[RN][1] = 1;
RN++;
RBase[RN][0] = 2;
RBase[RN][1] = 2;
RN++;

FSvalues[0][0][0] = -100; // number of var, num of fuzzy sets, number of points, that define fs
FSvalues[0][0][1] = -100;
FSvalues[0][0][2] = 0;

FSvalues[0][1][0] = -100;
FSvalues[0][1][1] = 0;
FSvalues[0][1][2] = 100;

FSvalues[0][2][0] = 0;
FSvalues[0][2][1] = 100;
FSvalues[0][2][2] = 100;

FSvalues[1][0][0] = -15;
FSvalues[1][0][1] = -15;
FSvalues[1][0][2] = 0;

FSvalues[1][1][0] = -15;
FSvalues[1][1][1] = 0;
FSvalues[1][1][2] = 15;

FSvalues[1][2][0] = 0;
FSvalues[1][2][1] = 15;
FSvalues[1][2][2] = 15;


function getMRFromFSvalues(value, NumOfVar, NumOfSet) {
    if (NumOfSet === 0) {
        if (value < FSvalues[NumOfVar][NumOfSet][0]) {
            return 1;
        } else if (value > FSvalues[NumOfVar][NumOfSet][2]) {
            return 0;
        } else {
            return (FSvalues[NumOfVar][NumOfSet][2] - value) / (FSvalues[NumOfVar][NumOfSet][2] - FSvalues[NumOfVar][NumOfSet][1]);
        }
    } else if (NumOfSet == NFuzzySets[NumOfVar] - 1) {
        if (value < FSvalues[NumOfVar][NumOfSet][0]) {
            return 0;
        } else if (value > FSvalues[NumOfVar][NumOfSet][2]) {
            return 1;
        } else if (value < FSvalues[NumOfVar][NumOfSet][1]) {
            return (value - FSvalues[NumOfVar][NumOfSet][0]) / (FSvalues[NumOfVar][NumOfSet][1] - FSvalues[NumOfVar][NumOfSet][0]);
        }
    } else {
        if (value < FSvalues[NumOfVar][NumOfSet][0]) {
            return 0;
        } else if (value > FSvalues[NumOfVar][NumOfSet][2]) {
            return 0;
        } else if (value < FSvalues[NumOfVar][NumOfSet][1]) {
            return (value - FSvalues[NumOfVar][NumOfSet][0]) / (FSvalues[NumOfVar][NumOfSet][1] - FSvalues[NumOfVar][NumOfSet][0]);
        } else {
            return (FSvalues[NumOfVar][NumOfSet][2] - value) / (FSvalues[NumOfVar][NumOfSet][2] - FSvalues[NumOfVar][NumOfSet][1]);
        }
    }
}

function getDesiredValuesFuzzy() {
    for (var j = 0; j != NFuzzySets[0]; j++) {
        AlphaCut[j] = 0;
    }

    for (var i = 0; i != NRules; i++) {
        var tempMR = 0;
        var tempMinMR = 1;
        for (var CurrentVar = NFuzzyOutputs; CurrentVar != NFuzzyVars; CurrentVar++) {
            tempMR = getMRFromFSvalues(ValuesForFuzzy[CurrentVar], CurrentVar, RBase[i][CurrentVar]);
            if (tempMR < tempMinMR)
                tempMinMR = tempMR;
        }
        for (var CurrentVar = 0; CurrentVar != NFuzzyOutputs; CurrentVar++) {
            if (tempMinMR > AlphaCut[RBase[i][CurrentVar]])
                AlphaCut[RBase[i][CurrentVar]] = tempMinMR;
        }
    }

    for (var CurrentVar = 0; CurrentVar != NFuzzyOutputs; CurrentVar++) {
        var FuzzyRange = FSvalues[CurrentVar][NFuzzySets[CurrentVar] - 1][2] - FSvalues[CurrentVar][0][0];
        var NIntervals = 100;
        var CoordinateMassSumm = 0;
        var MassSumm = 0;
        for (var i = 0; i != NIntervals; i++) {
            var TempCoordinate = FSvalues[CurrentVar][0][0] + FuzzyRange / NIntervals * i;
            var TempMass1 = 0;
            var TempMass2 = 0;
            for (var j = 0; j != NFuzzySets[CurrentVar]; j++) {
                TempMass2 = getMRFromFSvalues(TempCoordinate, CurrentVar, j);
                if (TempMass2 > AlphaCut[j])
                    TempMass2 = AlphaCut[j];
                if (TempMass2 > TempMass1)
                    TempMass1 = TempMass2;
            }
            MassSumm += TempMass1;
            CoordinateMassSumm += TempCoordinate * TempMass1;
        }
        if (MassSumm != 0)
            ValuesForFuzzy[CurrentVar] = CoordinateMassSumm / MassSumm;
        if (ValuesForFuzzy[CurrentVar].isNaN)
            ValuesForFuzzy[CurrentVar] = 0;
    }
}
////////////////////////////////////////////////unfuzzy

function controlAlgorithm() {

    ValuesForFuzzy[1] = desiredValue - actualValue;
    console.log(ValuesForFuzzy[1]);
    getDesiredValuesFuzzy();
    pwm = ValuesForFuzzy[0];
    console.log(pwm);
    if (pwm > 255) { pwm = 255 };
    if (pwm < -255) { pwm = -255 };
    if (pwm > 0) {
        board.digitalWrite(2, 0);
    }; // direction if > 0
    if (pwm < 0) {
        board.digitalWrite(2, 1);
    }; // direction if < 0
    board.analogWrite(3, Math.abs(pwm));
};

function startControlAlgorithm() {
    setInterval(function () {
        controlAlgorithm();
    }, 30); // call the alg. on 30ms
    console.log("Control algorithm has been started.");
};

function sendValues(socket) {
    socket.emit("clientReadValues", {
        "desiredValue": desiredValue,
        "actualValue": actualValue
    });
};
