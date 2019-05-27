
const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp(functions.config().firebase);


const path = require('path');
const EasyFit = require('easy-fit').default;
const CSV = require ('./csv');
const fs = require('fs');
const os = require('os');
const util = require('util');
const mkdirp = require('mkdirp-promise');
const {gzip, ungzip} = require('node-gzip');
const compression = require('compression');
const cookieParser = require('cookie-parser')();
const express = require('express');
const app = express();
const cors = require('cors')({origin: true});
const fetch = require('node-fetch');

const db = admin.firestore();
db.settings({ timestampsInSnapshots: true })


/**
 * Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
 * The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
 * `Authorization: Bearer <Firebase ID Token>`.
 * when decoded successfully, the ID Token content will be added as `req.user`.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const validateFirebaseIdToken = async (req, res, next) => {
  console.log('Check if request is authorized with Firebase ID token');

  if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
      !(req.cookies && req.cookies.__session)) {
    console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.',
        'Make sure you authorize your request by providing the following HTTP header:',
        'Authorization: Bearer <Firebase ID Token>',
        'or by passing a "__session" cookie.');
    res.status(403).send('Unauthorized');
    return;
  }

  let idToken;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    console.log('Found "Authorization" header');
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else if(req.cookies) {
    console.log('Found "__session" cookie');
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  } else {
    // No cookie
    res.status(403).send('Unauthorized');
    return;
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    console.log('ID Token correctly decoded', decodedIdToken);
    req.user = decodedIdToken;
    next();
    return;
  } catch (error) {
    console.error('Error while verifying Firebase ID token:', error);
    res.status(403).send('Unauthorized');
    return;
  }
};


app.use(cors);
app.use(compression());
app.use(cookieParser);
app.use(validateFirebaseIdToken);


/**
 * Returns the response body of the requested url, url should be encoded with encodeURIComponent if there are additional
 * parameters for the requested url.
 *
 * Example request using URL query parameters:
 *   https://us-central1-<project-id>.cloudfunctions.net/cors?url=https%3A%2F%2Fapi.ipify.org%3Fformat%3Djson
 * Example request using request body with cURL:
 *   curl -H 'Content-Type: application/json' \
 *        -d '{"url": "https://api.ipify.org/?format=json"}' \
 *        https://us-central1-<project-id>.cloudfunctions.net/cors
 *
 * This endpoint supports CORS.
 */
app.get('/cors', async (req, res) => {
  cors(req, res, () => {
    console.log('Query:', req.query);
    console.log('Body:', req.body);

    let url = req.query.url;

    if (!url) {
      url = req.body.url;
    }

    if (!url) {
      res.status(403).send('URL is empty.');
    }

    console.log('Request:', url);

    fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': req.get('Content-Type'),
      },
    })
    .then(r => r.headers.get('content-type') === 'application/json' ? r.json() : r.text())
    .then(body => res.status(200).send(body))
    .catch(e => {
      console.log("Fetch Error:", e);
      res.status(500).send('An error occurred while processing cors proxy request.')
    });
  });
});

/**
 * Takes activity ID as a parameter and extracts power, speed, cadence, altitude etc. from .fit file 
 * associated with the activity. Returns it all nicely wrapped in a JSON object with the following structure:
 * {
 *   start_time, 
 *   total_elapsed_time, 
 *   avg_speed, 
 *   avg_cadence, 
 *   avg_power, 
 *   lap_count, 
 *   total_ascent,
 *   total_descent,
 *   total_distance,
 *   points: [{
 *      lap, 
 *      timestamp,
 *      distance,
 *      power,
 *      altitude,
 *      speed,
 *      cadence
 *   }]
 * }
 */
app.get('/activity/:activity', async (req, res) => {
  let activity = req.params.activity;
  if (!activity) {
    res.status(400).send('Missing parameters!');
    return;
  }

  console.log('Got request for activity:', activity);
  // get the activity document which this file belongs to and attach it while setting status to 'Processed'
  let docRef = db.collection("activities").doc(activity);
  let doc = await docRef.get();
  if (!doc.exists) {
    res.status(404).send('No such activity exists!');
    return;
  }

  const fitFile = doc.data().fitFile;
  console.log('Downloading file', fitFile);

  // download the .fit file to a temporary location, read it and extract the data we need
  const bucket = admin.storage().bucket();
  const tempLocalFile = path.normalize(path.format({dir: os.tmpdir, name: activity, ext: '.json.gz'}));

  try {
    await bucket.file(fitFile).download({destination: tempLocalFile});
    console.log('Downloaded activity .fit file locally in ' + tempLocalFile);  

    const readFile = util.promisify(fs.readFile);
    let content = await readFile(tempLocalFile);
    
    // content will be gzip compressed so we uncompress it
    content = await ungzip(content);
    fs.unlinkSync(tempLocalFile);

    let fit = JSON.parse(content);
    console.log('Read and parsed contents.');  

    let data = getActivityData(fit)

    console.log('Prepared response.');  

    res.status(200).json(data);
    return;
  } catch (error) {
    console.log('Get Activity Error', error);
    res.status(500).send('An error occurred.');
    return;
  }
});


