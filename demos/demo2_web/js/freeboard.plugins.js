// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                  │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)         │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)               │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

(function () {
	var jsonDatasource = function (settings, updateCallback) {
		var self = this;
		var updateTimer = null;
		var currentSettings = settings;
		var errorStage = 0; 	// 0 = try standard request
		// 1 = try JSONP
		// 2 = try thingproxy.freeboard.io
		var lockErrorStage = false;

		function updateRefresh(refreshTime) {
			if (updateTimer) {
				clearInterval(updateTimer);
			}

			updateTimer = setInterval(function () {
				self.updateNow();
			}, refreshTime);
		}

		updateRefresh(currentSettings.refresh * 1000);

		this.updateNow = function () {
			if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
			{
				return; // TODO: Report an error
			}

			var requestURL = currentSettings.url;

			if (errorStage == 2 && currentSettings.use_thingproxy) {
				requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
			}

			var body = currentSettings.body;

			// Can the body be converted to JSON?
			if (body) {
				try {
					body = JSON.parse(body);
				}
				catch (e) {
				}
			}

			$.ajax({
				url: requestURL,
				dataType: (errorStage == 1) ? "JSONP" : "JSON",
				type: currentSettings.method || "GET",
				data: body,
				beforeSend: function (xhr) {
					try {
						_.each(currentSettings.headers, function (header) {
							var name = header.name;
							var value = header.value;

							if (!_.isUndefined(name) && !_.isUndefined(value)) {
								xhr.setRequestHeader(name, value);
							}
						});
					}
					catch (e) {
					}
				},
				success: function (data) {
					lockErrorStage = true;
					updateCallback(data);
				},
				error: function (xhr, status, error) {
					if (!lockErrorStage) {
						// TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
						errorStage++;
						self.updateNow();
					}
				}
			});
		}

		this.onDispose = function () {
			clearInterval(updateTimer);
			updateTimer = null;
		}

		this.onSettingsChanged = function (newSettings) {
			lockErrorStage = false;
			errorStage = 0;

			currentSettings = newSettings;
			updateRefresh(currentSettings.refresh * 1000);
			self.updateNow();
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name: "JSON",
		settings: [
			{
				name: "url",
				display_name: "URL",
				type: "text"
			},
			{
				name: "use_thingproxy",
				display_name: "Try thingproxy",
				description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
				type: "boolean",
				default_value: true
			},
			{
				name: "refresh",
				display_name: "Refresh Every",
				type: "number",
				suffix: "seconds",
				default_value: 5
			},
			{
				name: "method",
				display_name: "Method",
				type: "option",
				options: [
					{
						name: "GET",
						value: "GET"
					},
					{
						name: "POST",
						value: "POST"
					},
					{
						name: "PUT",
						value: "PUT"
					},
					{
						name: "DELETE",
						value: "DELETE"
					}
				]
			},
			{
				name: "body",
				display_name: "Body",
				type: "text",
				description: "The body of the request. Normally only used if method is POST"
			},
			{
				name: "headers",
				display_name: "Headers",
				type: "array",
				settings: [
					{
						name: "name",
						display_name: "Name",
						type: "text"
					},
					{
						name: "value",
						display_name: "Value",
						type: "text"
					}
				]
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new jsonDatasource(settings, updateCallback));
		}
	});

	var openWeatherMapDatasource = function (settings, updateCallback) {
		var self = this;
		var updateTimer = null;
		var currentSettings = settings;

		function updateRefresh(refreshTime) {
			if (updateTimer) {
				clearInterval(updateTimer);
			}

			updateTimer = setInterval(function () {
				self.updateNow();
			}, refreshTime);
		}

		function toTitleCase(str) {
			return str.replace(/\w\S*/g, function (txt) {
				return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
			});
		}

		updateRefresh(currentSettings.refresh * 1000);

		this.updateNow = function () {
			$.ajax({
				url: "http://api.openweathermap.org/data/2.5/weather?APPID="+currentSettings.api_key+"&q=" + encodeURIComponent(currentSettings.location) + "&units=" + currentSettings.units,
				dataType: "JSONP",
				success: function (data) {
					// Rejigger our data into something easier to understand
					var newData = {
						place_name: data.name,
						sunrise: (new Date(data.sys.sunrise * 1000)).toLocaleTimeString(),
						sunset: (new Date(data.sys.sunset * 1000)).toLocaleTimeString(),
						conditions: toTitleCase(data.weather[0].description),
						current_temp: data.main.temp,
						high_temp: data.main.temp_max,
						low_temp: data.main.temp_min,
						pressure: data.main.pressure,
						humidity: data.main.humidity,
						wind_speed: data.wind.speed,
						wind_direction: data.wind.deg
					};

					updateCallback(newData);
				},
				error: function (xhr, status, error) {
				}
			});
		}

		this.onDispose = function () {
			clearInterval(updateTimer);
			updateTimer = null;
		}

		this.onSettingsChanged = function (newSettings) {
			currentSettings = newSettings;
			self.updateNow();
			updateRefresh(currentSettings.refresh * 1000);
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name: "openweathermap",
		display_name: "Open Weather Map API",
		settings: [
			{
				name: "api_key",
				display_name: "API Key",
				type: "text",
				description: "Your personal API Key from Open Weather Map"
			},
            {
				name: "location",
				display_name: "Location",
				type: "text",
				description: "Example: London, UK"
			},
			{
				name: "units",
				display_name: "Units",
				type: "option",
				default: "imperial",
				options: [
					{
						name: "Imperial",
						value: "imperial"
					},
					{
						name: "Metric",
						value: "metric"
					}
				]
			},
			{
				name: "refresh",
				display_name: "Refresh Every",
				type: "number",
				suffix: "seconds",
				default_value: 5
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new openWeatherMapDatasource(settings, updateCallback));
		}
	});

	var dweetioDatasource = function (settings, updateCallback) {
		var self = this;
		var currentSettings = settings;

		function onNewDweet(dweet) {
			updateCallback(dweet);
		}

		this.updateNow = function () {
			dweetio.get_latest_dweet_for(currentSettings.thing_id, function (err, dweet) {
				if (err) {
					//onNewDweet({});
				}
				else {
					onNewDweet(dweet[0].content);
				}
			});
		}

		this.onDispose = function () {

		}

		this.onSettingsChanged = function (newSettings) {
			dweetio.stop_listening();

			currentSettings = newSettings;

			dweetio.listen_for(currentSettings.thing_id, function (dweet) {
				onNewDweet(dweet.content);
			});
		}

		self.onSettingsChanged(settings);
	};

	freeboard.loadDatasourcePlugin({
		"type_name": "dweet_io",
		"display_name": "Dweet.io",
		"external_scripts": [
			"http://dweet.io/client/dweet.io.min.js"
		],
		"settings": [
			{
				name: "thing_id",
				display_name: "Thing Name",
				"description": "Example: salty-dog-1",
				type: "text"
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new dweetioDatasource(settings, updateCallback));
		}
	});

	var playbackDatasource = function (settings, updateCallback) {
		var self = this;
		var currentSettings = settings;
		var currentDataset = [];
		var currentIndex = 0;
		var currentTimeout;

		function moveNext() {
			if (currentDataset.length > 0) {
				if (currentIndex < currentDataset.length) {
					updateCallback(currentDataset[currentIndex]);
					currentIndex++;
				}

				if (currentIndex >= currentDataset.length && currentSettings.loop) {
					currentIndex = 0;
				}

				if (currentIndex < currentDataset.length) {
					currentTimeout = setTimeout(moveNext, currentSettings.refresh * 1000);
				}
			}
			else {
				updateCallback({});
			}
		}

		function stopTimeout() {
			currentDataset = [];
			currentIndex = 0;

			if (currentTimeout) {
				clearTimeout(currentTimeout);
				currentTimeout = null;
			}
		}

		this.updateNow = function () {
			stopTimeout();

			$.ajax({
				url: currentSettings.datafile,
				dataType: (currentSettings.is_jsonp) ? "JSONP" : "JSON",
				success: function (data) {
					if (_.isArray(data)) {
						currentDataset = data;
					}
					else {
						currentDataset = [];
					}

					currentIndex = 0;

					moveNext();
				},
				error: function (xhr, status, error) {
				}
			});
		}

		this.onDispose = function () {
			stopTimeout();
		}

		this.onSettingsChanged = function (newSettings) {
			currentSettings = newSettings;
			self.updateNow();
		}
	};

	freeboard.loadDatasourcePlugin({
		"type_name": "playback",
		"display_name": "Playback",
		"settings": [
			{
				"name": "datafile",
				"display_name": "Data File URL",
				"type": "text",
				"description": "A link to a JSON array of data."
			},
			{
				name: "is_jsonp",
				display_name: "Is JSONP",
				type: "boolean"
			},
			{
				"name": "loop",
				"display_name": "Loop",
				"type": "boolean",
				"description": "Rewind and loop when finished"
			},
			{
				"name": "refresh",
				"display_name": "Refresh Every",
				"type": "number",
				"suffix": "seconds",
				"default_value": 5
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new playbackDatasource(settings, updateCallback));
		}
	});

	var clockDatasource = function (settings, updateCallback) {
		var self = this;
		var currentSettings = settings;
		var timer;

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

		this.updateNow = function () {
			var date = new Date();

			var data = {
				numeric_value: date.getTime(),
				full_string_value: date.toLocaleString(),
				date_string_value: date.toLocaleDateString(),
				time_string_value: date.toLocaleTimeString(),
				date_object: date
			};

			updateCallback(data);
		}

		this.onDispose = function () {
			stopTimer();
		}

		this.onSettingsChanged = function (newSettings) {
			currentSettings = newSettings;
			updateTimer();
		}

		updateTimer();
	};

	freeboard.loadDatasourcePlugin({
		"type_name": "clock",
		"display_name": "Clock",
		"settings": [
			{
				"name": "refresh",
				"display_name": "Refresh Every",
				"type": "number",
				"suffix": "seconds",
				"default_value": 1
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new clockDatasource(settings, updateCallback));
		}
	});
freeboard.loadDatasourcePlugin({
		// **type_name** (required) : A unique name for this plugin. This name should be as unique as possible to avoid collisions with other plugins, and should follow naming conventions for javascript variable and function declarations.
		"type_name"   : "meshblu",
		// **display_name** : The pretty name that will be used for display purposes for this plugin. If the name is not defined, type_name will be used instead.
		"display_name": "Octoblu",
        // **description** : A description of the plugin. This description will be displayed when the plugin is selected or within search results (in the future). The description may contain HTML if needed.
        "description" : "app.octoblu.com",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.
		"external_scripts" : [
			"http://meshblu.octoblu.com/js/meshblu.js"
		],
		// **settings** : An array of settings that will be displayed for this plugin when the user adds it.
		"settings"    : [
			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name"         : "uuid",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name" : "UUID",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type"         : "text",
				// **default_value** : A default value for this setting.
				"default_value": "device uuid",
				// **description** : Text that will be displayed below the setting to give the user any extra information.
				"description"  : "your device UUID",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required" : true
			},
			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name"         : "token",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name" : "Token",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type"         : "text",
				// **default_value** : A default value for this setting.
				"default_value": "device token",
				// **description** : Text that will be displayed below the setting to give the user any extra information.
				"description"  : "your device TOKEN",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required" : true
			},
			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name"         : "server",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name" : "Server",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type"         : "text",
				// **default_value** : A default value for this setting.
				"default_value": "meshblu.octoblu.com",
				// **description** : Text that will be displayed below the setting to give the user any extra information.
				"description"  : "your server",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required" : true
			},
			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name"         : "port",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name" : "Port",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type"         : "number",
				// **default_value** : A default value for this setting.
				"default_value": 80,
				// **description** : Text that will be displayed below the setting to give the user any extra information.
				"description"  : "server port",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required" : true
			}
			
		],
		// **newInstance(settings, newInstanceCallback, updateCallback)** (required) : A function that will be called when a new instance of this plugin is requested.
		// * **settings** : A javascript object with the initial settings set by the user. The names of the properties in the object will correspond to the setting names defined above.
		// * **newInstanceCallback** : A callback function that you'll call when the new instance of the plugin is ready. This function expects a single argument, which is the new instance of your plugin object.
		// * **updateCallback** : A callback function that you'll call if and when your datasource has an update for freeboard to recalculate. This function expects a single parameter which is a javascript object with the new, updated data. You should hold on to this reference and call it when needed.
		newInstance   : function(settings, newInstanceCallback, updateCallback)
		{
			// myDatasourcePlugin is defined below.
			newInstanceCallback(new meshbluSource(settings, updateCallback));
		}
	});


	// ### Datasource Implementation
	//
	// -------------------
	// Here we implement the actual datasource plugin. We pass in the settings and updateCallback.
	var meshbluSource = function(settings, updateCallback)
	{
		// Always a good idea...
		var self = this;

		// Good idea to create a variable to hold on to our settings, because they might change in the future. See below.
		var currentSettings = settings;

		

		/* This is some function where I'll get my data from somewhere */

 	
		function getData()
		{


		 var conn = skynet.createConnection({
    		"uuid": currentSettings.uuid,
    		"token": currentSettings.token,
    		"server": currentSettings.server, 
    		"port": currentSettings.port
  				});	
			 
			 conn.on('ready', function(data){	

			 	conn.on('message', function(message){

    				var newData = message;
    				updateCallback(newData);

 						 });

			 });
			}

	

		// **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
		self.onSettingsChanged = function(newSettings)
		{
			// Here we update our current settings with the variable that is passed in.
			currentSettings = newSettings;
		}

		// **updateNow()** (required) : A public function we must implement that will be called when the user wants to manually refresh the datasource
		self.updateNow = function()
		{
			// Most likely I'll just call getData() here.
			getData();
		}

		// **onDispose()** (required) : A public function we must implement that will be called when this instance of this plugin is no longer needed. Do anything you need to cleanup after yourself here.
		self.onDispose = function()
		{
		
			//conn.close();
		}

		// Here we call createRefreshTimer with our current settings, to kick things off, initially. Notice how we make use of one of the user defined settings that we setup earlier.
	//	createRefreshTimer(currentSettings.refresh_time);
	}


}());

// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                  │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)         │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)               │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

(function () {
    var SPARKLINE_HISTORY_LENGTH = 100;
    var SPARKLINE_COLORS = ["#FF9900", "#FFFFFF", "#B3B4B4", "#6B6B6B", "#28DE28", "#13F7F9", "#E6EE18", "#C41204", "#CA3CB8", "#0B1CFB"];

    function easeTransitionText(newValue, textElement, duration) {

        var currentValue = $(textElement).text();

        if (currentValue == newValue)
            return;

        if ($.isNumeric(newValue) && $.isNumeric(currentValue)) {
            var numParts = newValue.toString().split('.');
            var endingPrecision = 0;

            if (numParts.length > 1) {
                endingPrecision = numParts[1].length;
            }

            numParts = currentValue.toString().split('.');
            var startingPrecision = 0;

            if (numParts.length > 1) {
                startingPrecision = numParts[1].length;
            }

            jQuery({transitionValue: Number(currentValue), precisionValue: startingPrecision}).animate({transitionValue: Number(newValue), precisionValue: endingPrecision}, {
                duration: duration,
                step: function () {
                    $(textElement).text(this.transitionValue.toFixed(this.precisionValue));
                },
                done: function () {
                    $(textElement).text(newValue);
                }
            });
        }
        else {
            $(textElement).text(newValue);
        }
    }

    function addSparklineLegend(element, legend) {
        var legendElt = $("<div class='sparkline-legend'></div>");
        for(var i=0; i<legend.length; i++) {
            var color = SPARKLINE_COLORS[i % SPARKLINE_COLORS.length];
            var label = legend[i];
            legendElt.append("<div class='sparkline-legend-value'><span style='color:" +
                             color + "'>&#9679;</span>" + label + "</div>");
        }
        element.empty().append(legendElt);

        freeboard.addStyle('.sparkline-legend', "margin:5px;");
        freeboard.addStyle('.sparkline-legend-value',
            'color:white; font:10px arial,san serif; float:left; overflow:hidden; width:50%;');
        freeboard.addStyle('.sparkline-legend-value span',
            'font-weight:bold; padding-right:5px;');
    }

    function addValueToSparkline(element, value, legend) {
        var values = $(element).data().values;
        var valueMin = $(element).data().valueMin;
        var valueMax = $(element).data().valueMax;
        if (!values) {
            values = [];
            valueMin = undefined;
            valueMax = undefined;
        }

        var collateValues = function(val, plotIndex) {
            if(!values[plotIndex]) {
                values[plotIndex] = [];
            }
            if (values[plotIndex].length >= SPARKLINE_HISTORY_LENGTH) {
                values[plotIndex].shift();
            }
            values[plotIndex].push(Number(val));

            if(valueMin === undefined || val < valueMin) {
                valueMin = val;
            }
            if(valueMax === undefined || val > valueMax) {
                valueMax = val;
            }
        }

        if(_.isArray(value)) {
            _.each(value, collateValues);
        } else {
            collateValues(value, 0);
        }
        $(element).data().values = values;
        $(element).data().valueMin = valueMin;
        $(element).data().valueMax = valueMax;

        var tooltipHTML = '<span style="color: {{color}}">&#9679;</span> {{y}}';

        var composite = false;
        _.each(values, function(valueArray, valueIndex) {
            $(element).sparkline(valueArray, {
                type: "line",
                composite: composite,
                height: "100%",
                width: "100%",
                fillColor: false,
                lineColor: SPARKLINE_COLORS[valueIndex % SPARKLINE_COLORS.length],
                lineWidth: 2,
                spotRadius: 3,
                spotColor: false,
                minSpotColor: "#78AB49",
                maxSpotColor: "#78AB49",
                highlightSpotColor: "#9D3926",
                highlightLineColor: "#9D3926",
                chartRangeMin: valueMin,
                chartRangeMax: valueMax,
                tooltipFormat: (legend && legend[valueIndex])?tooltipHTML + ' (' + legend[valueIndex] + ')':tooltipHTML
            });
            composite = true;
        });
    }

    var valueStyle = freeboard.getStyleString("values");

    freeboard.addStyle('.widget-big-text', valueStyle + "font-size:40px;");

    freeboard.addStyle('.tw-display', 'width: 100%; height:100%; display:table; table-layout:fixed;');

    freeboard.addStyle('.tw-tr',
        'display:table-row;');

    freeboard.addStyle('.tw-tg',
        'display:table-row-group;');

    freeboard.addStyle('.tw-tc',
        'display:table-caption;');

    freeboard.addStyle('.tw-td',
        'display:table-cell;');

    freeboard.addStyle('.tw-value',
        valueStyle +
        'overflow: hidden;' +
        'display: inline-block;' +
        'text-overflow: ellipsis;');

    freeboard.addStyle('.tw-unit',
        'display: inline-block;' +
        'padding-left: 10px;' +
        'padding-bottom: 1.1em;' +
        'vertical-align: bottom;');

    freeboard.addStyle('.tw-value-wrapper',
        'position: relative;' +
        'vertical-align: middle;' +
        'height:100%;');

    freeboard.addStyle('.tw-sparkline',
        'height:20px;');

    var textWidget = function (settings) {

        var self = this;

        var currentSettings = settings;
        var displayElement = $('<div class="tw-display"></div>');
        var titleElement = $('<h2 class="section-title tw-title tw-td"></h2>');
        var valueElement = $('<div class="tw-value"></div>');
        var unitsElement = $('<div class="tw-unit"></div>');
        var sparklineElement = $('<div class="tw-sparkline tw-td"></div>');

        function updateValueSizing()
        {
            if(!_.isUndefined(currentSettings.units) && currentSettings.units != "") // If we're displaying our units
            {
                valueElement.css("max-width", (displayElement.innerWidth() - unitsElement.outerWidth(true)) + "px");
            }
            else
            {
                valueElement.css("max-width", "100%");
            }
        }

        this.render = function (element) {
            $(element).empty();

            $(displayElement)
                .append($('<div class="tw-tr"></div>').append(titleElement))
                .append($('<div class="tw-tr"></div>').append($('<div class="tw-value-wrapper tw-td"></div>').append(valueElement).append(unitsElement)))
                .append($('<div class="tw-tr"></div>').append(sparklineElement));

            $(element).append(displayElement);

            updateValueSizing();
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;

            var shouldDisplayTitle = (!_.isUndefined(newSettings.title) && newSettings.title != "");
            var shouldDisplayUnits = (!_.isUndefined(newSettings.units) && newSettings.units != "");

            if(newSettings.sparkline)
            {
                sparklineElement.attr("style", null);
            }
            else
            {
                delete sparklineElement.data().values;
                sparklineElement.empty();
                sparklineElement.hide();
            }

            if(shouldDisplayTitle)
            {
                titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
                titleElement.attr("style", null);
            }
            else
            {
                titleElement.empty();
                titleElement.hide();
            }

            if(shouldDisplayUnits)
            {
                unitsElement.html((_.isUndefined(newSettings.units) ? "" : newSettings.units));
                unitsElement.attr("style", null);
            }
            else
            {
                unitsElement.empty();
                unitsElement.hide();
            }

            var valueFontSize = 30;

            if(newSettings.size == "big")
            {
                valueFontSize = 75;

                if(newSettings.sparkline)
                {
                    valueFontSize = 60;
                }
            }

            valueElement.css({"font-size" : valueFontSize + "px"});

            updateValueSizing();
        }

        this.onSizeChanged = function()
        {
            updateValueSizing();
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "value") {

                if (currentSettings.animate) {
                    easeTransitionText(newValue, valueElement, 500);
                }
                else {
                    valueElement.text(newValue);
                }

                if (currentSettings.sparkline) {
                    addValueToSparkline(sparklineElement, newValue);
                }
            }
        }

        this.onDispose = function () {

        }

        this.getHeight = function () {
            if (currentSettings.size == "big" || currentSettings.sparkline) {
                return 2;
            }
            else {
                return 1;
            }
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "text_widget",
        display_name: "Text",
        "external_scripts" : [
            "plugins/thirdparty/jquery.sparkline.min.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "size",
                display_name: "Size",
                type: "option",
                options: [
                    {
                        name: "Regular",
                        value: "regular"
                    },
                    {
                        name: "Big",
                        value: "big"
                    }
                ]
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "sparkline",
                display_name: "Include Sparkline",
                type: "boolean"
            },
            {
                name: "animate",
                display_name: "Animate Value Changes",
                type: "boolean",
                default_value: true
            },
            {
                name: "units",
                display_name: "Units",
                type: "text"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new textWidget(settings));
        }
    });

    var gaugeID = 0;
    freeboard.addStyle('.gauge-widget-wrapper', "width: 100%;text-align: center;");
    freeboard.addStyle('.gauge-widget', "width:200px;height:160px;display:inline-block;");

    var gaugeWidget = function (settings) {
        var self = this;

        var thisGaugeID = "gauge-" + gaugeID++;
        var titleElement = $('<h2 class="section-title"></h2>');
        var gaugeElement = $('<div class="gauge-widget" id="' + thisGaugeID + '"></div>');

        var gaugeObject;
        var rendered = false;

        var currentSettings = settings;

        function createGauge() {
            if (!rendered) {
                return;
            }

            gaugeElement.empty();

            gaugeObject = new JustGage({
                id: thisGaugeID,
                value: (_.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value),
                min: (_.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value),
                max: (_.isUndefined(currentSettings.max_value) ? 0 : currentSettings.max_value),
                label: currentSettings.units,
                showInnerShadow: false,
                valueFontColor: "#d3d4d4"
            });
        }

        this.render = function (element) {
            rendered = true;
            $(element).append(titleElement).append($('<div class="gauge-widget-wrapper"></div>').append(gaugeElement));
            createGauge();
        }

        this.onSettingsChanged = function (newSettings) {
            if (newSettings.min_value != currentSettings.min_value || newSettings.max_value != currentSettings.max_value || newSettings.units != currentSettings.units) {
                currentSettings = newSettings;
                createGauge();
            }
            else {
                currentSettings = newSettings;
            }

            titleElement.html(newSettings.title);
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (!_.isUndefined(gaugeObject)) {
                gaugeObject.refresh(Number(newValue));
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 3;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "radial-gauge",
        display_name: "Radial Gauge",
        "external_scripts" : [
            "plugins/thirdparty/raphael.2.1.0-custom.js",
            "plugins/thirdparty/justgage.1.0.1.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "units",
                display_name: "Units",
                type: "text"
            },
            {
                name: "min_value",
                display_name: "Minimum",
                type: "text",
                default_value: 0
            },
            {
                name: "max_value",
                display_name: "Maximum",
                type: "text",
                default_value: 100
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new gaugeWidget(settings));
        }
    });


    freeboard.addStyle('.sparkline', "width:100%;height: 75px;");
    var sparklineWidget = function (settings) {
        var self = this;

        var titleElement = $('<h2 class="section-title"></h2>');
        var sparklineElement = $('<div class="sparkline"></div>');
        var sparklineLegend = $('<div></div>');
        var currentSettings = settings;

        this.render = function (element) {
            $(element).append(titleElement).append(sparklineElement).append(sparklineLegend);
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));

            if(newSettings.include_legend) {
                addSparklineLegend(sparklineLegend,  newSettings.legend.split(","));
            }
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (currentSettings.legend) {
                addValueToSparkline(sparklineElement, newValue, currentSettings.legend.split(","));
            } else {
                addValueToSparkline(sparklineElement, newValue);
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            var legendHeight = 0;
            if (currentSettings.include_legend && currentSettings.legend) {
                var legendLength = currentSettings.legend.split(",").length;
                if (legendLength > 4) {
                    legendHeight = Math.floor((legendLength-1) / 4) * 0.5;
                } else if (legendLength) {
                    legendHeight = 0.5;
                }
            }
            return 2 + legendHeight;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "sparkline",
        display_name: "Sparkline",
        "external_scripts" : [
            "plugins/thirdparty/jquery.sparkline.min.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated",
                multi_input: "true"
            },
            {
                name: "include_legend",
                display_name: "Include Legend",
                type: "boolean"
            },
            {
                name: "legend",
                display_name: "Legend",
                type: "text",
                description: "Comma-separated for multiple sparklines"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new sparklineWidget(settings));
        }
    });

    freeboard.addStyle('div.pointer-value', "position:absolute;height:95px;margin: auto;top: 10px;bottom: 0px;width: 270px;text-align:center;");
    var pointerWidget = function (settings) {
        var self = this;
        var paper;
        var strokeWidth = 3;
        var triangle;
        var width, height;
        var currentValue = 0;
        var valueDiv = $('<div class="widget-big-text"></div>');
        var unitsDiv = $('<div></div>');

        function polygonPath(points) {
            if (!points || points.length < 2)
                return [];
            var path = []; //will use path object type
            path.push(['m', points[0], points[1]]);
            for (var i = 2; i < points.length; i += 2) {
                path.push(['l', points[i], points[i + 1]]);
            }
            path.push(['z']);
            return path;
        }

        this.render = function (element) {
            width = $(element).width();
            //height = $(element).height();
            height = 160;

            var radius = Math.min(width, height) / 2 - strokeWidth * 2;

            paper = Raphael($(element).get()[0], width, height);
            var circle = paper.circle(width / 2, height / 2, radius);
            circle.attr("stroke", "#FF9900");
            circle.attr("stroke-width", strokeWidth);

            triangle = paper.path(polygonPath([width / 2, (height / 2) - radius + strokeWidth, 15, 20, -30, 0]));
            triangle.attr("stroke-width", 0);
            triangle.attr("fill", "#fff");

            $(element).append($('<div class="pointer-value"></div>').append(valueDiv).append(unitsDiv));
        }

        this.onSettingsChanged = function (newSettings) {
            unitsDiv.html(newSettings.units);
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "direction") {
                if (!_.isUndefined(triangle)) {
                    var direction = "r";

                    var oppositeCurrent = currentValue + 180;

                    if (oppositeCurrent < newValue) {
                        //direction = "l";
                    }

                    triangle.animate({transform: "r" + newValue + "," + (width / 2) + "," + (height / 2)}, 250, "bounce");
                }

                currentValue = newValue;
            }
            else if (settingName == "value_text") {
                valueDiv.html(newValue);
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 3;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "pointer",
        display_name: "Pointer",
        "external_scripts" : [
            "plugins/thirdparty/raphael.2.1.0-custom.js"
        ],
        settings: [
            {
                name: "direction",
                display_name: "Direction",
                type: "calculated",
                description: "In degrees"
            },
            {
                name: "value_text",
                display_name: "Value Text",
                type: "calculated"
            },
            {
                name: "units",
                display_name: "Units",
                type: "text"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new pointerWidget(settings));
        }
    });

    var pictureWidget = function(settings)
    {
        var self = this;
        var widgetElement;
        var timer;
        var imageURL;

        function stopTimer()
        {
            if(timer)
            {
                clearInterval(timer);
                timer = null;
            }
        }

        function updateImage()
        {
            if(widgetElement && imageURL)
            {
                var cacheBreakerURL = imageURL + (imageURL.indexOf("?") == -1 ? "?" : "&") + Date.now();

                $(widgetElement).css({
                    "background-image" :  "url(" + cacheBreakerURL + ")"
                });
            }
        }

        this.render = function(element)
        {
            $(element).css({
                width : "100%",
                height: "100%",
                "background-size" : "cover",
                "background-position" : "center"
            });

            widgetElement = element;
        }

        this.onSettingsChanged = function(newSettings)
        {
            stopTimer();

            if(newSettings.refresh && newSettings.refresh > 0)
            {
                timer = setInterval(updateImage, Number(newSettings.refresh) * 1000);
            }
        }

        this.onCalculatedValueChanged = function(settingName, newValue)
        {
            if(settingName == "src")
            {
                imageURL = newValue;
            }

            updateImage();
        }

        this.onDispose = function()
        {
            stopTimer();
        }

        this.getHeight = function()
        {
            return 4;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "picture",
        display_name: "Picture",
        fill_size: true,
        settings: [
            {
                name: "src",
                display_name: "Image URL",
                type: "calculated"
            },
            {
                "type": "number",
                "display_name": "Refresh every",
                "name": "refresh",
                "suffix": "seconds",
                "description":"Leave blank if the image doesn't need to be refreshed"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new pictureWidget(settings));
        }
    });

    freeboard.addStyle('.indicator-light', "border-radius:50%;width:22px;height:22px;border:2px solid #3d3d3d;margin-top:5px;float:left;background-color:#222;margin-right:10px;");
    freeboard.addStyle('.indicator-light.on', "background-color:#FFC773;box-shadow: 0px 0px 15px #FF9900;border-color:#FDF1DF;");
    freeboard.addStyle('.indicator-text', "margin-top:10px;");
    var indicatorWidget = function (settings) {
        var self = this;
        var titleElement = $('<h2 class="section-title"></h2>');
        var stateElement = $('<div class="indicator-text"></div>');
        var indicatorElement = $('<div class="indicator-light"></div>');
        var currentSettings = settings;
        var isOn = false;
        var onText;
        var offText;

        function updateState() {
            indicatorElement.toggleClass("on", isOn);

            if (isOn) {
                stateElement.text((_.isUndefined(onText) ? (_.isUndefined(currentSettings.on_text) ? "" : currentSettings.on_text) : onText));
            }
            else {
                stateElement.text((_.isUndefined(offText) ? (_.isUndefined(currentSettings.off_text) ? "" : currentSettings.off_text) : offText));
            }
        }

        this.render = function (element) {
            $(element).append(titleElement).append(indicatorElement).append(stateElement);
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
            updateState();
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "value") {
                isOn = Boolean(newValue);
            }
            if (settingName == "on_text") {
                onText = newValue;
            }
            if (settingName == "off_text") {
                offText = newValue;
            }

            updateState();
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 1;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "indicator",
        display_name: "Indicator Light",
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "on_text",
                display_name: "On Text",
                type: "calculated"
            },
            {
                name: "off_text",
                display_name: "Off Text",
                type: "calculated"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new indicatorWidget(settings));
        }
    });

    freeboard.addStyle('.gm-style-cc a', "text-shadow:none;");

    var googleMapWidget = function (settings) {
        var self = this;
        var currentSettings = settings;
        var map;
        var marker;
        var currentPosition = {};
        var poly;
        var path = []; // store list of all points

        function updatePosition() {
            if (map && marker && currentPosition.lat && currentPosition.lon) {
                var newLatLon = new google.maps.LatLng(currentPosition.lat, currentPosition.lon);
                var heading = 0;

                path.push(newLatLon);

                // calculate heading if we have at least two points
                if (path.getLength() >= 2) {
                    var length = path.getLength();
                    var point1 = path.getAt(length - 1);
                    var point2 = path.getAt(length - 2);
                    heading = google.maps.geometry.spherical.computeHeading(point2, point1);
                }

                marker.setMap(null);

                // add marker
                marker = new google.maps.Marker({
                    map: map,
                    icon: {
                        //path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        path: "M87.165,26.958c-1.761-1.501-3.498-2.655-4.812-3.26c0.275-0.594,0.43-1.257,0.43-1.955c0-2.573-2.086-4.661-4.659-4.661   c-0.795,0-1.541,0.2-2.195,0.55c-0.797-1.214-2.234-2.781-4.031-4.316c-3.19-2.722-6.309-4.306-6.963-3.538   c-0.656,0.768,1.398,3.597,4.591,6.32c1.686,1.438,3.35,2.558,4.642,3.181c-0.445,0.715-0.704,1.559-0.704,2.463   c0,0.603,0.116,1.178,0.324,1.707c-6.988,7.52-14.265,11.807-17.685,13.575c-1.996-1.021-4.254-1.601-6.65-1.601   c-1.965,0-3.839,0.391-5.552,1.094c-6.535-2.863-14.313-10.022-17.862-13.495c0.116-0.407,0.18-0.836,0.18-1.28   c0-0.758-0.182-1.473-0.503-2.105c1.273-0.693,2.938-1.977,4.603-3.614c2.99-2.941,4.839-5.91,4.131-6.63   c-0.709-0.719-3.706,1.083-6.696,4.024c-1.618,1.592-2.901,3.19-3.625,4.438c-0.737-0.488-1.619-0.773-2.57-0.773   c-2.574,0-4.661,2.087-4.661,4.661c0,0.757,0.182,1.471,0.503,2.104c-1.268,0.698-2.918,1.971-4.565,3.593   c-2.989,2.942-4.838,5.91-4.13,6.629c0.708,0.72,3.705-1.082,6.694-4.024c1.604-1.577,2.878-3.162,3.607-4.404   c0.733,0.481,1.609,0.762,2.552,0.762c0.544,0,1.065-0.093,1.55-0.265c7.364,6.527,11.731,13.346,13.623,16.703   c-1.208,2.127-1.902,4.585-1.902,7.207c0,2.149,0.468,4.19,1.301,6.028c-2.831,6.402-9.692,13.961-13.189,17.576   c-0.437-0.134-0.901-0.208-1.383-0.208c-0.856,0-1.657,0.231-2.347,0.635c-0.74-1.254-2.202-2.936-4.065-4.59   c-3.138-2.784-6.224-4.429-6.894-3.673c-0.671,0.755,1.33,3.623,4.467,6.408c1.792,1.589,3.565,2.805,4.883,3.418   c-0.447,0.714-0.705,1.558-0.705,2.462c0,2.573,2.087,4.66,4.661,4.66c0.888,0,1.717-0.248,2.423-0.679   c0.803,1.181,2.118,2.638,3.737,4.075c3.137,2.783,6.223,4.427,6.894,3.673c0.67-0.756-1.331-3.624-4.468-6.409   c-1.597-1.415-3.179-2.536-4.438-3.196c0.327-0.638,0.513-1.359,0.513-2.124c0-0.51-0.083-1-0.234-1.459   c6.561-7.419,13.409-11.791,16.693-13.64c2.025,1.063,4.33,1.665,6.775,1.665c2.465,0,4.785-0.612,6.823-1.688   c6.436,3.255,13.808,10.456,17.066,13.828c-0.118,0.411-0.183,0.845-0.183,1.294c0,0.798,0.2,1.55,0.555,2.207   c-1.233,0.737-2.793,2.007-4.345,3.595c-2.932,3-4.724,6.003-4.001,6.709c0.723,0.705,3.685-1.155,6.615-4.154   c1.522-1.558,2.735-3.116,3.45-4.354c0.697,0.417,1.513,0.657,2.386,0.657c2.573,0,4.658-2.087,4.658-4.66   c0-0.783-0.192-1.521-0.534-2.167c1.278-0.696,2.984-2.051,4.682-3.787c2.931-3.001,4.724-6.004,4-6.71   c-0.722-0.706-3.684,1.156-6.615,4.155c-1.639,1.677-2.92,3.354-3.606,4.631c-0.74-0.493-1.629-0.782-2.584-0.782   c-0.535,0-1.048,0.092-1.525,0.257c-7.58-7.034-11.858-14.328-13.539-17.579c0.847-1.85,1.322-3.906,1.322-6.074   c0-2.266-0.516-4.412-1.437-6.327C66.084,36.995,73.9,29.259,77.06,26.28c0.343,0.08,0.698,0.123,1.064,0.123   c1.011,0,1.946-0.323,2.71-0.87c0.808,1.198,2.212,2.719,3.958,4.208c3.191,2.722,6.31,4.306,6.964,3.538   C92.411,32.51,90.354,29.681,87.165,26.958z M21.593,22.73c-0.579,0-1.048-0.47-1.048-1.049c0-0.579,0.47-1.049,1.048-1.049   c0.58,0,1.05,0.47,1.05,1.049C22.643,22.26,22.173,22.73,21.593,22.73z M21.644,79.074c-0.579,0-1.049-0.47-1.049-1.049   s0.47-1.05,1.049-1.05c0.58,0,1.05,0.471,1.05,1.05S22.224,79.074,21.644,79.074z M77.786,77.061c0.58,0,1.05,0.471,1.05,1.049   c0,0.58-0.47,1.051-1.05,1.051c-0.579,0-1.048-0.471-1.048-1.051C76.738,77.531,77.207,77.061,77.786,77.061z M78.159,22.73   c-0.58,0-1.05-0.47-1.05-1.049c0-0.58,0.47-1.05,1.05-1.05c0.579,0,1.048,0.47,1.048,1.05C79.207,22.26,78.738,22.73,78.159,22.73z   ",
                        anchor: {
                            x: 50,
                            y: 50
                        },
                        scale: 0.5,
                        fillColor: "gray",
                        fillOpacity: 0.8,
                        strokeWeight: 2,
                        rotation: heading
                    }
                });

                marker.setPosition(newLatLon);
                map.panTo(newLatLon);
            }
        }

        this.render = function (element) {

            $(element).height(420);
            $(element).width(600);

            function initializeMap() {
                var default_location = new google.maps.LatLng(37.235, -115.811111);

                var mapOptions = {
                    zoom: 18,  // get in real close
                    center: default_location,
                    disableDefaultUI: true,
                    draggable: false
                };

                map = new google.maps.Map(element, mapOptions);

                google.maps.event.addDomListener(element, 'mouseenter', function (e) {
                    e.cancelBubble = true;
                    if (!map.hover) {
                        map.hover = true;
                        map.setOptions({zoomControl: true});
                    }
                });

                google.maps.event.addDomListener(element, 'mouseleave', function (e) {
                    if (map.hover) {
                        map.setOptions({zoomControl: false});
                        map.hover = false;
                    }
                });

                // add marker
                marker = new google.maps.Marker({
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 6,
                        fillColor: "gray",
                        fillOpacity: 0.8,
                        strokeWeight: 2
                    }
                });

                // add path tracking
                poly = new google.maps.Polyline({
                    map: map,
                    clickable: false,
                    strokeColor: "gray",
                    strokeOpacity: 0.8,
                    strokeWeight: 2
                });

                path = poly.getPath();

                updatePosition();
            }

            if (window.google && window.google.maps) {
                initializeMap();
            }
            else {
                window.gmap_initialize = initializeMap;
                head.js("https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=geometry&callback=gmap_initialize");
            }
        }

        this.onSettingsChanged = function (newSettings) {
            if (!_.isUndefined(poly)) {
                currentSettings = newSettings;
                poly.setVisible(currentSettings.show_path); // toggle path visiblity
            }
            else {
                currentSettings = newSettings;
            }
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (newValue.lat && newValue.lon) {
                currentPosition = newValue;
                updatePosition();
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 7;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "google_map",
        display_name: "Google Map",
        fill_size: true,
        settings: [
            {
                name: "position",
                display_name: "Position",
                type: "calculated"
            },
            {
                name: "show_path",
                display_name: "Show Path",
                type: "boolean"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new googleMapWidget(settings));
        }
    });

    freeboard.addStyle('.html-widget', "white-space:normal;width:100%;height:100%");

    var htmlWidget = function (settings) {
        var self = this;
        var htmlElement = $('<div class="html-widget"></div>');
        var currentSettings = settings;

        this.render = function (element) {
            $(element).append(htmlElement);
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "html") {
                htmlElement.html(newValue);
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return Number(currentSettings.height);
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        "type_name": "html",
        "display_name": "HTML",
        "fill_size": true,
        "settings": [
            {
                "name": "html",
                "display_name": "HTML",
                "type": "calculated",
                "description": "Can be literal HTML, or javascript that outputs HTML."
            },
            {
                "name": "height",
                "display_name": "Height Blocks",
                "type": "number",
                "default_value": 4,
                "description": "A height block is around 60 pixels"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new htmlWidget(settings));
        }
    });

}());

