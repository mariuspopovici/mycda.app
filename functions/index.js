
const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp(functions.config().firebase);

const path = require('path');
const EasyFit = require('easy-fit').default;
const fs = require('fs');
const os = require('os');
const util = require('util');
const mkdirp = require('mkdirp-promise');

const db = admin.firestore();
const settings = { timestampsInSnapshots: true };
db.settings(settings);

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
  const jsonFilePath = path.normalize(path.format({dir: fileDir, name: baseFileName, ext: '.json'}));
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
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(tempLocalJsonFile, dataAsString, 'utf-8');
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

