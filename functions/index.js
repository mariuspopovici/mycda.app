
const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp(functions.config().firebase);

const path = require('path');
const EasyFit = require('easy-fit').default;
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

const db = admin.firestore();



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
app.get('/:activity', async (req, res) => {
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

    let session = fit.activity.sessions[0];

    let data = {
      timestamp: fit.activity.timestamp,
      start_time: session.start_time,
      total_elapsed_time: session.total_elapsed_time,
      avg_speed: session.avg_speed,
      avg_cadence: session.avg_cadence,
      avg_power: session.avg_power,
      lap_count: session.laps.length,
      total_distance: session.total_distance,
      total_ascent: session.total_ascent,
      total_descent: session.total_descent,
      points: [],
      laps: []
    }

    console.time('Extracting from .json object.')
    session.laps.forEach((lap, i) => {
      data.laps.push({
        start_time: lap.start_time,
        total_elapsed_time: lap.total_elapsed_time,
        total_timer_time: lap.total_timer_time,
        total_distance: lap.total_distance,
        total_ascent: lap.total_ascent,
        total_descent: lap.total_descent,
        avg_power: lap.avg_power,
        avg_speed: lap.avg_speed
      });
      session.laps[i].records.forEach((record) => {
        data.points.push({
          lap: i + 1,
          timestamp: record.timestamp,
          distance: record.distance,
          power: record.power,
          altitude: record.altitude,
          speed: record.speed
        })
      });
    });

    console.log('Prepared response.');  

    res.status(200).json(data);
    return;
  } catch (error) {
    console.log(error);
    res.status(500).send('An error occurred.');
    return;
  }
});


/**
 * This HTTPS endpoint can only be accessed by your Firebase Users.
 * Requests need to be authorized by providing an `Authorization` HTTP header
 * with value `Bearer <Firebase ID Token>`.
 */
exports.activity = functions.https.onRequest(app);


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
exports.getActivityData = functions.https.onCall( async (data, context) => {
  const activity = data.activity;
  if (!(typeof activity === 'string') || activity.length === 0) {
    // throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
        'one argument "activity" containing the activity id for which the data should be fetched.');
  }  

  // Checking that the user is authenticated.
  if (!context.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
        'while authenticated.');
  }

  console.time('Get document from firestore.')

  // get the activity document which this file belongs to and attach it while setting status to 'Processed'
  let docRef = db.collection("activities").doc(activity);
  let doc = await docRef.get();
  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'The requested activity does not exist.');
  }

  console.timeEnd('Get document from firestore.')

  const fitFile = doc.data().fitFile;
  console.log('Downloading file', fitFile);

  // download the .fit file to a temporary location, read it and extract the data we need
  const bucket = admin.storage().bucket();
  const tempLocalFile = path.normalize(path.format({dir: os.tmpdir, name: activity, ext: '.json.gz'}));

  try {
    console.time('Downloading document from storage.')
    await bucket.file(fitFile).download({destination: tempLocalFile});
    console.log('Downloaded activity .fit file locally in ' + tempLocalFile);  
    console.timeEnd('Downloading document from storage.')

    console.time('Reading .json file.')
    
    const readFile = util.promisify(fs.readFile);
    let content = await readFile(tempLocalFile);
    content = await ungzip(content);

    console.timeEnd('Reading .json file.')
    
    fs.unlinkSync(tempLocalFile);

    let fit = JSON.parse(content);
    console.log('Read and parsed contents.');  

    let session = fit.activity.sessions[0];

    let data = {
      start_time: session.start_time,
      total_elapsed_time: session.total_elapsed_time,
      avg_speed: session.avg_speed,
      avg_cadence: session.avg_cadence,
      avg_power: session.avg_power,
      lap_count: session.laps.length,
      total_distance: session.total_distance,
      total_ascent: session.total_ascent,
      total_descent: session.total_descent,
      points: []
    }

    console.time('Extracting from .json object.')
    session.laps.forEach((lap, i) => {
      session.laps[i].records.forEach((record) => {
        data.points.push({
          lap: i + 1,
          timestamp: record.timestamp,
          distance: record.distance,
          power: record.power,
          altitude: record.altitude,
          speed: record.speed
        })
      });
    });
    console.timeEnd('Extracting from .json object.')
    console.log('Prepared response.');  

    

    // return data to caller as JSON
    return data;
  } catch (error) {
    console.log(error);
    throw new functions.https.HttpsError('error', 'An error occurred.' + error);
  }
});



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
      
  const filePath = object.name;
  const fileName = path.basename(filePath); // just file name with extension

  if (!fileName.endsWith('fit')) {
    console.log('A file was uploaded but it is not a valid .fit activity file.');
    return null;
  }
  else {
    console.log('A new .fit file was uploaded.')
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
    await bucket.file(filePath).download({destination: tempLocalFile});
    console.log('Downloaded activity .fit file locally in ' + tempLocalFile);
    
    // read file content
    const readFile = util.promisify(fs.readFile);
    let content = await readFile(tempLocalFile);
    
    let easyFit = new EasyFit({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      temperatureUnit: 'kelvin',
      elapsedRecordField: true,
      mode: 'cascade',
    });

    // can't promisify this because it depends on config passed through constructor of EasyFit
    let data = await new Promise((resolve, reject) => {
      easyFit.parse(content, (error, data) => {
        if (error) {
          reject(error)
        } else {
          console.log('Succesfully parsed .fit activity file.');
          resolve(data);
        }
      });
    });
    
    
    // we store the serialized FIT data as a .json file in Firestore to avoid moving it across the network unless we really need the data
    // we will however keep some metadata in the activity document in firestore for convenience
    
    let dataAsString = JSON.stringify(data);
    const compressed = await gzip(dataAsString);

    const writeFile = util.promisify(fs.writeFile);
    await writeFile(tempLocalJsonFile, compressed, 'utf-8');
    console.log('Converted to .json file at', tempLocalJsonFile);

    // store the .json file in storage
    await bucket.upload(tempLocalJsonFile, {destination: jsonFilePath});
    console.log('Upload .json file to Storage at', jsonFilePath);

    // once the file has been converted delete the local files to free up disk space.
    fs.unlinkSync(tempLocalJsonFile);
    fs.unlinkSync(tempLocalFile);

    // get the activity document which this file belongs to and attach it while setting status to 'Processed'
    let docRef = db.collection("activities").doc(activityId);

    const session = data.activity.sessions[0];
    return docRef.update({
      // .fit file metadata
      timestamp: data.activity.timestamp,
      distance: session.total_distance,
      averagePower: session.avg_power,
      averageSpeed: session.avg_speed,
      // location of converted .fit file
      fitFile: jsonFilePath,
      status: 'Processed'
    });

  } catch (error) {
    console.error(error);
    return null;
  }
})

