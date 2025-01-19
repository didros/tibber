#!/usr/bin/node

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
const https = require('https');

const data = JSON.stringify({
	"query": "{viewer {homes {currentSubscription {priceInfo {current {total energy tax startsAt }}}}}}"
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
	  do_log("Response: " + JSON.stringify(resp));
	  value = resp.data.viewer.homes[1].currentSubscription.priceInfo.current.total
	  do_log("Value: " + value);
	  if (tibber_prop == "price") { console.log(value); }
		
	  	https.get(url + "&id=1323&value=" + value, (r) => {
			do_log(`statusCode Jeedom: ${r.statusCode}`)
		}).on("error", (err) => {
	   		do_log("Error to update Jeedom: " + err.message);
	 	});

	})
})

req.on('error', error => {
	console.error(error)
})
  
req.write(data)
req.end()



/******

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
		if (tibber_prop == "power") { console.log(resp.payload.data.liveMeasurement.power); }

		http.get(url + "&id=1323&value=" + resp.payload.data.liveMeasurement.power, (resp) => {

		   let data = '';

		   // A chunk of data has been recieved.
		   resp.on('data', (chunk) => {
		      data += chunk;
		   });

		   // The whole response has been received. Print out the result.
		   resp.on('end', () => {
			do_log(data);
			do_log("Update Jeedom looks good (power="+""+")!");
		   });

		}).on("error", (err) => {
		  do_log("Error to update Jeedom: " + err.message);
		});


		}).on("error", (err) => {
		  do_log("Error to update Jeedom: " + err.message);
		});

	}
  }
});

****/


