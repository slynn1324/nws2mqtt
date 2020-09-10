const fs = require('fs');
const mqtt = require('async-mqtt');
const https = require('https');

var args = process.argv.slice(2);

if ( args.length != 1 ){
	console.log("Usage: node nws.js {configFilePath}");
	process.exit(1);
}

const config = JSON.parse(fs.readFileSync(args[0], 'utf8'));

run();

async function run(){

	const client = await mqtt.connectAsync(config.mqttUrl, {username: config.mqttUsername, password: config.mqttPassword});

	try{

		for ( let i = 0; i < config.locations.length; ++i ){
			let location = config.locations[i];

			const weather = await getReport(location.latitude, location.longitude);

			const obs = parseObservations(weather);

			for ( key in obs ){
				await client.publish(config.topicPrefix + '/' + location.locationId + '/sensor/' + key, obs[key]);
			}

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
