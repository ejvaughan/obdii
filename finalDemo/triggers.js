
var numTargets = 0; // variable used to keep track of number of targets created in creating a trigger

// event handler for create trigger button
document.getElementById("addTriggers").addEventListener("click", function(){
    $("#triggerForm").show(); 
    $("#triggerRow").empty();
    createFirstRowForTrigger();
    $("#targets").empty();
    numTargets = 0;
    createTarget();
},false);

// event handler for cancel a trigger creation
document.getElementById("cancelTrigger").addEventListener("click", function(){
    $("#triggerRow").empty();
    $("#targets").empty();
    $("#triggerForm").hide(); 
    numTargets = 0;
},false);


//save trigger button
document.getElementById("saveTrigger").addEventListener("click", function(){
    var targets = getTargets();
    var thing = document.getElementById("triggerThing").value;
    var property = document.getElementById("triggerProperty").value;
    var comparator = document.getElementById("triggerComparator").value;
    var value = document.getElementById("triggerValue").value;
    var message = document.getElementById("triggerMessage").value;
    console.log(" ---> " + "  " + thing + "  " +property + "  " + comparator + " " +value + " " + message);
    if(thing === "" || property === "palceholder" || comparator ==="placeholder" || value ==="" || message === ""){
        pushAlert("Please fill the trigger form correctly");
        return;
    }
    
    //prepare for the query
    var transformedComp = {">":"gt", "<":"lt", "=":"eq"};
    var transformedProperty = {"Rpms":"010c","speed":"010d", "fuel":"012f", "pedal position":"0149"};
    var trigger = {
        "thing":thing,
        "property":transformedProperty.property,
        "comparator":transformedComp.comparator,
        "value": value,
        "targets":targets,
        "message": message
    };
    $.ajax({
        type: "POST",
        url: "http://car.ejvaughan.com/triggers",
        beforeSend: function(xhr) {
            xhr.setRequestHeader( "Content-type", "application/json" );
        },
        data: JSON.stringify(trigger),
        success: getListOfTriggers(), // once succefully created a trigger, reload the triggers
        error: function(xhr, ajaxOptions, thrownError) {
            alert("Failed to add target" + xhr.statusText);
        }
    });
    

},false);


/**
 * function to get the list of targets when adding a trigger
 */ 
function getTargets(){
    var targets = [];
    var types = $("select[name='targetType']");
    var addresses = $("input[name='targetAddress']");
    for(var i = 0; i < types.length; ++i){
        if(types[i].value === "placeholder"){pushAlert("Please select the correct type for " +(i+1) +" target"); return;}
        if(addresses[i].value === ""){pushAlert("Please input the correct address for " + (i+1) +" target"); return;}
        var target = {"type":types[i].value, "address":addresses[i].value};
        targets.push(target);
    }
    return targets;
}

/**
 * function to query the things on backend, and list all the triggers
 */ 
function getListOfTriggers(){
    $("#triggersBody").empty();
    $.post("http://car.ejvaughan.com/things", function(data){
        if(!data.success){pushAlert("Cannot get Things and triggers"); return;}
        for(var i =0; i < data.things.length; ++i){
            listTriggers(data.things[i], data.things[i].name);
        }
        console.log("triggers listed");
    });
}


/**
 * function to list all triggers for ONE thing
 */ 
