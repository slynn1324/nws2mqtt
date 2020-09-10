const mqtt = require('async-mqtt');
const https = require('https');

var args = process.argv.slice(2);

if ( args.length != 3 ){
	console.log("Usage: node nws.js {locationId} {latitude} {longitude}");
	process.exit(1);
}

const locationId = args[0]; // kmle
const lat = args[1]; // '41.2';
const lon = args[2]; //'-96.11';

run();

async function run(){

	const weather = await getReport(lat, lon);
	const obs = parseObservations(weather);

	const client = await mqtt.connectAsync('mqtt://homebridge');

	try{

		for ( key in obs ){
			//console.log(key + " -> " + obs[key]);
			await client.publish('nws/' + locationId + '/sensor/' + key, obs[key]);
		}

		client.end();

	} catch (err){
		console.log(err);
		process.exit(2);
	}
	

}

function f2c(c){
	return ((c-32) * (5/9)).toFixed(2);
}

function parseObservations(weather){

	const obs = {};
	obs.temperature = f2c(weather.currentobservation.Temp);
	obs.dewpoint = f2c(weather.currentobservation.Dewp);
	obs.relativeHumidity = weather.currentobservation.Relh;
	obs.windSpeed = weather.currentobservation.Winds;
	obs.windDirection = weather.currentobservation.Windd;
	obs.windGust = weather.currentobservation.Gust;
	obs.visibility = weather.currentobservation.Visibility;
	obs.baramoter = weather.currentobservation.SLP;

	return obs;

}


async function getReport(lat, lon){

	return new Promise((resolve, reject) => {

		https.get('https://forecast.weather.gov/MapClick.php?lat=' + lat + '&lon=' + lon + '&unit=0&lg=english&FcstType=json', {headers: {"User-Agent":"me"}},  (resp) => {

			let data = '';

			resp.on('data', (chunk) => {
				data += chunk;
			});

			resp.on('end', () => {
				// console.log(data);
				resolve(JSON.parse(data));
			});

		}).on('error', (err) => {
			console.log("ERROR: " + err.message);
			reject(err);
		});

	});
	
}
