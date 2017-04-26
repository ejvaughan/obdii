# Backend API

All requests are made to the following endpoint:

`http://car.ejvaughan.com`

## Creating an account:

`curl http://car.ejvaughan.com/register --data-urlencode email=<email address> --data-urlencode password=<password> -c cookies`

Example JSON response:

```json
{
  "IdentityId": "us-east-1:1cfe1e3a-e724-44e5-9b3b-4814b2d01662",
  "ResponseMetadata": {
    "HTTPHeaders": {
      "connection": "keep-alive",
      "content-length": "874",
      "content-type": "application/x-amz-json-1.1",
      "date": "Thu, 20 Apr 2017 20:37:24 GMT",
      "x-amzn-requestid": "298431fb-2609-11e7-b14d-8108743ed1c5"
    },
    "HTTPStatusCode": 200,
    "RequestId": "298431fb-2609-11e7-b14d-8108743ed1c5",
    "RetryAttempts": 0
  },
  "Token": "eyJraWQiOiJ1cy1lYXN0LTExIiwidHlwIjoiSldTIiwiYWxnIjoiUlM1MTIifQ.eyJzdWIiOiJ1cy1lYXN0LTE6MWNmZTFlM2EtZTcyNC00NGU1LTliM2ItNDgxNGIyZDAxNjYyIiwiYXVkIjoidXMtZWFzdC0xOmVlODY5ZjNjLWZiMjYtNDQ5Ni04MzhiLTc5YzQ0NjAyODZmZCIsImFtciI6WyJhdXRoZW50aWNhdGVkIiwibG9naW4uY3NlNTIxIiwibG9naW4uY3NlNTIxOnVzLWVhc3QtMTplZTg2OWYzYy1mYjI2LTQ0OTYtODM4Yi03OWM0NDYwMjg2ZmQ6MiJdLCJpc3MiOiJodHRwczovL2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbSIsImV4cCI6MTQ5MjcyMTU0NSwiaWF0IjoxNDkyNzIwNjQ1fQ.MXNdIl1KXbkbBRPMz8iDMI9Ez8-8hoDjnMw8VZLNGCrXAPdydQYc8cfWOnoBu6GMVjQzx0x-gMAF0XmYYMbHUl4G_39dvA6BzitoIGgcV-CprRwfAPd9h5xCRuAsrk5gaUz3Tfjuqvs56s_h3gSmgFvkNKdZKwgEuOFGsWJSPzagn88CFBiUCRWtv-wULKTMucmsZkikerAj-rXHVX6JFX7lP_5DRRD7-e4dxUnab8SrSyRX8cX90jxVlInWo0xZwnQYO2l4d2rarhR6soNbTXMmMNpARn-0uw9KNB04-GwiyXd-QTfHkDPR9eR6HYcyjgdXx3-dyMtjjulsz6gJng",
  "success": true
}
```

## Logging in:

`curl http://car.ejvaughan.com/login --data-urlencode email=<email address> --data-urlencode password=<password> -c cookies`

Example JSON response:

```json
{
  "IdentityId": "us-east-1:1cfe1e3a-e724-44e5-9b3b-4814b2d01662",
  "ResponseMetadata": {
    "HTTPHeaders": {
      "connection": "keep-alive",
      "content-length": "874",
      "content-type": "application/x-amz-json-1.1",
      "date": "Thu, 20 Apr 2017 20:37:24 GMT",
      "x-amzn-requestid": "298431fb-2609-11e7-b14d-8108743ed1c5"
    },
    "HTTPStatusCode": 200,
    "RequestId": "298431fb-2609-11e7-b14d-8108743ed1c5",
    "RetryAttempts": 0
  },
  "Token": "eyJraWQiOiJ1cy1lYXN0LTExIiwidHlwIjoiSldTIiwiYWxnIjoiUlM1MTIifQ.eyJzdWIiOiJ1cy1lYXN0LTE6MWNmZTFlM2EtZTcyNC00NGU1LTliM2ItNDgxNGIyZDAxNjYyIiwiYXVkIjoidXMtZWFzdC0xOmVlODY5ZjNjLWZiMjYtNDQ5Ni04MzhiLTc5YzQ0NjAyODZmZCIsImFtciI6WyJhdXRoZW50aWNhdGVkIiwibG9naW4uY3NlNTIxIiwibG9naW4uY3NlNTIxOnVzLWVhc3QtMTplZTg2OWYzYy1mYjI2LTQ0OTYtODM4Yi03OWM0NDYwMjg2ZmQ6MiJdLCJpc3MiOiJodHRwczovL2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbSIsImV4cCI6MTQ5MjcyMTU0NSwiaWF0IjoxNDkyNzIwNjQ1fQ.MXNdIl1KXbkbBRPMz8iDMI9Ez8-8hoDjnMw8VZLNGCrXAPdydQYc8cfWOnoBu6GMVjQzx0x-gMAF0XmYYMbHUl4G_39dvA6BzitoIGgcV-CprRwfAPd9h5xCRuAsrk5gaUz3Tfjuqvs56s_h3gSmgFvkNKdZKwgEuOFGsWJSPzagn88CFBiUCRWtv-wULKTMucmsZkikerAj-rXHVX6JFX7lP_5DRRD7-e4dxUnab8SrSyRX8cX90jxVlInWo0xZwnQYO2l4d2rarhR6soNbTXMmMNpARn-0uw9KNB04-GwiyXd-QTfHkDPR9eR6HYcyjgdXx3-dyMtjjulsz6gJng",
  "success": true
}
```

