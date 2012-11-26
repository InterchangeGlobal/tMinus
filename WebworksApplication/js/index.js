/*
 * Copyright 2012 Interchange Global Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "Licence");  you may not use this file except in compliance with the Licence.
 * You may obtain a copy of the Licence at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, without warranties or conditions of any kind, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
var app = {

    // ----------------------------------------------------------------------------------------------------------------
    // Variables
    // ----------------------------------------------------------------------------------------------------------------
	// For greater control, change configUrl to any remote url. i.e. "http://channels.interchangegroup.com/tMinus/config.json"
	// You will need to authorise access to this remote url in the config.xml

    configUrl : "./default.json",
    config : {
        "target" : "January, 30, 2013",
        "graphicUrl" : "./img/BB10Nologo.png",
		"defaultBackground" : "url(./img/TminusBGD1280Grey.png) repeat",
		"periods" : [
			{
				"cutoffDay" : 60,
				"backgroundStyle" : "url(./img/TminusBGD1280Green.png) repeat"
			},
			{
				"cutoffDay" : 29,
				"backgroundStyle" : "url(./img/TminusBGD1280Amber.png) repeat"
			},
			{
				"cutoffDay" : 0,
				"backgroundStyle" : "url(./img/TminusBGD1280Red.png) repeat"
			}
		],
        "ignoreDays" : [ 2,3,9,10,16,17,23,24,28,30,31,34,35,37,38,44,45,51,52,58,59,65,66,72,73,79,80,86,87]
    },
    repeatUpdate: null,

    // ----------------------------------------------------------------------------------------------------------------
    // Methods
    // ----------------------------------------------------------------------------------------------------------------

    // Application Initialization
    initialize: function() {
        document.addEventListener("webworksready", this.onReady);
    },

    // Page Loaded Event Handler
    onReady: function() {
        // if we've agreed to the licence, carry on, otherwise show the licence
        if (window.localStorage.getItem("agreed")=="yes"){
            app.registerPauseListener();
            app.requestConfig();
        } else {
            app.presentEULA();
        }
    },

    //try and register a listener for when the application is paused
    registerPauseListener:function(){
        try {
            //add a pause event listener and update the active frame when it happens
            //BB10 only.
            blackberry.event.addEventListener("pause",app.updateDisplay);
            blackberry.event.addEventListener("resume",app.updateDisplay);
        } catch (e) {}
    },

    // display the licence agreement
    presentEULA:function(){
        document.getElementById('app').style.display = 'none';
        document.getElementById('eula').style.display = 'inline';
        // make sure the eula text is readable on all screens.
        document.getElementById('eula').style.fontSize = window.innerHeight < 560 ? "14px" : window.innerHeight/40+"px" ;
    },

    // remove the licence agreement and display the application proper
    // remember not to display the licence agreement again.
    acceptEULA:function(){
        document.getElementById('eula').style.display = 'none';
        window.localStorage.setItem("agreed","yes");
        app.requestConfig();
    },
	
    // calculate the hours between now and some other date
    hoursUntil: function(targetDate){
        var currentDate = new Date();
        var ticksInAnHour = 1000 * 60 * 60;
        var hrsCount = ( targetDate.getTime() - currentDate.getTime() ) / ticksInAnHour;
		hrsCount = Math.ceil(hrsCount);
		// ignore the 24hr period spaning the target date.
		hrsCount = hrsCount > 0.0 ? hrsCount : ( hrsCount > -24.0 ? 0 : hrsCount + 24.0 );
        return(hrsCount);
    },

    // calculate the ticks until the next hour is up
    timeToNextHour: function(){
        var currentDate = new Date();
		var nextHourDate = new Date();
		//set nextHourDate to be currentDate +1 hour.
        nextHourDate.setHours(currentDate.getHours() + 1);
		nextHourDate.setMinutes( 0 );
        nextHourDate.setSeconds( 0 );
        nextHourDate.setMilliseconds( 0 );
		//calculate the number of ticks until the hour changes
		//i.e. the number of ticks until the next hour plus one.
        return ( nextHourDate.getTime() - currentDate.getTime() ) + 1;
    },

    // convert a number into a class string based on ranges
    numberToStyle:function(input){
		for (var idx=0;idx<app.config.periods.length;idx++){
			if (app.config.periods[idx].cutoffDay < input){
				return app.config.periods[idx].backgroundStyle;
			}
		}
        //we should have exited by now, if not return the default background
        return app.config.defaultBackground;
    },

    // calculate a number based on the input number
    // it can be a minimum of 10 and a maximum of 70
    numberToAlpha:function(input){
        if (input > 70) return 10;
        if (input < 10) return 70;
        return 80.0 - input;
    },

    // display a "+" for negative numbers, indicating we are past the deadline.
    plusFormat: function(number){
        if (number < 0) return "+" + Math.abs(number);
        return number;
    },

    // check to see if the day passed is one of the days on our ignore list.
    checkIgnoreDay:function(input){
        var ignore = false;
        for ( var idx = 0 ; idx < app.config.ignoreDays.length ; idx++ ){
            //is the day value passed as in input on our list of ignored days?
            if (input == app.config.ignoreDays[idx]){
                ignore = true;
                break;
            }
        }
        return ignore;
    },

    // remove ignored days from the days count
    adjustForIgnoredDays:function(input){
        var result = input;
        for ( var idx = 0 ; idx < app.config.ignoreDays.length ; idx++ ){
            //is the day value passed as in input on our list of ignored days?
            if (input >= app.config.ignoreDays[idx])
                //subtract it from the result.
                result -= 1;
        }
        // this additional +1 day takes the count back to midnight last night.
        return app.checkIgnoreDay(input) ? result + 1 : result;
    },

    // update the config object with new values
    updateConfig:function(data){
        if (data && data.trim().length > 0){
            var jsonData = JSON.parse(data);
			// check the data passed includes at least part of the information we need.
            if (typeof jsonData.target !== "undefined"){
				// store the data so we can use it again in the future
                window.localStorage.setItem("config",data);
				// overwrite the config at the top of this script
                app.config = jsonData;
            }
        }
    },
    //on BB10 try making a call to an extension to update the active frame
    updateActiveFrame:function(){
        // wait for 1 second to allow the screen redrawing to complete
        window.setTimeout(function(){
            try {
                com.interchangegroup.ext.cover.updateCover();
            } catch (e){
                alert(e);
            }
        },1000);
    },

    //Download the config document
    requestConfig:function(){
        //randomise the download url, so we don't load from a cache.
        var randomisedUrl = app.configUrl + "?" + new Date().getTime();
        //create a request to download the URL from the target.
        var xmlHttp = new XMLHttpRequest();
        //create an inline function to deal with the response
        xmlHttp.onreadystatechange = function(){
            // are we at the final xmlhttp state?
            if (xmlHttp.readyState == 4) {
                // did we get HTTP.OK in the response?
                if (xmlHttp.status == 200) {
                    app.requestSuccess(xmlHttp.responseText);
                } else {
                    app.requestFail();
                }
            }
        };
        //make the request
        xmlHttp.open('GET',randomisedUrl,true);
        xmlHttp.send(null);
    },

    //we've downloaded a new config, use it AND store it away in-case we're offline in the future
    requestSuccess:function(data){
        app.updateConfig(data);
        app.updateDisplay();
    },

    //we've been unable to download but if we did previously (because its in the storage), use that
    requestFail:function(){
        app.updateConfig(window.localStorage.getItem("config"));
        app.updateDisplay();
    },

    //update the display to show the days remaining
	updateDisplay:function(){

        // display the app portion of the index page
        document.getElementById('app').style.display = 'inline';

        //calculate number of hours until the end of our target date.
        var hrsToTarget = app.hoursUntil( new Date( app.config.target ) );

        //calculate the days between today and the configured target date
        var	daysToGo = ( hrsToTarget < 0 ? Math.ceil( hrsToTarget / 24.0 ) : Math.floor( hrsToTarget / 24.0 ));

        //calculate the hrs that are left as a remainder
        var hrsToGo = hrsToTarget - ( daysToGo * 24 );

        // show the number of hours and days but never more than 23 hours.
        // adjust the days and hours so we appear not to count weekend days.
        document.getElementById('hrsCount').innerText = app.checkIgnoreDay(daysToGo) ? "0" : app.plusFormat(hrsToGo%24);
        document.getElementById('dayCount').innerText = app.plusFormat( app.adjustForIgnoredDays( daysToGo ) );

        //Day or Days, Hour or Hours?
        document.getElementById('dayQuanta').innerText = app.adjustForIgnoredDays( daysToGo ) == 1 ? "Day" : "Days" ;
//      document.getElementById('hrsQuanta').innerText = document.getElementById('hrsCount').innerText == "1" ? "Hour" : "Hours" ;

        //set the background style
        document.getElementById('bg').style.background = app.numberToStyle( hrsToTarget / 24.0 );

        //show the product graphic if set, with a calculated opacity
		if (app.config.graphicUrl.trim().length > 0) {
			document.getElementById('alphaGraphic1').style.display = 'inline';
			document.getElementById('alphaGraphic2').style.display = 'inline';
			document.getElementById('alphaGraphic1').src = app.config.graphicUrl;
			document.getElementById('alphaGraphic2').src = app.config.graphicUrl;
			window.setTimeout(function(){
				document.getElementById('alphaGraphic1').style.opacity = app.numberToAlpha( hrsToTarget / 24.0 ) / 100;
				document.getElementById('alphaGraphic2').style.opacity = app.numberToAlpha( hrsToTarget / 24.0 ) / 100;
			},500);
		}

        //if the application is left running, remember to update the counter on the next hour.
        if (app.repeatUpdate){
            window.clearTimeout(app.repeatUpdate);
            //now the timeout has completed, update the active frame as well
            app.updateActiveFrame();
        }
        var delay = app.timeToNextHour();
        app.repeatUpdate = window.setTimeout( app.updateDisplay , delay + 1 );

    }
};

// update the string object to add a TRIM function.
// which removes leading and trailing white space
String.prototype.trim = function() {
    return (this.replace(/^[\s\xA0]+/, "").replace(/[\s\xA0]+$/, ""));
};
