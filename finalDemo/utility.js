/**
 * Line template that specifies the configuration of a line chart
 */
var LINE_TEMPLATE = {
    datasets: [
        {
            label: "holder",
            fill: true,
            lineTension: 0.1,
            backgroundColor: "rgba(75,192,192,0.4)",
            borderColor: "rgba(75,192,192,1)",
            borderCapStyle: 'butt',
            borderDash: [],
            borderDashOffset: 0.0,
            borderJoinStyle: 'miter',
            pointBorderColor: "rgba(75,192,192,1)",
            pointBackgroundColor: "#fff",
            pointBorderWidth: 1,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "rgba(75,192,192,1)",
            pointHoverBorderColor: "rgba(220,220,220,1)",
            pointHoverBorderWidth: 2,
            pointRadius: 1,
            pointHitRadius: 10,
            spanGaps: false,
        }
    ]
};

/**
 * Line options which specifies the option configuration of a line chart
 */ 
var LINE_OPTIONS = {
    responsive:false,
    scales:{
        xAxes:[{
            ticks:{
                autoSkip:true,
                maxTicksLimit:5
            }
        }]
    }
};


/**
 * function used to generate a line chart with the specified labels and data
 */ 
function generateLineChart(canvas, data){
    var lineChart = new Chart(canvas, {
        type: 'line',
        data: data,
        options:LINE_OPTIONS
    });
    return lineChart;
} 


/**
 * Date manipulate
 * get the string representation of a date, with format like Apr 19, 2017
 */ 
var months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
var SPACE = " ";
var COMMA = ",";
function strRep(date){
    return months[date.getMonth()] + SPACE + date.getDate() + COMMA + SPACE + date.getFullYear();
}

/* get today */
function today(){
    var date = new Date();
    var today = strRep(date);
    return today;
}

/**
 * get next day 
 * the given parameter is a string representation
 */
function getNextDay(current){
    var cur = new Date(current);
    cur.setDate(cur.getDate() + 1);
    return strRep(cur);
}

/* get the previous date*/
function getPrevDay(current){
    var cur = new Date(current);
    cur.setDate(cur.getDate() - 1);
    return strRep(cur);
}


/**
 * function to get the time from 1970/01/01
 * the input parameter is a string representing a time
 */
function getTime(time){
    var d = new Date(time);
    return d.getTime();
}