## Listing the user's things

`curl http://car.ejvaughan.com/things -b cookies`

Example JSON response:

```json
{
  "success": true, 
  "things": [
    {
      "id": 1, 
      "name": "PiCarHacking", 
      "triggers": [
        {
          "comparator": "eq", 
          "id": 12, 
          "iotRuleName": "12", 
          "message": "Its hot!", 
          "property": "temperature", 
          "snsTopic": "arn:aws:sns:us-east-1:845043522277:12", 
          "targets": [
            {
              "address": "ejvaughan@gmail.com", 
              "id": 13, 
              "snsSubscription": "pending confirmation", 
              "type": "email"
            }
          ], 
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
            {
              "address": "+16369807492", 
              "id": 14, 
              "snsSubscription": "arn:aws:sns:us-east-1:845043522277:13:9e7f294a-783e-44b6-ba49-94b4f1fee462", 
              "type": "sms"
            }, 
            {
              "address": "ejvaughan@gmail.com", 
              "id": 15, 
              "snsSubscription": "pending confirmation", 
              "type": "email"
            }
          ], 
          "value": 40.0
        }
      ]
    }
  ]
}
```

## Listing previously created triggers:

`curl http://car.ejvaughan.com/triggers -b cookies`

Example JSON response:

```json
{
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
        {
          "address": "ejvaughan@gmail.com",
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
        {
          "address": "+16369807492",
          "id": 14,
          "snsSubscription": "arn:aws:sns:us-east-1:845043522277:13:9e7f294a-783e-44b6-ba49-94b4f1fee462",
          "type": "sms"
        }
      ],
      "thingID": 1,
      "value": 40.0
    }
  ]
}
```

## Creating a new trigger:

`curl http://car.ejvaughan.com/triggers -b cookies --data-binary @trigger.json -H "Content-Type: application/json"`

Example trigger.json:

```json
{
	"thing": "PiCarHacking",
	"property": "temperature",
	"comparator": "eq",
	"value": 40,
	"targets": [
		{
			"type": "sms",
			"address": "+16369807492"
		}
	],
	"message": "Hello, world!"
}
```

Supported values for `comparator` include:

* `eq`: Equality
* `gt`: Greater than
* `lt`: Less than

Supported values for `property` include:

* `010c`: Engine RPMs
* `010d`: Vehicle speed
* `012f`: Fuel level
* `0105`: Engine coolant temperature
* `011f`: System uptime
* `0149`: Accelerator pedal position

Example JSON response:

```json
{
  "success": true,
  "trigger": {
    "comparator": "eq",
    "id": 13,
    "iotRuleName": "13",
    "message": "The world is on fire. Rip global warming.",
    "property": "temperature",
    "snsTopic": "arn:aws:sns:us-east-1:845043522277:13",
    "targets": [
      {
        "address": "+16369807492",
        "id": 14,
        "snsSubscription": "arn:aws:sns:us-east-1:845043522277:13:9e7f294a-783e-44b6-ba49-94b4f1fee462",
        "type": "sms"
      }
    ],
    "thingID": 1,
    "value": 40.0
  }
}
```

## Deleting a trigger:

`curl http://car.ejvaughan.com/triggers/<trigger ID> -X DELETE -b cookies`

## Adding a new target to a trigger:

`curl http://car.ejvaughan.com/triggers/<trigger ID>/target -b cookies --data-binary @trigger_target.json -H "Content-Type: application/json"`

Example trigger_target.json:

```json
{
	"type": "email",
	"address": "ejvaughan@gmail.com"
}
```

Example response JSON:

```json
{
  "success": true,
  "target": {
    "address": "ejvaughan@gmail.com",
    "id": 15,
    "snsSubscription": "pending confirmation",
    "type": "email"
  }
}
```