/**
 * This HTTPS endpoint can only be accessed by your Firebase Users.
 * Requests need to be authorized by providing an `Authorization` HTTP header
 * with value `Bearer <Firebase ID Token>`.
 */
exports.api = functions.https.onRequest(app);


/**
 * This gets raised every time a file gets uploaded in storage
 * - downloads the .FIT file from storage
 * - parses the .FIT file using EasyFit
 * - converts the .FIT file to a .json file
 * - stores the .json file in the same location as the original
 * - sets the download URL on the activity document so we can retrieve the .json file later when we need it
 * - saves some metadata in the activity document 
 */
exports.processActivityFile = functions.storage.object().onFinalize(async (object) => {
  console.log('Processing activity file.');    
  const filePath = object.name;
  const fileName = path.basename(filePath); // just file name with extension
  const fileExtension = path.extname(fileName);

  if (fileExtension !== '.fit' && fileExtension !== '.csv')  {
    console.log('A file was uploaded but it is not a valid activity file.');
    return null;
  }
  else {
    console.log(`A new ${fileExtension} file was uploaded.`);
  }
  
  const baseFileName = path.basename(filePath, path.extname(filePath)); // file name without extension
  const fileDir = path.dirname(filePath);
  
  // this is the .json converted file 
  const jsonFilePath = path.normalize(path.format({dir: fileDir, name: baseFileName, ext: '.json.gz'}));
  const tempLocalFile = path.join(os.tmpdir(), filePath);
  const tempLocalDir = path.dirname(tempLocalFile);
  const tempLocalJsonFile = path.join(os.tmpdir(), jsonFilePath);
  
  const fileBucket = object.bucket; 
  
  // .fit file name contains the activity ID 
  const activityId = baseFileName;
  
  // get the file from storage, save it locally, read contents and parse it
  const bucket = admin.storage().bucket(fileBucket);
  
  // create the temp directory where the storage file will be downloaded.
  await mkdirp(tempLocalDir);
  
  try {
    
    // get the activity document which this file belongs to and attach it while setting status to 'Processed'
    let docRef = db.collection("activities").doc(activityId);

    await bucket.file(filePath).download({destination: tempLocalFile});
    console.log(`Downloaded activity ${fileExtension} file locally in ${tempLocalFile}`);
    
    // read file content
    const readFile = util.promisify(fs.readFile);
    let content = await readFile(tempLocalFile);
    let data = {};
    
    try {
      switch(fileExtension) {
        case '.fit':
          data = await parseFIT(content);
          break;
        case '.csv':
          data = await parseCSV(content.toString());
          break;
      }
    } catch(error) {    
      await docRef.update({
        status: 'Error',
        statusMessage: `An error occurred while parsing ${fileExtension} file. Please read the FAQ for additional information about supported file types.`
      });
      console.log('Parse Error', error);
      return null;
    }
    
    // we store the serialized FIT data as a .json file in Firestore to avoid moving it across the network unless we really need the data
    // we will however keep some metadata in the activity document in firestore for convenience
    const dataAsJSON = JSON.stringify(data);
    const compressed = await gzip(dataAsJSON);

    const writeFile = util.promisify(fs.writeFile);
    await writeFile(tempLocalJsonFile, compressed, 'utf-8');
    console.log('Converted to .json file at', tempLocalJsonFile);

    // store the .json file in storage
    await bucket.upload(tempLocalJsonFile, {destination: jsonFilePath});
    console.log('Upload .json file to Storage at', jsonFilePath);

    // once the file has been converted delete the local files to free up disk space.
    fs.unlinkSync(tempLocalJsonFile);
    fs.unlinkSync(tempLocalFile);

    let result = validateFileContents(data)
    if (result.invalid) {
      try {
        return docRef.update({
          fitFile: jsonFilePath,
          status: 'Error',
          statusMessage: result.message
        });
      } catch (e) {
        console.log('Validation Status Update Error', e)
        return null;
      }
    }
    else {
      try {
        const stats = getActivityData(data, {
          includeDataPoints: false
        });
        var doc = {
          // .fit file metadata
          timestamp: new Date(),
          activity_date: stats.timestamp,
          distance: stats.total_distance,
          averagePower: stats.avg_power,
          averageSpeed: stats.avg_speed,
          // location of converted .fit file
          fitFile: jsonFilePath,
          status: 'Processed'
        };
        return docRef.update(doc);
      } catch (e) {
        console.error('Get Activity Data Error', e);
        return docRef.update({
          fitFile: jsonFilePath,
          status: 'Error',
          statusMessage: 'An error occurred while processing .FIT file.'
        });
      }
    }
  } catch (error) {
    console.error('Processing Error', error);
    return null;
  }
})

function parseCSV(content) {
  let csv = new CSV({
    speedUnit: 'km/h'
  });
  return new Promise((resolve, reject) => {
    csv.parse(content, (error, data) => {
      if (error) {
        reject(error)
      } else {
        console.log('Succesfully parsed .csv activity file.');
        resolve(data);
      }
    });
  });
}

