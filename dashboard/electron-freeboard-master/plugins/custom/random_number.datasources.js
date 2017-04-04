//
// Datasource to generate array of random numbers
//
//

(function() {
    var randomDatasource = function (settings, updateCallback) {
        var self = this;
        var currentSettings = settings;
        var timer = null;

        function stopTimer() {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        }

        function updateTimer() {
            stopTimer();
            timer = setInterval(self.updateNow, currentSettings.refresh * 1000);
        }

        self.updateNow = function () {
            var min = currentSettings.min_value;
            var max = currentSettings.max_value;
            var values = [];

            for (var i = 0; i < currentSettings.num_values; i++) {
                values.push(Math.min(min + (Math.random() * (max - min)), max).toFixed(currentSettings.precision));
            }

            updateCallback(values);
        }

        self.onDispose = function () {
            stopTimer();
        }

        self.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            updateTimer();
        }

        updateTimer();
    };

    freeboard.loadDatasourcePlugin({
        "type_name": "random",
        "display_name": "Random",
        "settings": [
            {
                "name": "refresh",
                "display_name": "Refresh Every",
                "type": "number",
                "suffix": "seconds",
                "default_value": 1,
                "required": true
            },
            {
                "name": "num_values",
                "display_name": "Number of Values",
                "description": "Number of random values to generate on each refresh interval",
                "type": "number",
                "default_value": 1,
                "required": true
            },
            {
                "name": "precision",
                "display_name": "Precision",
                "description": "Number of decimal places for each random value",
                "type": "number",
                "default_value": 1,
                "required": true
            },
            {
                "name": "min_value",
                "display_name": "Minimum",
                "description": "inclusive",
                "type": "number",
                "default_value": 0,
                "required": true
            },
            {
                "name": "max_value",
                "display_name": "Maximum",
                "description": "inclusive",
                "type": "number",
                "default_value": 100,
                "required": true
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new randomDatasource(settings, updateCallback));
        }
    });
}());