function listTriggers(data, name){
    for(var i = 0; i < data.triggers.length; ++i){
        var triggersTable = document.getElementById("triggersBody");
        var row = document.createElement("tr");
        var number = document.createElement("td");
        number.innerHTML = (i+1);
        var thing = document.createElement("td");
        thing.innerHTML = name;
        var property = document.createElement("td");
        property.innerHTML = data.triggers[i].property;
        var comparator  = document.createElement("td");
        comparator.innerHTML = data.triggers[i].comparator;
        var value = document.createElement("td");
        value.innerHTML = data.triggers[i].value;
        var message = document.createElement("td");
        message.innerHTML = data.triggers[i].message;
        var action = document.createElement("td");
        
        // configure targets 
        var targets = document.createElement("td");
        var toggle = document.createElement("a");
        toggle.setAttribute("href", "#trigger"+i);
        toggle.setAttribute("data-toggle", "collapse");
        toggle.innerHTML = "See targets";
        //toggle div
        var toggleDiv = document.createElement("div");
        toggleDiv.setAttribute("id", "trigger"+i);
        toggleDiv.setAttribute("class", "collapse panel panel-primary");
        toggleDiv.setAttribute("align","left");
        //handle all targes
        for(var j = 0; j < data.triggers[i].targets.length; ++j){
            var t = document.createElement("li");
            t.innerHTML = data.triggers[i].targets[j].type + ": " + data.triggers[i].targets[j].address;
            toggleDiv.appendChild(t);
        }
        targets.appendChild(toggle);
        targets.appendChild(toggleDiv);

        //configure the add target button 
        var actionDiv = document.createElement("div");
        actionDiv.setAttribute("class", "btn-group");
        var addTarget = document.createElement("button");
        addTarget.setAttribute("class", "btn btn-default");
        addTarget.setAttribute("name", data.triggers[i].id); // set the trigger id for the button
        addTarget.innerHTML = "Add Target";

        //handle the add target click
        addTarget.addEventListener("click", function(){
            console.log("add target button clicked ---> " + this.name);
            //open the dialog form
            var addTargetDialog = $("#addTargetForm").dialog();
            addTargetDialog.dialog("open");
            //configure the id of add button 
            var addTargetSubmit = document.getElementById("addTargetSubmit");
            addTargetSubmit.setAttribute("name", this.name);
            addTargetSubmit.addEventListener("click", function(){
                var selectedType = $("#addTargetSelect").find(":selected").text();
                var addr = document.getElementById("addTargetAddress").value;
                console.log(selectedType);
                if((selectedType != "SMS" && selectedType != "Email") || addr===""){
                    pushAlert("Please select the right type and fill the message");
                    return;
                }
                var dataSend = {"type":selectedType, "address":addr};
                // do query and update the triggers
                $.ajax({
                    type: "POST",
                    url: "http://car.ejvaughan.com/triggers/" + this.name +"/target",
                    beforeSend: function(xhr) {
                        xhr.setRequestHeader( "Content-type", "application/json" );
                    },
                    data: JSON.stringify(dataSend),
                    success: getListOfTriggers(),
                    error: function(xhr, ajaxOptions, thrownError) {
                        alert("Failed to add target" + xhr.statusText);
                    }
                });
                console.log("add target submit button " + this.name + " selectec: " + selectedType + " message " + addr);
            },false);
        },false);
    
        //configure delete target button
        var d = document.createElement("button");
        d.setAttribute("class", "btn btn-default");
        d.setAttribute("name", data.triggers[i].id); // set trigger id for the button 
        d.innerHTML = "Delete";
        d.addEventListener("click", function(){
            console.log("delet target button get clicked --->" + this.name ); 
            $.ajax({
                url: "http://car.ejvaughan.com/triggers/" + this.name,
                type:"DELETE",
                success: getListOfTriggers()
            }); 
        
        },false);

        actionDiv.appendChild(addTarget);
        actionDiv.appendChild(d);
        action.appendChild(actionDiv);
        //append all children for the row
        row.appendChild(number);
        row.appendChild(thing);
        row.appendChild(property);
        row.appendChild(comparator);
        row.appendChild(value);
        row.appendChild(targets);
        row.appendChild(message);
        row.appendChild(actionDiv);
                
        //append the row
        triggersTable.appendChild(row);
        //triggersTable.appendChild(toggleDiv);
    }
}


/**
 * function to create the first row for trigger configuration
 */ 
