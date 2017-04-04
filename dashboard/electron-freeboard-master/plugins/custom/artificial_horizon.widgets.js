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
