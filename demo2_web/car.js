(function() {
	// ## A Datasource Plugin
	//
	// -------------------
	// ### Datasource Definition
	//
	// -------------------
	// **freeboard.loadDatasourcePlugin(definition)** tells freeboard that we are giving it a datasource plugin. It expects an object with the following:
	freeboard.loadDatasourcePlugin({
		// **type_name** (required) : A unique name for this plugin. This name should be as unique as possible to avoid collisions with other plugins, and should follow naming conventions for javascript variable and function declarations.
		"type_name"   : "cse521_car",
		// **display_name** : The pretty name that will be used for display purposes for this plugin. If the name is not defined, type_name will be used instead.
		"display_name": "Car",
        // **description** : A description of the plugin. This description will be displayed when the plugin is selected or within search results (in the future). The description may contain HTML if needed.
        "description" : "",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.
		"external_scripts" : [
			"http://mydomain.com/myscript1.js"
		],
		// **settings** : An array of settings that will be displayed for this plugin when the user adds it.
		"settings"    : [
		],
		// **newInstance(settings, newInstanceCallback, updateCallback)** (required) : A function that will be called when a new instance of this plugin is requested.
		// * **settings** : A javascript object with the initial settings set by the user. The names of the properties in the object will correspond to the setting names defined above.
		// * **newInstanceCallback** : A callback function that you'll call when the new instance of the plugin is ready. This function expects a single argument, which is the new instance of your plugin object.
		// * **updateCallback** : A callback function that you'll call if and when your datasource has an update for freeboard to recalculate. This function expects a single parameter which is a javascript object with the new, updated data. You should hold on to this reference and call it when needed.
		"newInstance"   : function(settings, newInstanceCallback, updateCallback)
		{
			// Car is defined below.
			console.log("Creating new car instance");
			newInstanceCallback(new Car(settings, updateCallback));
		}
	});


	// ### Datasource Implementation
	//
	// -------------------
	// Here we implement the actual datasource plugin. We pass in the settings and updateCallback.
	var Car = function(settings, updateCallback)
	{
		// Always a good idea...
		var self = this;

		// Good idea to create a variable to hold on to our settings, because they might change in the future. See below.
		var currentSettings = settings;

		var cognitoIdentity = new AWS.CognitoIdentity();

		//
		// Keep track of whether or not we've registered the shadows used by this
		// example.
		//
		var shadowsRegistered = false;

		//
		// Create the AWS IoT shadows object.  Note that the credentials must be
		// initialized with empty strings; when we successfully authenticate to
		// the Cognito Identity Pool, the credentials will be dynamically updated.
		//
		var shadows = AWSIoTData.thingShadow({
		   //
		   // Set the AWS region we will operate in.
		   //
		   region: AWS.config.region,
		   //
		   // Use a random client ID.
		   //
		   clientId: 'car-browser-' + (Math.floor((Math.random() * 100000) + 1)),
		   //
		   // Connect via secure WebSocket
		   //
		   protocol: 'wss',
		   //
		   // Set the maximum reconnect time to 8 seconds; this is a browser application
		   // so we don't want to leave the user waiting too long for reconnection after
		   // re-connecting to the network/re-opening their laptop/etc...
		   //
		   maximumReconnectTimeMs: 8000,
		   //
		   // Enable console debugging information (optional)
		   //
		   debug: true,
		   //
		   // IMPORTANT: the AWS access key ID, secret key, and sesion token must be
		   // initialized with empty strings.
		   //
		   accessKeyId: '',
		   secretKey: '',
		   sessionToken: ''
		});

		// **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
		self.onSettingsChanged = function(newSettings)
		{
			// Here we update our current settings with the variable that is passed in.
			currentSettings = newSettings;
		};

		// **updateNow()** (required) : A public function we must implement that will be called when the user wants to manually refresh the datasource
		self.updateNow = function()
		{
		};

		// **onDispose()** (required) : A public function we must implement that will be called when this instance of this plugin is no longer needed. Do anything you need to cleanup after yourself here.
		self.onDispose = function()
		{
		};

		self.shadowConnectHandler = function() {
			console.log("connect");

			//
			   // We only register our shadows once.
			   //
			   if (!shadowsRegistered) {
			      shadows.register('PiCarHacking', {
			         persistentSubscribe: true
			      });
			      shadowsRegistered = true;
			   }
			   //
			   // After connecting, wait for a few seconds and then ask for the
			   // current state of the shadow.
			   //
			   setTimeout(function() {
			      var opClientToken = shadows.get('PiCarHacking');
			      if (opClientToken === null) {
			         console.log('operation in progress');
			      }
			   }, 3000);
		};

		self.shadowReconnectHandler = function() {
		   console.log('reconnect');
		};

		// Initialize car instance

		shadows.on('delta', function(name, stateObject) {
			console.log("Received shadow state delta: " + stateObject.state);
			updateCallback(stateObject.state.reported);
		});

		shadows.on('foreignStateChange', function(name, operation, stateObject) {
			console.log("Received shadow state update: " + stateObject.state);
			updateCallback(stateObject.state.reported);
		});

		shadows.on('status', function(name, statusType, clientToken, stateObject) {
		   if (statusType === 'rejected') {
		      //
		      // If an operation is rejected it is likely due to a version conflict;
		      // request the latest version so that we synchronize with the shadow
		      // The most notable exception to this is if the thing shadow has not
		      // yet been created or has been deleted.
		      //
		      if (stateObject.code !== 404) {
		         console.log('resync with thing shadow');
		         var opClientToken = shadows.get(name);
		         if (opClientToken === null) {
		            console.log('operation in progress');
		         }
		      }
		   } else { // statusType === 'accepted'
			      console.log("Received shadow state status update " + stateObject.state);
			   updateCallback(stateObject.state.reported);
		   }
		});

		shadows.on('connect', this.shadowConnectHandler);
		shadows.on('reconnect', this.shadowReconnectHandler);

		//
		// Attempt to authenticate to the Cognito Identity Pool.  Note that this
		// example only supports use of a pool which allows unauthenticated
		// identities.
		//

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
		            shadows.updateWebSocketCredentials(data.Credentials.AccessKeyId,
		               data.Credentials.SecretKey,
		               data.Credentials.SessionToken);
		         } else {
		            console.log('error retrieving credentials: ' + err);
		         }
		      });
		   } else {
		      console.log('error retrieving identity:' + err);
		   }
		});
	};
}());
