#!/usr/bin/node

// Check that env variable are set
if ( process.env.JEEDOM_KEY == undefined ) {
   console.error("Missing env variable for JEEDOM_KEY")
   process.exit(-1);
}
if ( process.env.TIBBER_KEY == undefined ) {
   console.error("Missing env variable for TIBBER_KEY")
   process.exit(-1);
}
if ( process.env.TIBBER_HOMEID == undefined ) {
   console.error("Missing env variable for TIBBER_HOMEID")
   process.exit(-1);
}

var homeId = process.env.TIBBER_HOMEID;
var jeedomId = {"Puissance" : 1322, "Conso": 1324, "Apayer": 1946, "maxPower": 1947, "minPower": 1948};

// Read first param
var tibber_prop = process.argv.slice(2);
do_log("starting (" + tibber_prop +")");

function do_log(msg)
{
	if (tibber_prop == "") { console.log(msg); }
}

// Jeedom
const http = require('http');
const url='http://localhost/core/api/jeeApi.php?plugin=virtual&type=event&apikey='+process.env.JEEDOM_KEY;

// Tibber
const token=process.env.TIBBER_KEY;

// Get the subscription URL first

const https = require('https');
const data = JSON.stringify({
	"query": "{viewer {websocketSubscriptionUrl}}"
  })

const options = {
	hostname: 'api.tibber.com',
	port: 443,
	path: '/v1-beta/gql',
	method: 'POST',
	headers: {
		'Authorization': 'Bearer ' + token,
		'Content-Type': 'application/json',
		'User-Agent': 'jeedom/1.0.0',
		'Content-Length': data.length
	}
}

var subscriptionURL
const req = https.request(options, res => {
	do_log(`statusCode Tibber: ${res.statusCode}`)
	res.on('data', d => {
	  var resp = JSON.parse(d)
	  //do_log(resp);
	  subscriptionURL = resp.data.viewer.websocketSubscriptionUrl
	  do_log("subscriptionURL = " + subscriptionURL);
	})
})

req.write(data)
req.end()

// Tibber
do_log("Opening ws to tibber"); 
const WebSocket = require('ws');

do_log("Create client")
const { createClient } = require('graphql-ws');

class MyWebSocket extends WebSocket {
	constructor(address, protocols) {
	  super(address, protocols, {
		headers: {
		  // your custom headers go here
		  'User-Agent': 'jeedom/1.0.0'
		},
	  });
	}
  }

const client = createClient({
  url: subscriptionURL,
  webSocketImpl: MyWebSocket,
  connectionParams: {
	token: token
  },
  on: {
    connected: () => {
      console.log(`GRAPHQL-WS CONNECTED`);
    }
  }	
});


do_log("Client created")

client.on('connected', function() {
  do_log("Connected");
});

client.on('opened', function open(socket) {
  do_log("In open: protocol is " + ws.protocol, " state is : " + ws.readyState);
  MyWebSocket.send('{"type":"init","payload":"token='+token+'"}', function ack(error) {
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

client.on('message', function incoming(data) {
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

client.on('error', function () {
  do_log("Error event received");
});

client.on('closed', function () {
  do_log("Close event received");
});


