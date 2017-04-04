//
// Datasource to read serial port data with rate limiting
//
//

(function() {
    var serialDatasource = function (settings, updateCallback) {
        var serialport = require("serialport");
        var SerialPort = serialport.SerialPort; // localize object constructor

        var self = this;
        var currentSettings = settings;
        var com = null;
        var timer = null;
        var data = [];

        listSerial();

        /* parse serial line */
        function parseLine() {
            console.log('raw data received: ' + rawStream);
            data = rawStream.split(',').map(Number);

            // write to file
            if (currentSettings.file_write) {
                // some stuff
            }

            // truncate decimals -> send to display

            console.log('processed data' + data);
        }


        /* open serial connection and attach handlers */
        function openSerial() {
            com = new SerialPort(currentSettings.port, {
                baudrate: currentSettings.baudrate,
                parser: serialport.parsers.readline("\n")
            });

            if (com === null) {
                return;
            }

            com.on("error", function (err) {
                console.log(err);
            });

            com.on("open", function () {
                console.log("Serial port '" + currentSettings.port + "' opened");

                updateTimer(); // start sending data to UI

                com.on("data", function(rawStream) {
                    parseLine(rawStream);
                });

            });
        }

        /* list serial connections */
        function listSerial() {
            serialport.list(function (err, ports) {
                console.log(ports);
            });
        }

        /* close serial connection */
        function closeSerial() {
            if (com) {
                com.close();
                com = null;
            }
        }

        /* stop interval timer */
        function stopTimer() {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        }

        /* update with latest serial data */
        function updateTimer() {
            stopTimer();
            timer = setInterval(self.updateNow, currentSettings.refresh * 1000);
        }

        openSerial();

        self.onSettingsChanged = function(newSettings) {
            if (newSettings.port != currentSettings.port || newSettings.baudrate != currentSettings.baudrate) {
                currentSettings = newSettings;
                closeSerial();
                openSerial();
            }
            else {
                currentSettings = newSettings;
                updateTimer();
            }
        }

        self.updateNow = function() {
            console.log("updating");
            updateCallback(data);
        }

        self.onDispose = function() {
            stopTimer();
            closeSerial();
        }
    };

    freeboard.loadDatasourcePlugin({
        "type_name": "serial",
        "display_name": "Serial Port",
        "settings": [
            {
                "name": "port",
                "display_name": "Port",
                "type": "text"
            },
            {
                "name": "baudrate",
                "display_name": "Baudrate",
                "type": "option",
                "options": [
                    {
                        "name": "1200",
                        "value": 1200
                    },
                    {
                        "name": "4800",
                        "value": 4800
                    },
                    {
                        "name": "9600",
                        "value": 9600
                    },
                    {
                        "name": "14400",
                        "value": 14400
                    },
                    {
                        "name": "19200",
                        "value": 19200
                    },
                    {
                        "name": "28800",
                        "value": 28800
                    },
                    {
                        "name": "38400",
                        "value": 38400
                    },
                    {
                        "name": "57600",
                        "value": 57600
                    },
                    {
                        "name": "115200",
                        "value": 115200
                    },
                ]
            },
            {
                "name": "refresh",
                "display_name": "Refresh Every",
                "type": "number",
                "suffix": "seconds",
                "default_value": 1,
                "required": true
            },
            {
                "name": "file_write",
                "display_name": "Write to File",
                "type": "boolean"
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new serialDatasource(settings, updateCallback));
        }
    });
}());
