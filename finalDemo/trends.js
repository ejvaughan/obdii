
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
    query(table, currentDate, drawCharts);
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
    query(table, currentDate, drawCharts);
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
    query(table, currentDate, drawCharts);
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
function drawCharts(data){
    // if there is no data
    if(data.Count ===  0) {
        console.log("No data on this day");
        alert("No data on this day");
        return;
    }

    //process data for the pie
    var pieProcessed = getPieData(data);
    console.log(pieProcessed);
    drawPies(pieProcessed);
    //process data for the line
    var processed = getLineData(data);
    var labelArr = processed[0];
    var dataArr = processed[1];
    //draw graph based on the data
    drawLines(labelArr, dataArr);

}


/**
 * process the queried data for pie chart 
 * pie chart is the summary of one days drive speed
 */ 
function getPieData(data){
    var items = data.Items;
    var categories = {"leThirty":0, "thirtyToSixty":0, "sixtyToNinety":0, "gtNinety":0};
    console.log("...." + data.Count);
    for(var i = 0; i < data.Count; ++i){
        var temperature = items[i].temperature;
        if(temperature < 30) categories.leThirty++;
        else if(temperature >= 30 && temperature<60) categories.thirtyToSixty++;
        else if(temperature >= 60 && temperature<90) categories.sixtyToNinety++;
        else categories.gtNinety++;
    }
    var result = [categories.leThirty, categories.thirtyToSixty, categories.sixtyToNinety, categories.gtNinety];
    return result; 

}

/**
 * draw pie funciton
 */ 
function drawPies(data){
    var canvas = document.getElementById("canvas"); //get canvas
    var newRow = document.createElement("div");
    newRow.setAttribute("class", "row");
    newRow.setAttribute("id", "row" + numRows);
    canvas.appendChild(newRow);

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
    
    var pieData = JSON.parse(JSON.stringify(PIE_TEMPLATE));
    pieData.datasets[0].data = data;
    var pieContext = newCan.getContext("2d");
    var opts = JSON.parse(JSON.stringify(PIE_OPTIONS));
    generatePieChart(pieContext, pieData, opts);

}

/**
 * process the data queried from the data base
 * the idea is partition the data to different time buckets, for each time buckets draw a line chart
 */
function getLineData(data){

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
function drawLines(labelArr, dataArr){
    var canvas = document.getElementById("canvas");
    for(var j = 0; j < labelArr.length; ++j){
        var chartLabels = labelArr[j];
        var chartData = dataArr[j];
        if(chartLabels.length < 5) continue; //if not enough data, less than 10 seconds

        //set up the canvas
        if(numCols >= 3){ // check if a row is filled
            numRows+= 1;
            numCols = 0;
        }
        if(numCols === 0 && numRows >= 1){
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
        var opts = JSON.parse(JSON.stringify(LINE_OPTIONS));
        opts.title.text =  chartLabels[0] + " - " + chartLabels[chartLabels.length - 1];
        var canContext = newCan.getContext("2d");
        generateLineChart(canContext, canTemp, opts);
    }
}


