// Instantiate the AWS SDK and configuration objects.  The AWS SDK for 
// JavaScript (aws-sdk) is used for Cognito Identity/Authentication, and 
// the AWS IoT SDK for JavaScript (aws-iot-device-sdk) is used for the
// WebSocket connection to AWS IoT and device shadow APIs.
// 
var AWS = require('aws-sdk');
var AWSIoTData = require('aws-iot-device-sdk');
var AWSConfiguration = require('./aws-configuration.js');

console.log('Loaded AWS SDK for JavaScript and AWS IoT SDK for Node.js');

//subscribed topic.
var currentlySubscribedTopic = '$aws/things/PiCarHacking/shadow/update';

//shadow status and all variables.
var shadowStatus = '';
var ENGINERPM = 0;
var SPEED = 0;

// Create a client id to use when connecting to AWS IoT.
var clientId = 'cse521s-CarHacking' + (Math.floor((Math.random() * 100000) + 1));

// Initialize our configuration.
AWS.config.region = AWSConfiguration.region;

AWS.config.credentials = new AWS.CognitoIdentityCredentials({
   IdentityPoolId: AWSConfiguration.poolId
});

// Create the AWS IoT device object.  Note that the credentials must be 
// initialized with empty strings; when we successfully authenticate to
// the Cognito Identity Pool, the credentials will be dynamically updated.
const mqttClient = AWSIoTData.device({
   // Set the AWS region we will operate in.
   region: AWS.config.region,

   // Use the clientId created earlier.
   clientId: clientId,

   // Connect via secure WebSocket
   protocol: 'wss',
   
   // Set the maximum reconnect time to 8 seconds; this is a browser application
   // so we don't want to leave the user waiting too long for reconnection after
   // re-connecting to the network/re-opening their laptop/etc...
   maximumReconnectTimeMs: 8000,
   debug: true, //Enable console debugging information (optional)
   
   // IMPORTANT: the AWS access key ID, secret key, and sesion token must be 
   // initialized with empty strings.
   accessKeyId: '',
   secretKey: '',
   sessionToken: ''
});

// Attempt to authenticate to the Cognito Identity Pool.  Note that this
// example only supports use of a pool which allows unauthenticated 
// identities.
var cognitoIdentity = new AWS.CognitoIdentity();
AWS.config.credentials.get(function(err, data) {
   if (!err) {
      console.log('retrieved identity: ' + AWS.config.credentials.identityId);
      var params = {
         IdentityId: AWS.config.credentials.identityId
      };
      cognitoIdentity.getCredentialsForIdentity(params, function(err, data) {
         if (!err) {
            //
            // Update our latest AWS credentials; the MQTT client will use these
            // during its next reconnect attempt.
            //
            mqttClient.updateWebSocketCredentials(data.Credentials.AccessKeyId,
               data.Credentials.SecretKey,
               data.Credentials.SessionToken);
         } else {
            console.log('error retrieving credentials: ' + err);
            alert('error retrieving credentials: ' + err);
         }
      });
   } else {
      console.log('error retrieving identity:' + err);
      alert('error retrieving identity: ' + err);
   }
});

// Connect handler; update div visibility and fetch latest shadow documents.
// Subscribe to lifecycle events on the first connect event.
window.mqttClientConnectHandler = function() {
   console.log('connect');
   shadowStatus = '';
   mqttClient.subscribe(currentlySubscribedTopic);   // Subscribe to our current topic.
};

// Reconnect handler; update div visibility.
window.mqttClientReconnectHandler = function() {
   console.log('reconnect');
};

// Utility function to determine if a value has been defined.
window.isUndefined = function(value) {
   return typeof value === 'undefined' || typeof value === null;
};

// Message handler for lifecycle events; create/destroy divs as clients
// connect/disconnect.
var mqttClientMessageHandler = function(topic, payload) {
   var tmp = payload.toString().trim();
   tmp = tmp.substring(0, tmp.length - 1);
   shadowStatus = JSON.parse(tmp);
   ENGINERPM = shadowStatus.state.reported.temperature;
   SPEED = shadowStatus.state.reported.temperature;

   console.log('message: ' + ENGINERPM);
};