//
// Plugin for artificial horizon widget
//
//

(function() {
    var widgetID = 0;

    var artificialHorizonWidget = function (settings) {
        var self = this;
        var currentSettings = settings;

        var thisID = "artificial-horizon-" + widgetID++;
        var widgetElement = $('<canvas width="620px" height="430px" id="' + thisID + '"></canvas>');

        var width, height;

        var context = null;
        var pitch = 0;
        var roll = 0;

        // global formatting
        var skyColor = "#7295B3";
        var groundColor = "#A5693F";
        var lineColor = "#ffffff";
        var planeColor = "black";
        var lineWidth = 3;

        /* return the horizon */
        function getHorizon_(angle) {
            var radius = Math.min(width, height) / 2.0;
            return Math.sin(angle) * radius;
        }

        /* draw horizontal divisions for pitch */
        function drawPitchRung_(pitchAngle, length) {
            context.lineWidth = lineWidth;
            context.strokeStyle = lineColor;

            // above horizon
            var horizon = getHorizon_(pitch + pitchAngle * Math.PI / 180);
            context.beginPath();
            context.moveTo(-length / 2, horizon);
            context.lineTo(length / 2, horizon);
            context.stroke();

            // below horizon
            horizon = getHorizon_(pitch - pitchAngle * Math.PI / 180);
            context.beginPath();
            context.moveTo(-length / 2, horizon);
            context.lineTo(length / 2, horizon);
            context.stroke();
        }

        /* draw radial divisions for roll */
        function drawRollRung_(theta, length, radius) {
            var cos = Math.cos(theta);
            var sin = Math.sin(theta);

            context.lineWidth = lineWidth;
            context.strokeStyle = lineColor;

            context.beginPath();
            context.moveTo(cos * (radius - 1.5), sin * (radius - 1.5));
            context.lineTo(cos * (radius + length), sin * (radius + length));
            context.stroke();
        }

        /* draw arrows along angular division */
        function drawTriangle_(theta, length, radius, filled) {
            var cos = Math.cos(theta);
            var sin = Math.sin(theta);
            var phi = 2 * Math.PI / 180;

            context.lineWidth = lineWidth;
            context.strokeStyle = lineColor;

            context.beginPath();
            context.moveTo(radius * Math.cos(theta), radius * Math.sin(theta));
            context.lineTo((radius + length) * Math.cos(theta + phi), (radius + length) * Math.sin(theta + phi));
            context.lineTo((radius + length) * Math.cos(theta - phi), (radius + length) * Math.sin(theta - phi));
            context.lineTo(radius * Math.cos(theta), radius * Math.sin(theta));
            context.stroke();

            if (filled) {
                context.fillStyle = lineColor;
                context.fill();
            }
        }

        /* draw the artificial horizon widget */
        function drawWidget() {

            // clear the canvas
            context.clearRect(-width, -height, width * 2, height * 2 );
            context.save();

            // Clip everything to a box that is width x height.  We draw the
            // ground and sky as rects that extend beyond those dimensons so
            // that there are no gaps when they're rotated.
            context.beginPath();
            context.rect(-width / 2, -height / 2, width, height);
            context.clip();

            context.rotate(-roll);

            var radius = Math.min(width, height) / 2.0;
            var horizon = getHorizon_(pitch);

            // draw the ground
            context.fillStyle = groundColor;
            context.strokeStyle = lineColor;
            context.lineWidth = lineWidth;
            context.beginPath();
            context.rect(-width, horizon, width * 2, height);
            context.fill();

            // draw the sky
            context.fillStyle = skyColor;
            context.beginPath();
            context.rect(-width, -height, width * 2, height + horizon);
            context.fill();

            // draw the horizon line
            context.lineWidth = lineWidth;
            context.beginPath();
            context.moveTo(-width, horizon);
            context.lineTo(width * 2, horizon);
            context.stroke();

            // draw the pitch ladder
            drawPitchRung_(30, width * 0.3);
            drawPitchRung_(25, width * 0.05);
            drawPitchRung_(20, width * 0.2);
            drawPitchRung_(15, width * 0.05);
            drawPitchRung_(10, width * 0.1);
            drawPitchRung_(5, width * 0.05);

            // draw the roll indicator
            var rollRadius = radius * 0.9;
            context.beginPath();
            context.arc(0, 0, rollRadius, 210 * Math.PI / 180.0, 330 * Math.PI / 180.0, false);
            context.stroke();

            // TODO; calculate these from width/height

            drawRollRung_(210 * Math.PI / 180, 15, rollRadius);
            drawRollRung_(220 * Math.PI / 180, 10, rollRadius);
            drawRollRung_(230 * Math.PI / 180, 15, rollRadius);
            drawRollRung_(240 * Math.PI / 180, 10, rollRadius);
            drawRollRung_(250 * Math.PI / 180, 10, rollRadius);
            drawRollRung_(260 * Math.PI / 180, 10, rollRadius);
            drawTriangle_(270 * Math.PI / 180, 15, rollRadius, true);
            drawRollRung_(280 * Math.PI / 180, 10, rollRadius);
            drawRollRung_(290 * Math.PI / 180, 10, rollRadius);
            drawRollRung_(300 * Math.PI / 180, 10, rollRadius);
            drawRollRung_(310 * Math.PI / 180, 15, rollRadius);
            drawRollRung_(320 * Math.PI / 180, 10, rollRadius);
            drawRollRung_(330 * Math.PI / 180, 15, rollRadius);

            // undo the roll rotation so we can draw the plane figure over the rotated elements
            context.restore();

            // TODO; calculate these from width/height

            drawTriangle_(270 * Math.PI / 180, -15, rollRadius, false);

            // draw the plane
            context.strokeStyle = planeColor;
            context.lineWidth = lineWidth * 2;
            context.beginPath();

            // TODO; calculate these from width/height

            context.moveTo(-55, -1);
            context.lineTo(-20, -1);
            context.lineTo(-10, 10);
            context.stroke();
            context.beginPath();
            context.moveTo(55, -1);
            context.lineTo(20, -1);
            context.lineTo(10, 10);
            context.stroke();

            return;
        }

        this.render = function (element) {
            $(element).append(widgetElement);

            roll = _.isUndefined(currentSettings.roll) ? 0 : currentSettings.roll * Math.PI / 180;
            pitch = _.isUndefined(currentSettings.pitch) ? 0 : currentSettings.pitch * Math.PI / 180;

            var canvas = document.getElementById(thisID);

            // suppport high-dpi screens
            if (!context && window.devicePixelRatio) {
                width = $(canvas).width();
                height = $(canvas).height();

                /// TODO better support for scaling
                /// get the width and make height = 7 if col = 2, height = 3 if col = 1

                $(canvas).attr('width', width * window.devicePixelRatio);
                $(canvas).attr('height', height * window.devicePixelRatio);
                $(canvas).css('width', width);
                $(canvas).css('height', height);

                context = canvas.getContext("2d");
                context.scale(window.devicePixelRatio, window.devicePixelRatio);
                context.translate(width / 2, height / 2);  // translate to center
            }

            drawWidget();
        }

        this.onSettingsChanged = function (newSettings) {
            if (newSettings.roll != currentSettings.roll || newSettings.pitch != currentSettings.pitch) {
                currentSettings = newSettings;
                roll = _.isUndefined(currentSettings.roll) ? 0 : currentSettings.roll * Math.PI / 180;
                pitch = _.isUndefined(currentSettings.pitch) ? 0 : currentSettings.pitch * Math.PI / 180;

                drawWidget();
            }
            else {
                currentSettings = newSettings;
            }
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (!_.isUndefined(context)) {
                // redraw if roll changes
                if (settingName === "roll") {
                    roll = _.isUndefined(newValue) ? 0 : newValue * Math.PI / 180;
                    drawWidget();
                }

                // redraw if pitch changes
                else if (settingName === "pitch") {
                    pitch = _.isUndefined(newValue) ? 0 : newValue * Math.PI / 180;
                    drawWidget();
                }
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {

            // TODO; make this more flexible
            return 7;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "artificial-horizon",
        display_name: "Artificial Horizon",
        fill_size: true,
        settings: [
            {
                name: "roll",
                display_name: "Roll",
                type: "calculated",
                default_value: 0
            },
            {
                name: "pitch",
                display_name: "Pitch",
                type: "calculated",
                default_value: 0
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new artificialHorizonWidget(settings));
        }
    });
}());

//
// Plugin for horizontal linear gauge
//
//

(function() {
    var gaugeWidget = function (settings) {
        var titleElement = $('<h2 class="section-title"></h2>');
        var gaugeElement = $('<div></div>');

        var self = this;
        var paper = null;
        var gaugeFill = null;
        var width, height;
        var valueText, unitsText;
        var minValueLabel, maxValueLabel;
        //var currentValue = 0;
        //var colors = ["#a9d70b", "#f9c802", "#ff0000"];

        var currentSettings = settings;

        /* get the color for a fill percentage
           these colors match the justGage library for radial guagues */
        function getColor(fillPercent) {
            // mix colors
            // green rgb(169,215,11) #a9d70b
            // yellow rgb(249,200,2) #f9c802
            // red rgb(255,0,0) #ff0000

            if (fillPercent >= 0.5 ) {
                fillPercent = 2 * fillPercent - 1;
                var R = fillPercent * 255 + (1 - fillPercent) * 249;
                var G = fillPercent * 0 + (1 - fillPercent) * 200;
                var B = fillPercent * 0 + (1 - fillPercent) * 2;
            }
            else {
                fillPercent = 2 * fillPercent;
                var R = fillPercent * 249 + (1 - fillPercent) * 169;
                var G = fillPercent * 200 + (1 - fillPercent) * 215;
                var B = fillPercent * 2 + (1 - fillPercent) * 11;
            }

            return "rgb(" + Math.round(R) + "," + Math.round(G) + "," + Math.round(B) + ")"
        }

        self.render = function (element) {
            $(element).append(titleElement.html(currentSettings.title)).append(gaugeElement);

            width = gaugeElement.width();
            height = 160;

            var gaugeWidth = 160;
            var gaugeHeight = 30;

            paper = Raphael(gaugeElement.get()[0], width, height);
            paper.clear();

            var rect = paper.rect(width / 2 - gaugeWidth / 2, height / 3 - gaugeHeight / 2, gaugeWidth, gaugeHeight);
            rect.attr({
                "fill": "#edebeb",
                "stroke": "#edebeb"
            });

            // place min and max labels
            minValueLabel = paper.text(width / 2 - gaugeWidth / 2 - 8, height / 3, currentSettings.min_value);
            maxValueLabel = paper.text(width / 2 + gaugeWidth / 2 + 8, height / 3, currentSettings.max_value);

            minValueLabel.attr({
                "font-family": "arial",
                "font-size": "16",
                "fill": "#b3b3b3",
                "text-anchor": "end"
            });

            maxValueLabel.attr({
                "font-family": "arial",
                "font-size": "16",
                "fill": "#b3b3b3",
                "text-anchor": "start"
            });

            // place units and value
            var units = _.isUndefined(currentSettings.units) ? "" : currentSettings.units;

            valueText = paper.text(width / 2, height * 2 / 3, "");
            unitsText = paper.text(width / 2, height * 2 / 3 + 20, units);

            valueText.attr({
                "font-family": "arial",
                "font-size": "25",
                "font-weight": "bold",
                "fill": "#d3d4d4",
                "text-anchor": "middle"
            });

            unitsText.attr({
                "font-family": "arial",
                "font-size": "16",
                "font-weight": "normal",
                "fill": "#b3b3b3",
                "text-anchor": "middle"
            });

            // fill to 0 percent
            gaugeFill = paper.rect(width / 2 - gaugeWidth / 2, height / 3 - gaugeHeight / 2, 0, gaugeHeight);
        }

        self.onSettingsChanged = function (newSettings) {
            if (newSettings.units != currentSettings.units || newSettings.min_value != currentSettings.min_value || newSettings.max_value != currentSettings.max_value) {
                currentSettings = newSettings;
                var units = _.isUndefined(currentSettings.units) ? "" : currentSettings.units;
                var min = _.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value;
                var max = _.isUndefined(currentSettings.max_value) ? 0 : currentSettings.max_value;

                unitsText.attr({"text": units});
                minValueLabel.attr({"text": min});
                maxValueLabel.attr({"text": max});
            }
            else {
                currentSettings = newSettings;
            }

            titleElement.html(newSettings.title);
        }

        self.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName === "value") {
                if (!_.isUndefined(gaugeFill) && !_.isUndefined(valueText)) {

                    newValue = _.isUndefined(newValue) ? 0 : newValue;
                    var fillVal = 160 * (newValue - currentSettings.min_value)/(currentSettings.max_value - currentSettings.min_value);

                    fillVal = fillVal > 160 ? 160 : fillVal;
                    fillVal = fillVal < 0 ? 0 : fillVal;

                    var fillColor = getColor(fillVal / 160);

                    gaugeFill.animate({"width": fillVal, "fill": fillColor, "stroke": fillColor}, 500, ">");
                    valueText.attr({"text": newValue});
                }
            }
        }

        self.onDispose = function () {
        }

        self.getHeight = function () {
            return 3;
        }

    };

    freeboard.loadWidgetPlugin({
        type_name: "horizontal-linear-gauge",
        display_name: "Horizontal Linear Gauge",
        "external_scripts" : [
            "plugins/thirdparty/raphael.2.1.0-custom.js",
            "plugins/thirdparty/colormix.2.0.0.min.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "units",
                display_name: "Units",
                type: "text"
            },
            {
                name: "min_value",
                display_name: "Minimum",
                type: "number",
                default_value: 0
            },
            {
                name: "max_value",
                display_name: "Maximum",
                type: "number",
                default_value: 100
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new gaugeWidget(settings));
        }
    });
}());

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

