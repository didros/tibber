#!/usr/bin/node

var homeId = process.env.TIBBER_HOMEID;
var jeedomId = {"Apayer": 1989, "Puissance" : 1990, "Conso": 1992, "maxPower": 1994, "minPower": 1995};

// Read first param
var tibber_prop = process.argv.slice(2);
do_log("starting");

function do_log(msg)
{
	if (tibber_prop == "") { console.log(msg); }
}

// Jeedom
const http = require('http');
const url=process.env.JEEDOM_URL+'/core/api/jeeApi.php?plugin=virtual&type=event&apikey='+process.env.JEEDOM_KEY;

// Tibber
const token=process.env.TIBBER_KEY;
const WebSocket = require('ws');
const ws = new WebSocket('wss://api.tibber.com/v1-beta/gql/subscriptions','graphql-subscriptions');

ws.on('open', function open() {
  do_log("In open: protocol is " + ws.protocol, " state is : " + ws.readyState);
  ws.send('{"type":"init","payload":"token='+token+'"}', function ack(error) {
	// If error is not defined, the send has been completed, otherwise the error
	// object will indicate what failed.
	if (error) { do_log(error); }
	else {
		do_log("send ok, state is : " + ws.readyState); 
		var msg = '\
{ "query": "subscription { \
  liveMeasurement(homeId:\\\"'+ homeId + '\\\") { \
    timestamp \
    power \
    accumulatedConsumption \
    accumulatedCost \
    currency \
    minPower \
    averagePower \
    maxPower \
    } \
}", "variables":null, "type":"subscription_start","id":0}'
		do_log(msg);
		ws.send(msg, function ack(error) {
			if (error) { do_log(error); }
		});
	}
  });
});

ws.on('message', function incoming(data) {
  do_log("In message");
  do_log(data);
  var resp = JSON.parse(data)
  if ( resp.payload === undefined ) {
	  do_log("")
  }
  else {
	if (resp.payload.data.liveMeasurement.power > 0) {
        // Close websocket with tibber API
		ws.close();

        value = resp.payload.data.liveMeasurement.power; 
		if (tibber_prop == "power") { console.log(value); }

		// Puissance
		http.get(url + "&id=" + jeedomId.Puissance +"&value=" + value, (r) => {
			do_log(`statusCode Jeedom power: ${r.statusCode}`)
		}).on("error", (err) => {
		  do_log("Error to update Jeedom: " + err.message);
		});

		// Conso jour
		http.get(url + "&id=" + jeedomId.Conso + "&value=" + resp.payload.data.liveMeasurement.accumulatedConsumption, (r) => {
			do_log(`statusCode Jeedom accumulatedConsumption: ${r.statusCode}`)
		}).on("error", (err) => {
		  do_log("Error to update Jeedom: " + err.message);
		});

		// A payer ce jour
		http.get(url + "&id=" + jeedomId.Apayer + "&value=" + resp.payload.data.liveMeasurement.accumulatedCost, (r) => {
			do_log(`statusCode Jeedom accumulatedCost: ${r.statusCode}`)
		 }).on("error", (err) => {
		   do_log("Error to update Jeedom: " + err.message);
		 });

		 // maxPower
		 http.get(url + "&id=" + jeedomId.maxPower + "&value=" + resp.payload.data.liveMeasurement.maxPower, (r) => {
			do_log(`statusCode Jeedom maxPower: ${r.statusCode}`)
		 }).on("error", (err) => {
		   do_log("Error to update Jeedom: " + err.message);
		 });

		 // minPower
		 http.get(url + "&id=" + jeedomId.minPower + "&value=" + resp.payload.data.liveMeasurement.minPower, (r) => {
			do_log(`statusCode Jeedom minPower: ${r.statusCode}`)
		 }).on("error", (err) => {
		   do_log("Error to update Jeedom: " + err.message);
		 });

	}
  }
});

ws.on('error', function () {
  do_log("Error event received");
});

ws.on('close', function () {
  do_log("Close event received");
});