function createFirstRowForTrigger(){
    var options = {"speed":"speed", "Rpms":"Rpms", "fuel":"fuel", "pedal position": "pedal position"};
    var comparators ={">":">", "<":"<", "=":"="};

    var row = document.createElement("tr");

    var thingDiv = document.createElement("div");
    thingDiv.setAttribute("class", "col-sm-3");
    var thingName = document.createElement("input");
    thingName.setAttribute("placeholder", "Name of the thing");
    thingName.setAttribute("class", "form-control");
    thingName.setAttribute("id", "triggerThing");
    thingDiv.appendChild(thingName);

    var propertyDiv = document.createElement("div");
    propertyDiv.setAttribute("class", "col-sm-3");
    var properties = document.createElement("select");
    properties.setAttribute("class", "form-control col-xs-4");
    properties.setAttribute("id", "triggerProperty");
    properties.options[properties.options.length] = new Option("Select a property", "placeholder");
    for(var index in options) properties.options[properties.options.length] = new Option(options[index], index);
    propertyDiv.appendChild(properties);

    var compDiv = document.createElement("div");
    compDiv.setAttribute("class", "col-sm-3");
    var comp = document.createElement("select");
    comp.setAttribute("class", "form-control");
    comp.setAttribute("id", "triggerComparator");
    comp.options[comp.options.length] = new Option("Select a comparator", "placeholder");
    compDiv.appendChild(comp);
    for(var c in comparators) comp.options[comp.options.length] =  new Option(c, c);

    var valueDiv = document.createElement("div");
    valueDiv.setAttribute("class", "col-sm-3");
    var value = document.createElement("input");
    value.setAttribute("placeholder", "threshold value");
    value.setAttribute("class", "form-control");
    value.setAttribute("id", "triggerValue");
    valueDiv.appendChild(value);
    
    row.appendChild(thingDiv);
    row.appendChild(propertyDiv);
    row.appendChild(compDiv);
    row.appendChild(valueDiv);
    document.getElementById("triggerRow").appendChild(document.createElement("br"));
    document.getElementById("triggerRow").appendChild(row);

    var messageDiv = document.createElement("div");
    messageDiv.setAttribute("class", "col-sm-12");
    var message = document.createElement("input");
    message.setAttribute("placeholder", "custome your message");
    message.setAttribute("class", "form-control");
    message.setAttribute("id", "triggerMessage");
    messageDiv.appendChild(message);
    document.getElementById("triggerRow").appendChild(document.createElement("br"));
    document.getElementById("triggerRow").appendChild(messageDiv);
}

/**
 * function to create a target
 */ 
function createTarget(){
    numTargets += 1;

    var typeDiv = document.createElement("div");
    typeDiv.setAttribute("class", "col-sm-2");
    var type = document.createElement("select");
    type.setAttribute("class", "form-control");
    type.setAttribute("name", "targetType");
    type.options[type.options.length] = new Option("Select a type", "placeholder");
    type.options[type.options.length] = new Option("SMS", "sms");
    type.options[type.options.length] = new Option("Email", "email");
    typeDiv.appendChild(type);
    
    var addressDiv = document.createElement("div");
    addressDiv.setAttribute("class", "col-sm-6");
    var address = document.createElement("input");
    address.setAttribute("placeholder", "target address");
    address.setAttribute("class", "form-control");
    address.setAttribute("name", "targetAddress");
    addressDiv.appendChild(address);

    var addDiv = document.createElement("div");
    addDiv.setAttribute("class", "col-sm-1");
    addDiv.setAttribute("align", "right");
    var minusDiv = document.createElement("div");
    minusDiv.setAttribute("class", "col-sm-1");
    minusDiv.setAttribute("align", "right");

    var minus = document.createElement("a");
    minus.setAttribute("id", "minusTarget"+numTargets);
    minus.setAttribute("href", "#");
    var minusSpan = document.createElement("span");
    minusSpan.setAttribute("class", 'glyphicon glyphicon-minus');
    minus.appendChild(minusSpan);
    minus.addEventListener("click", function(event){
        $("#target"+this.id.slice(-1)).remove();
        $("#space"+this.id.slice(-1)).remove();
        console.log("minus button get clicked");
    },false);
    
    var add = document.createElement("a");
    add.setAttribute("id", "addTarget"+numTargets);
    add.setAttribute("href", "#");
    var addSpan = document.createElement("span");
    addSpan.setAttribute("class", 'glyphicon glyphicon-plus');
    add.appendChild(addSpan);
    add.addEventListener("click", function(){
        createTarget();
        console.log("add button get clicked, numTargets=" + numTargets);
    },false);
    
    minusDiv.appendChild(minus);
    addDiv.appendChild(add);
    
    //append each div to a target
    var targetDiv = document.createElement("div");
    targetDiv.appendChild(typeDiv);
    targetDiv.appendChild(addressDiv);
    targetDiv.appendChild(minusDiv);
    targetDiv.appendChild(addDiv);
    targetDiv.setAttribute("id", "target"+numTargets);
    targetDiv.setAttribute("class", "row form-control");
    
    //append a target 
    document.getElementById("targets").appendChild(targetDiv);
    var br = document.createElement("br");
    br.setAttribute("id", "space"+ numTargets);
    document.getElementById("targets").appendChild(br);
}