//
// Plugin for vertical linear gauge
//
//

(function() {
    var gaugeWidget = function (settings) {
        var titleElement = $('<h2 class="section-title"></h2>');
        var gaugeElement = $('<div></div>');

        var self = this;
        var paper = null;
        var gaugeFill = null;
        var rect;
        var width, height;
        var valueText, unitsText;
        var minValueLabel, maxValueLabel;
        //var currentValue = 0;
        //var colors = ["#a9d70b", "#f9c802", "#ff0000"];

        var currentSettings = settings;

        /* get the color for a fill percentage
           these colors match the justGage library for radial guagues */
        function getColor(fillPercent) {
            // mix colors
            // green rgb(169,215,11) #a9d70b
            // yellow rgb(249,200,2) #f9c802
            // red rgb(255,0,0) #ff0000

            if (fillPercent >= 0.5 ) {
                fillPercent = 2 * fillPercent - 1;
                var R = fillPercent * 255 + (1 - fillPercent) * 249;
                var G = fillPercent * 0 + (1 - fillPercent) * 200;
                var B = fillPercent * 0 + (1 - fillPercent) * 2;
            }
            else {
                fillPercent = 2 * fillPercent;
                var R = fillPercent * 249 + (1 - fillPercent) * 169;
                var G = fillPercent * 200 + (1 - fillPercent) * 215;
                var B = fillPercent * 2 + (1 - fillPercent) * 11;
            }

            return "rgb(" + Math.round(R) + "," + Math.round(G) + "," + Math.round(B) + ")"
        }

        self.render = function (element) {
            $(element).append(titleElement.html(currentSettings.title)).append(gaugeElement);

            width = gaugeElement.width();
            height = 160;

            var gaugeWidth = 30;
            var gaugeHeight = 120;

            paper = Raphael(gaugeElement.get()[0], width, height);
            paper.clear();

            rect = paper.rect(width / 3 - gaugeWidth / 2, height / 2 - gaugeHeight / 2, gaugeWidth, gaugeHeight);
            rect.attr({
                "fill": "#edebeb",
                "stroke": "#edebeb"
            });

            // place min and max labels
            minValueLabel = paper.text(width / 3, height / 2 + gaugeHeight / 2 + 14, currentSettings.min_value);
            maxValueLabel = paper.text(width / 3, height / 2 - gaugeHeight / 2 - 14, currentSettings.max_value);

            minValueLabel.attr({
                "font-family": "arial",
                "font-size": "10",
                "fill": "#b3b3b3",
                "text-anchor": "middle"
            });

            maxValueLabel.attr({
                "font-family": "arial",
                "font-size": "10",
                "fill": "#b3b3b3",
                "text-anchor": "middle"
            });

            // place units and value
            var units = _.isUndefined(currentSettings.units) ? "" : currentSettings.units;

            valueText = paper.text(width * 2 / 3, height / 2 - 10, "");
            unitsText = paper.text(width * 2 / 3, height / 2 + 10, units);

            valueText.attr({
                "font-family": "arial",
                "font-size": "25",
                "font-weight": "bold",
                "fill": "#d3d4d4",
                "text-anchor": "middle"
            });

            unitsText.attr({
                "font-family": "arial",
                "font-size": "10",
                "font-weight": "normal",
                "fill": "#b3b3b3",
                "text-anchor": "middle"
            });

            // fill to 0 percent
            gaugeFill = paper.rect(width / 3 - gaugeWidth / 2, height / 2 - gaugeHeight / 2, gaugeWidth, 0);
            gaugeFill.attr({
                "fill": "#edebeb",
                "stroke": "#edebeb"
            });
        }

        self.onSettingsChanged = function (newSettings) {
            if (newSettings.units != currentSettings.units || newSettings.min_value != currentSettings.min_value || newSettings.max_value != currentSettings.max_value) {
                currentSettings = newSettings;
                var units = _.isUndefined(currentSettings.units) ? "" : currentSettings.units;
                var min = _.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value;
                var max = _.isUndefined(currentSettings.max_value) ? 0 : currentSettings.max_value;

                unitsText.attr({"text": units});
                minValueLabel.attr({"text": min});
                maxValueLabel.attr({"text": max});
            }
            else {
                currentSettings = newSettings;
            }

            titleElement.html(newSettings.title);
        }

        self.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName === "value") {
                if (!_.isUndefined(gaugeFill) && !_.isUndefined(valueText)) {

                    newValue = _.isUndefined(newValue) ? 0 : newValue;
                    var fillVal = 120 * (newValue - currentSettings.min_value)/(currentSettings.max_value - currentSettings.min_value);

                    fillVal = fillVal > 120 ? 120 : fillVal;
                    fillVal = fillVal < 0 ? 0 : fillVal;

                    var fillColor = getColor(fillVal / 120);

                    // animate like radial gauges
                    gaugeFill.animate({"height": 120 - fillVal, "fill": "#edebeb", "stroke": "#edebeb"}, 500, ">");
                    rect.animate({"fill": fillColor, "stroke": fillColor });

                    valueText.attr({"text": newValue});
                }
            }
        }

        self.onDispose = function () {
        }

        self.getHeight = function () {
            return 3;
        }

    };

    freeboard.loadWidgetPlugin({
        type_name: "vertical-linear-gauge",
        display_name: "Vertical Linear Gauge",
        "external_scripts" : [
            "plugins/thirdparty/raphael.2.1.0-custom.js",
            "plugins/thirdparty/colormix.2.0.0.min.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "units",
                display_name: "Units",
                type: "text"
            },
            {
                name: "min_value",
                display_name: "Minimum",
                type: "number",
                default_value: 0
            },
            {
                name: "max_value",
                display_name: "Maximum",
                type: "number",
                default_value: 100
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new gaugeWidget(settings));
        }
    });
}());