function parseFIT(content) {
  let easyFit = new EasyFit({
    force: true,
    speedUnit: 'km/h',
    lengthUnit: 'km',
    temperatureUnit: 'kelvin',
    elapsedRecordField: true,
    mode: 'cascade',
  });

  return new Promise((resolve, reject) => {
    easyFit.parse(content, (error, data) => {
      if (error) {
        reject(error)
      } else {
        console.log('Succesfully parsed .fit activity file.');
        resolve(data);
      }
    });
  });
}


function validateFileContents(data) {

  if (data.file_id.type !== 'activity') {
    return {
      invalid: true,
      message: 'Invalid file. Not a .FIT activity file.'
    };
  }
  

  if (!data.activity.sessions || data.activity.sessions.length === 0) {
    return {
      invalid: true,
      message: `Invalid file. Missing FIT session data.`
    };
  }

  let session = data.activity.sessions[0];
  
  if (session.sport !== 'cycling') {
    return {
      invalid: true,
      message: `Invalid file. .FIT session sport type is not cycling but ${session.sport}.`
    };
  }
  
  if (session.laps.length === 0) {
    return {
      invalid: true,
      message: `Invalid file. Missing lap data.`
    };
  }

  let record = session.laps[0].records[0]
  if (! ('speed' in record )) {
    return {
      invalid: true,
      message: 'Invalid file. Missing speed data.'
    };
  }

  if (! ('power' in record )) {
    return {
      invalid: true,
      message: 'Invalid file. Missing power data.'
    };
  }

  return {
    invalid: false,
    message: ''
  };
}


function getActivityData(data, options = { includeDataPoints: true }) {
  const session = data.activity.sessions[0];
  const timestamp = session.laps[0].records[0].timestamp;
  const laps = session.laps;
  let stats = null
  let fileHasStats = session.avg_power && session.avg_speed;

  if (fileHasStats) {
    // file has stats such as session and lap averages 
    stats = {
      timestamp: timestamp,
      start_time: timestamp,
      total_distance: session.total_distance,
      total_elapsed_time: session.total_elapsed_time,
      avg_power: session.avg_power,
      avg_speed: session.avg_speed,
      lap_count: laps.length,
      laps: [],
      points: []
    }

    laps.forEach((lap, i) => {
      stats.laps.push({
        start_time: lap.start_time,
        total_elapsed_time: lap.total_elapsed_time,
        total_distance: lap.total_distance,
        start_distance: lap.records.length > 0 ? lap.records[0].distance : 0,
        avg_power: lap.avg_power,
        avg_speed: lap.avg_speed
      })

      if (options.includeDataPoints) {
        lap.records.forEach((record) => {
          stats.points.push({
            lap: i + 1,
            timestamp: record.timestamp,
            distance: record.distance,
            power: record.power,
            altitude: record.altitude,
            speed: record.speed,
            airspeed: record.air_speed ? record.air_speed : record.saturated_hemoglobin_percent,
            lat: record.position_lat,
            long: record.position_long
          })
        });
      }

    });
  }
  else {
    // calculate stats from data
    let sumPower = 0;
    let sumSpeed = 0;
    let recordCount = 0
    let totalDistance = 0
    let totalElapsedTime = 0
    let lapStats = []
    let dataPoints = []

    laps.forEach((lap, i) => {
      
      let lapSumPower = 0
      let lapSumSpeed = 0
      
      let lapStartDistance = lap.records[0].distance
      let lapStartElapsedTime = lap.records[0].elapsed_time

      lap.records.forEach((record) => {
        recordCount++;
        sumPower += record.power;
        sumSpeed += record.speed;
        lapSumPower += record.power;
        lapSumSpeed += record.speed;
        totalDistance = record.distance;
        totalElapsedTime = record.elapsed_time;

        if (options.includeDataPoints) {
          dataPoints.push({
            lap: i + 1,
            timestamp: record.timestamp,
            distance: record.distance,
            power: record.power,
            altitude: record.altitude,
            speed: record.speed,
            airspeed: record.air_speed ? record.air_speed : record.saturated_hemoglobin_percent,
            lat: record.position_lat,
            long: record.position_long
          });
        }

      })

      lapStats.push({
        start_time: lap.start_time,
        avg_power: Math.ceil(lapSumPower / lap.records.length),
        avg_speed: (lapSumSpeed / lap.records.length).toFixed(4),
        start_distance: lapStartDistance,
        total_distance: (totalDistance - lapStartDistance),
        total_elapsed_time: totalElapsedTime - lapStartElapsedTime
      });
    })

    const avgPower = Math.ceil(sumPower / recordCount);
    const avgSpeed = (sumSpeed / recordCount).toFixed(2);

    stats = {
      timestamp: timestamp,
      start_time: timestamp,
      total_distance: totalDistance,
      total_elapsed_time: totalElapsedTime,
      avg_power: avgPower,
      avg_speed: avgSpeed,
      lap_count: laps.length,
      laps: lapStats,
      points: dataPoints
    }
  }

  return stats;
}

