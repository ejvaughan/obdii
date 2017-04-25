//test area

var url = "http://car.ejvaughan.com"; // endpoint of the backend
var loggedIn = false;
var currentUser = null;
var currentPassword = null;

// add event listener for alert close
document.getElementById("alertClose").addEventListener("click", function(){$("#alert").hide();}, false);

// image and brand handler
document.getElementById("brand").addEventListener("click", function(){
    console.log("brand button get clicked -->");
    $("#imageContainer").show();
    $("#trends").hide();
    $("#triggers").hide();
},false);

// trends div manipulation
$("#trends").hide(); //default is hide
document.getElementById("trendsButton").addEventListener("click", function(){
    console.log("trends button clicked -->");
    if(!loggedIn){pushAlert("Please login first."); return;}
    $("#trends").show();
    $("#imageContainer").hide();
    $("#triggers").hide();

},false);


// trigger div manipulation
$("#triggers").hide(); //default is hide
document.getElementById("triggersButton").addEventListener("click", function(){
    console.log("triggers button is clicked -->");
    //if(!loggedIn){pushAlert("Please log in first"); return;}
    
    getListOfTriggers();

    $("#triggers").show();
    $("#trends").hide();
    $("#imageContainer").hide();

},false);


// sign-up dialog 
document.getElementById("signUpButton").addEventListener("click", function(){
    var regDialog=$("#registerForm").dialog();
    regDialog.dialog("open");
},false);

//register by clicking the submit button in sign-up dialog
document.getElementById("registerSubmit").addEventListener("click", function(){
    console.log("registerButton get clicked -- >");
    var email = document.getElementById("regEmail").value;
    var password = document.getElementById("regPassword").value;
    var passwordConfirm = document.getElementById("passwordConfirm").value;
    if(email === "" || password === "" || passwordConfirm === "" || (password != passwordConfirm)){ // check if input is valid or not
        pushAlert("Email or password is not filled, or confirm password is not consistent");
        return;
    }
    
    // send request to backend
    var dataString = "email=" + encodeURIComponent(email) + "&password=" + encodeURIComponent(password); 
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("POST", url+"/register", true);
    xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xmlHttp.addEventListener("load", function(event){
        var data = JSON.parse(event.target.responseText);
        if(!data.success) {pushAlert(data.message); return;} 
        $("#signUpButton").hide();
        $("#loginButton").hide();
        document.getElementById("welcome").innerHTML = "Welcome " + email;
        $("#welcome").show(); // show welcome message
        // hide the register form
        if($("#registerForm").dialog("isOpen")) $("#registerForm").dialog("close");
        login(email, password);
    },false);
    xmlHttp.send(dataString);
},false);


// login dialog
document.getElementById("loginButton").addEventListener("click",function(){
    var login = $("#loginForm").dialog();
    login.dialog("open");
}, false);

//login by clicking the submit button in login dialog
document.getElementById("loginSubmit").addEventListener("click", function(){
    var email = document.getElementById("loginEmail").value;
    var password = document.getElementById("loginPassword").value;
    login(email, password);
},false);

/**
 * function used to log in
 */ 
function login(email, password){
   console.log("log in processing ....."); 
    var dataString = "email=" + encodeURIComponent(email) + "&password=" + encodeURIComponent(password); 
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("POST", url+"/login", true);
    xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xmlHttp.addEventListener("load", function(event){
        var data = JSON.parse(event.target.responseText);
        if(!data.success){pushAlert(data.message); return;} 
        console.log("successfully logged in");
        if($("#loginForm").dialog() && $("#loginForm").dialog("isOpen")) $("#loginForm").dialog("close");
        $("#signUpButton").hide();
        $("#loginButton").hide();
        document.getElementById("welcome").innerHTML = "Welcome " + email;
        $("#welcome").show(); // show welcome message
        loggedIn = true;
    },false);
    xmlHttp.send(dataString);
}



