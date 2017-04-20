
var table = "test10"; // table to query
var numRows = 0;      // number of rows of linechart
var numCols = 0;     // the column NO. of the latest line chart

//set currentDate
var currentDate = today();
document.getElementById("dispDate").innerHTML = today(); // default display time

// handle taday button
document.getElementById("today").addEventListener("click", function(e){
    currentDate = today();
    document.getElementById("dispDate").innerHTML = currentDate;
    //update canvas
    var canvas = document.getElementById("canvas");
    $("#canvas").empty(); // empty the canvas
    numRows = 0;
    numCols = 0;
    query(table, currentDate, drawLineChart);
},false);
// next date handler
document.getElementById("nextday").addEventListener("click", function(e){
    currentDate = getNextDay(currentDate);
    document.getElementById("dispDate").innerHTML = currentDate;
    //update canvas
    var canvas = document.getElementById("canvas");
    $("#canvas").empty(); // empty the canvas
    numRows = 0;
    numCols = 0;
    query(table, currentDate, drawLineChart);
},false);

//prev date handler
document.getElementById("prevday").addEventListener("click", function(e){
    currentDate = getPrevDay(currentDate);
    document.getElementById("dispDate").innerHTML = currentDate;
    //update canvas
    var canvas = document.getElementById("canvas");
    $("#canvas").empty(); // empty the canvas
    numRows = 0;
    numCols = 0;
    query(table, currentDate, drawLineChart);
},false);


/**
 * query the database and draw the chart
 */
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
            callback(data);
        }
    });
}
/**
 * callback function used for the query of database
 */
function drawLineChart(data){
    // if there is no data
    if(data.Count ===  0) {
        console.log("No data on this day");
        $("#no-data-dialog").modal('show');
        return;
    }

    //process data
    var processed = processData(data);
    var labelArr = processed[0];
    var dataArr = processed[1];

    //draw graph based on the data
    draw(labelArr, dataArr);

}


/**
 * process the data queried from the data base
 * the idea is partition the data to different time buckets, for each time buckets draw a line chart
 */
function processData(data){

    // process fetched data
    var items = data.Items; //get all the items
    var labelArr = [];
    var dataArr = [];
    var prev = getTime(currentDate + SPACE + items[0].time);
    var labelPath = [];
    var dataPath = [];
    for(var i = 0; i < data.Count; ++i){
        var curTime = getTime(currentDate + SPACE + items[i].time);
        if(curTime - prev < 12000){  // difference between two times is within 4 seconds
            labelPath.push(items[i].time);
            dataPath.push(items[i].temperature);
            prev = curTime;
            continue;
        }
        // if the difference between curTime and prevTime is greater than 4 seconds, push the previous label and data path
        labelArr.push($.extend(true,[], labelPath));
        dataArr.push($.extend(true, [], dataPath));
        labelPath = [];
        dataPath = [];
        prev = curTime;
        i--;
    }
    if(labelPath.length > 0 && dataPath.length > 0){ //push the last time bucket
        labelArr.push($.extend(true,[], labelPath));
        dataArr.push($.extend(true, [], dataPath));
    }

    var result = [];
    result.push(labelArr);
    result.push(dataArr);
    return result;
}


/**
 * Draw several line charts, three in a row
 */
function draw(labelArr, dataArr){

    var canvas = document.getElementById("canvas");
    $("#canvas").empty(); // empty the canvas
    for(var j = 0; j < labelArr.length; ++j){
        var chartLabels = labelArr[j];
        var chartData = dataArr[j];
        if(chartLabels.length < 5) continue; //if not enough data, less than 10 seconds

        //set up the canvas
        if(numCols >= 3){ // check if a row is filled
            numRows+= 1;
            numCols = 0;
        }
        if(numCols === 0){
            var newRow = document.createElement("div");
            newRow.setAttribute("class", "row");
            newRow.setAttribute("id", "row" + numRows);
            canvas.appendChild(newRow);
        }
        var row = document.getElementById("row" + numRows);
        var newCol = document.createElement("div");
        newCol.setAttribute("class", "col-sm-4");
        newCol.setAttribute("align", "center");
        var newCan = document.createElement("canvas");
        newCan.setAttribute("id", "row" + numRows + "-can" + numCols);
        newCan.setAttribute("width", 300);
        newCan.setAttribute("height",300);
        newCol.appendChild(newCan);
        row.appendChild(newCol);
        numCols++;

        // draw the chart
        var canTemp = JSON.parse(JSON.stringify(LINE_TEMPLATE));
        canTemp.labels = chartLabels;
        canTemp.datasets[0].data = chartData;
        canTemp.datasets[0].label = chartLabels[0] + " - " + chartLabels[chartLabels.length - 1];
        var canContext = newCan.getContext("2d");
        generateLineChart(canContext, canTemp);

        console.log("row >>>>> " + numRows + " col>>>> " + numCols);
    }
}


