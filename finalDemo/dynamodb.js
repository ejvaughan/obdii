/**
 * configure aws
 */
AWS.config.update({
    region:"us-east-1",
    endpoint:"http://dynamodb.us-east-1.amazonaws.com",
    accessKeyId:'AKIAILZZ3X4AQB3G2ENA',
    secretAccessKey:"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"

});
/*
AWS.config.update({
    region:"us-east-1",
    endpoint:"http://dynamodb.us-east-1.amazonaws.com",
    IdentityPoolId: "us-east-1:e450cd78-32a4-4799-9481-7439bc19425c",
    RoleArn: "arn:aws:iam::845043522277:role/cognitoDynamodb"
});
*/

/**
 * prepare dynamodb and a funciton for querying the database
 */
var dynamodb = new AWS.DynamoDB.DocumentClient();
function query(table, param, callback){
    console.log("Preparing parameters for querying table " + table + "......");
    var params={
        TableName: table,
        KeyConditionExpression: "#tp = :tttt",
        ExpressionAttributeNames:{
            "#tp": 'date'
        },
        ExpressionAttributeValues:{
            ":tttt":param
        }
    };
    console.log("Start querying ......");
    dynamodb.query(params, function(err, data){
        if(err){
            alert("Query DynamoDB Error: " + err);
        }else{
            console.log("data>>>: "+ JSON.stringify(data));
            callback(data);
            callback("callback working");
        }
    });
}
