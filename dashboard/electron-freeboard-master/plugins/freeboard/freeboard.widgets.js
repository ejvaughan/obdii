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
