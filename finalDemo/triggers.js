


function getListOfTriggers(){

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("POST", url+"/triggers", true);
    xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xmlHttp.addEventListener("load", function(event){
        var data = JSON.parse(event.target.responseText);
        if(!data.success) {console.log("cannot get the triggers");} 
        console.log("triggers queried: " + data.success);
    },false);
    xmlHttp.send();
}

function listTriggers(data){
    for(var i = 0; i < dataSample.triggers.length; ++i){
        var triggersTable = document.getElementById("TriggersTable");
        var row = document.createElement("tr");
        var number = document.createElement("td"
    }
}


var dataSample = { 
    "success": true, 
    "triggers": [ 
        { 
            "comparator": "eq", 
            "id": 12, 
            "iotRuleName": "12", 
            "message": "Its hot!", 
            "property": "temperature", 
            "snsTopic": "arn:aws:sns:us-east-1:845043522277:12", 
            "targets": [ 
                { "address": "ejvaughan@gmail.com", 
                   "id": 13, 
                   "snsSubscription": "pending confirmation", 
                   "type": "email" 
                } 
            ], 
            "thingID": 1, 
            "value": 50.0 
        }, 
        { 
            "comparator": "eq", 
            "id": 13, 
            "iotRuleName": "13", 
            "message": "The world is on fire. Rip global warming.", 
            "property": "temperature", 
            "snsTopic": "arn:aws:sns:us-east-1:845043522277:13", 
            "targets": [ 
                { "address": "+16369807492", 
                    "id": 14, 
                    "snsSubscription": "arn:aws:sns:us-east-1:845043522277:13:9e7f294a-783e-44b6-ba49-94b4f1fee462", 
                    "type": "sms" 
                } 
            ], 
            "thingID": 1, 
            "value": 40.0 
        } 
    ] 
};
