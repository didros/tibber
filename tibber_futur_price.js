#!/usr/bin/node

// Config
// Compute lower price from now to "max_time"
// (make sure low price window does not wait more than 24 hours)
const max_time = 8

// Read first param -> time window
var window_size = process.argv.slice(2);

do_log("starting");

function do_log(msg)
{
	if (window_size == "") { console.log(msg); }
}

// Jeedom
const http = require('http');
const url=process.env.JEEDOM_URL+'/core/api/jeeApi.php?plugin=virtual&type=event&apikey='+process.env.JEEDOM_KEY;

// Tibber
const token=process.env.TIBBER_KEY;
const https = require('https');

const data = JSON.stringify({
	"query": "{viewer {homes {currentSubscription {priceInfo {today {total energy tax startsAt } tomorrow {total energy tax startsAt }}}}}}"
  })
  
const options = {
	hostname: 'api.tibber.com',
	port: 443,
	path: '/v1-beta/gql',
	method: 'POST',
	headers: {
		'Authorization': 'Bearer ' + token,
		'Content-Type': 'application/json',
		'Content-Length': data.length
	}
}

const median = arr => {
	let middle = Math.floor(arr.length / 2);
	  arr = [...arr].sort((a, b) => a - b);
	return arr.length % 2 !== 0 ? arr[middle] : (arr[middle - 1] + arr[middle]) / 2;
};

class Queue {

	constructor(arg = 3) {
		// Initializing the queue with given arguments 
		this.nb = arg
		this.elements = []
		this.average = 0
		this.cheaper  = 100
		this.counter = 0
		this.inHour  = 0
	}

	// Proxying the push/shift methods
	push(args) {
		this.counter++
		this.elements.push(args); // Add a new at the end
		if (this.elements.length == this.nb) {
			var sum = this.elements.reduce(function(a, b){
				return a + b;
			}, 0);
			this.average =sum / this.nb 
			if (this.average < this.cheaper) {
				this.cheaper = this.average
				this.inHour = this.counter - this.nb
				//do_log("Lowest = " + this.cheaper + " in  " + this.inHour)
			}
			// do_log("Sliding average = " + this.average)
			this.elements.shift()     // Remove first element
		}
		return this.average;
	}

	getCheaper() {
		return this.cheaper
	}

	whenLowest() {
		return this.inHour
	}
		
}

const d    = new Date();
let   hour = d.getHours();
var   average = 0;
var   nb = 0;
const p = (window_size == "") ? 3: window_size
do_log(`Time window : ${p}`)
do_log(`Max time    : ${max_time}`)
let   q = new Queue(p);
do_log("hour = " + hour)

const req = https.request(options, res => {
	do_log(`statusCode Tibber: ${res.statusCode}`)
  
	res.on('data', d => {
		// process.stdout.write(d)
		var resp = JSON.parse(d)
		do_log("Response: " + JSON.stringify(resp));

		const priceList=[];
		resp.data.viewer.homes[1].currentSubscription.priceInfo.today.forEach((value, index, array) => {
			if (index >= hour) {
				do_log("today at " + index + ") : " + value.total)
				priceList.push(value.total)
				average += value.total
				nb++
				q.push(value.total)
			}
		});

		if (resp.data.viewer.homes[1].currentSubscription.priceInfo.tomorrow.length == 24) {
			resp.data.viewer.homes[1].currentSubscription.priceInfo.tomorrow.forEach((value, index, array) => {
				if (index < max_time) {
				   do_log("tomor at " + index + ") : " + value.total)
				   priceList.push(value.total)
				   average += value.total
				   nb++
				   q.push(value.total)
				}
   			});
		}
		else {
			do_log("No data for tomorrow, to early (" + hour + ")");
		}

		average = average/nb;
		do_log("Nb      = " + nb)
		do_log("Average = " + average)
		do_log("Median  = " + median(priceList));
		do_log("Lowest is " + q.getCheaper() + " in " + q.whenLowest() + " hours");

	  	if (window_size) { console.log(q.whenLowest()); }
	})
})

req.on('error', error => {
	console.error(error)
})
  
req.write(data)
req.end()

