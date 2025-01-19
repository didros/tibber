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

// Read first param
var tibber_prop = process.argv.slice(2);
do_log("starting");

function do_log(msg)
{
	if (tibber_prop == "") { console.log(msg); }
}

// Jeedom
const http = require('http');
const url='http://localhost/core/api/jeeApi.php?plugin=virtual&type=event&apikey='+process.env.JEEDOM_KEY;

// Tibber
const https = require('https');

const data = JSON.stringify({
	"query": "{ viewer { homes { consumption(resolution: DAILY, last: 2) { nodes { from to cost consumption consumptionUnit }}}}}"
  })

const options = {
	hostname: 'api.tibber.com',
	port: 443,
	path: '/v1-beta/gql',
	method: 'POST',
	headers: {
		'Authorization': 'Bearer ' + process.env.TIBBER_KEY,
		'Content-Type': 'application/json',
		'Content-Length': data.length
	}
}

const req = https.request(options, res => {
	do_log(`statusCode Tibber: ${res.statusCode}`)
  
	res.on('data', d => {
	  // process.stdout.write(d)
	  var resp = JSON.parse(d)
	  do_log(resp);
	  value = resp.data.viewer.homes[1].consumption
	  do_log(value)
	  
	  var days = resp.data.viewer.homes[1].consumption.nodes.length
	  do_log("NB days = " + days)

	  var cost=0;
	  var conso=0;
	  resp.data.viewer.homes[1].consumption.nodes.forEach((value, index, array) => {
		do_log(" " + value.cost)
		cost  += value.cost;
		conso += value.consumption;
	  });

	  // console.log(cost);
	  //
	  if (tibber_prop == "price") { console.log(cost); }
	  if (tibber_prop == "conso") { console.log(conso); }

	/*
	  	// 2. etasje
	  	http.get(url + "&id=1323&value=" + value, (r) => {
			do_log(`statusCode Jeedom: ${r.statusCode}`)
		}).on("error", (err) => {
	   		do_log("Error to update Jeedom: " + err.message);
	 	});

		// 1. etasje
		http.get(url + "&id=1999&value=" + cost, (r) => {
			do_log(`statusCode Jeedom: ${r.statusCode}`)
		}).on("error", (err) => {
			do_log("Error to update Jeedom: " + err.message);
		});
	*/

	})
})

req.on('error', error => {
	console.error(error)
})
  
req.write(data)
req.end()