// Install connect/reconnect event handlers.
mqttClient.on('connect', window.mqttClientConnectHandler);
mqttClient.on('reconnect', window.mqttClientReconnectHandler);
mqttClient.on('message', mqttClientMessageHandler);








// # Building a Freeboard Plugin
//
// A freeboard plugin is simply a javascript file that is loaded into a web page after the main freeboard.js file is loaded.
//
// Let's get started with an example of a datasource plugin and a widget plugin.
//
// -------------------
// Best to encapsulate your plugin in a closure, although not required.
(function()
{
	// ## A Datasource Plugin
	//
	// -------------------
	// ### Datasource Definition
	//
	// -------------------
	// **freeboard.loadDatasourcePlugin(definition)** tells freeboard that we are giving it a datasource plugin. It expects an object with the following:
	freeboard.loadDatasourcePlugin({
		// **type_name** (required) : A unique name for this plugin. This name should be as unique as possible to avoid collisions with other plugins, and should follow naming conventions for javascript variable and function declarations.
		"type_name"   : "cse521s_car",
		// **display_name** : The pretty name that will be used for display purposes for this plugin. If the name is not defined, type_name will be used instead.
		"display_name": "car",
        // **description** : A description of the plugin. This description will be displayed when the plugin is selected or within search results (in the future). The description may contain HTML if needed.
        "description" : "Some sort of description <strong>with optional html!</strong>",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.
		"external_scripts" : [
			"http://mydomain.com/myscript1.js",
		    "http://mydomain.com/myscript2.js"
		],
		// **settings** : An array of settings that will be displayed for this plugin when the user adds it.
		"settings"    : [
			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name"         : "name",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name" : "Name",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type"         : "text",
				// **default_value** : A default value for this setting.
				"default_value": "CarHacking",
				// **description** : Text that will be displayed below the setting to give the user any extra information.
				"description"  : "This is pretty self explanatory...",
                // **required** : If set to true, the field will be required to be filled in by the user. Defaults to false if not specified.
                "required" : true
			},
            {
                "name"         : "refresh_time",
                "display_name" : "Refresh Time",
                "type"         : "text",
                "description"  : "In milliseconds",
                "default_value": 1000
            }
		],
		// **newInstance(settings, newInstanceCallback, updateCallback)** (required) : A function that will be called when a new instance of this plugin is requested.
		// * **settings** : A javascript object with the initial settings set by the user. The names of the properties in the object will correspond to the setting names defined above.
		// * **newInstanceCallback** : A callback function that you'll call when the new instance of the plugin is ready. This function expects a single argument, which is the new instance of your plugin object.
		// * **updateCallback** : A callback function that you'll call if and when your datasource has an update for freeboard to recalculate. This function expects a single parameter which is a javascript object with the new, updated data. You should hold on to this reference and call it when needed.
		newInstance   : function(settings, newInstanceCallback, updateCallback)
		{
			// myDatasourcePlugin is defined below.
			newInstanceCallback(new myDatasourcePlugin(settings, updateCallback));
		}
	});


	// ### Datasource Implementation
	//
	// -------------------
	// Here we implement the actual datasource plugin. We pass in the settings and updateCallback.
	var myDatasourcePlugin = function(settings, updateCallback)
	{
		// Always a good idea...
		var self = this;

		// Good idea to create a variable to hold on to our settings, because they might change in the future. See below.
		var currentSettings = settings;

		/* This is some function where I'll get my data from somewhere */
		function getData()
		{
			var newData = {engineRPM : ENGINERPM, speed : SPEED}; // Just putting some sample data in for fun.

			/* Get my data from somewhere and populate newData with it... Probably a JSON API or something. */
			/* ... */

			// I'm calling updateCallback to tell it I've got new data for it to munch on.
			updateCallback(newData);
		}

		// You'll probably want to implement some sort of timer to refresh your data every so often.
		var refreshTimer;

		function createRefreshTimer(interval)
		{
			if(refreshTimer)
			{
				clearInterval(refreshTimer);
			}

			refreshTimer = setInterval(function()
			{
				// Here we call our getData function to update freeboard with new data.
				getData();
			}, interval);
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
			// Probably a good idea to get rid of our timer.
			clearInterval(refreshTimer);
			refreshTimer = undefined;
		}

		// Here we call createRefreshTimer with our current settings, to kick things off, initially. Notice how we make use of one of the user defined settings that we setup earlier.
		createRefreshTimer(currentSettings.refresh_time);
	}


	// ## A Widget Plugin
	//
	// -------------------
	// ### Widget Definition
	//
	// -------------------
	// **freeboard.loadWidgetPlugin(definition)** tells freeboard that we are giving it a widget plugin. It expects an object with the following:
	freeboard.loadWidgetPlugin({
		// Same stuff here as with datasource plugin.
		"type_name"   : "my_widget_plugin",
		"display_name": "Widget Plugin Example",
        "description" : "Some sort of description <strong>with optional html!</strong>",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.
		"external_scripts": [
			"http://mydomain.com/myscript1.js", "http://mydomain.com/myscript2.js"
		],
		// **fill_size** : If this is set to true, the widget will fill be allowed to fill the entire space given it, otherwise it will contain an automatic padding of around 10 pixels around it.
		"fill_size" : false,
		"settings"    : [
			{
				"name"        : "the_text",
				"display_name": "Some Text",
				// We'll use a calculated setting because we want what's displayed in this widget to be dynamic based on something changing (like a datasource).
				"type"        : "calculated"
			},
			{
				"name"        : "size",
				"display_name": "Size",
				"type"        : "option",
				"options"     : [
					{
						"name" : "Regular",
						"value": "regular"
					},
					{
						"name" : "Big",
						"value": "big"
					}
				]
			}
		],
		// Same as with datasource plugin, but there is no updateCallback parameter in this case.
		newInstance   : function(settings, newInstanceCallback)
		{
			newInstanceCallback(new myWidgetPlugin(settings));
		}
	});

	// ### Widget Implementation
	//
	// -------------------
	// Here we implement the actual widget plugin. We pass in the settings;
	var myWidgetPlugin = function(settings)
	{
		var self = this;
		var currentSettings = settings;

		// Here we create an element to hold the text we're going to display. We're going to set the value displayed in it below.
		var myTextElement = $("<span></span>");

		// **render(containerElement)** (required) : A public function we must implement that will be called when freeboard wants us to render the contents of our widget. The container element is the DIV that will surround the widget.
		self.render = function(containerElement)
		{
			// Here we append our text element to the widget container element.
			$(containerElement).append(myTextElement);
		}

		// **getHeight()** (required) : A public function we must implement that will be called when freeboard wants to know how big we expect to be when we render, and returns a height. This function will be called any time a user updates their settings (including the first time they create the widget).
		//
		// Note here that the height is not in pixels, but in blocks. A block in freeboard is currently defined as a rectangle that is fixed at 300 pixels wide and around 45 pixels multiplied by the value you return here.
		//
		// Blocks of different sizes may be supported in the future.
		self.getHeight = function()
		{
			if(currentSettings.size == "big")
			{
				return 2;
			}
			else
			{
				return 1;
			}
		}

		// **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
		self.onSettingsChanged = function(newSettings)
		{
			// Normally we'd update our text element with the value we defined in the user settings above (the_text), but there is a special case for settings that are of type **"calculated"** -- see below.
			currentSettings = newSettings;
		}

		// **onCalculatedValueChanged(settingName, newValue)** (required) : A public function we must implement that will be called when a calculated value changes. Since calculated values can change at any time (like when a datasource is updated) we handle them in a special callback function here.
		self.onCalculatedValueChanged = function(settingName, newValue)
		{
			// Remember we defined "the_text" up above in our settings.
			if(settingName == "the_text")
			{
				// Here we do the actual update of the value that's displayed in on the screen.
				$(myTextElement).html(newValue);
			}
		}

		// **onDispose()** (required) : Same as with datasource plugins.
		self.onDispose = function()
		{
		}
	}
}());
