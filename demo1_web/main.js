"use strict";
import v4 from 'aws-signature-v4';
import crypto from 'crypto';
import MqttClient from './node_modules/mqtt/lib/client';
import websocket from 'websocket-stream';

const AWS_ACCESS_KEY = 'AKIAJN5RHGS7RIWUSPPA';
const AWS_SECRET_ACCESS_KEY = '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';
const AWS_IOT_ENDPOINT_HOST = 'a3njfwjv658nn4.iot.us-east-1.amazonaws.com';
const MQTT_TOPIC = '$aws/things/PiCarHacking/shadow/update';

var client;
$('#rpm').hide();
$('#progress').hide();
document.getElementById('connect').addEventListener('click', () => {
    $('#connect').hide(); // hide the connect button to avoid over connecting
    $('#rpm').show();
    $('#progress').show();
    client = new MqttClient(() => {
        var url = v4.createPresignedURL(
            'GET',
            AWS_IOT_ENDPOINT_HOST.toLowerCase(),
            '/mqtt',
            'iotdevicegateway',
            crypto.createHash('sha256').update('', 'utf8').digest('hex'),
            {
                'key': AWS_ACCESS_KEY,
                'secret': AWS_SECRET_ACCESS_KEY,
                'protocol': 'wss',
                'expires': 15
            }
        );

        console.log('Connecting to URL: ' + url);
        return websocket(url, [ 'mqttv3.1' ]);
    });

    client.on('connect', () => {
        console.log('Successfully connected to AWS IoT Broker!  :-)');
        client.subscribe(MQTT_TOPIC);
    });

    client.on('close', () => {
        console.log('Failed to connect :-(');
        client.end();  // don't reconnect
        client = undefined;
    });

    client.on('message', (topic, message) => {
        console.log('Incoming message: ' + message.toString());
        var tmp = message.toString().split(":");
        var t =tmp[3].substr(0,6);
        console.log(t);
        updateRPM(t);
    });
});

// function used to update the rpm 
function updateRPM(message){
    console.log(message);
    var rmp = message;
    var width = rmp/68 +"%";
    // update progress bar
    $('#pbar').attr({'aira-valuenow': rmp});
    $('#pbar').css('width', width);
    $('#rpm').text(rmp); 
}

