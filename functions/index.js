
const admin = require('firebase-admin');
const functions = require('firebase-functions');
admin.initializeApp(functions.config().firebase);

const path = require('path');
const EasyFit = require('easy-fit').default;
const fs = require('fs');
const os = require('os');


const db = admin.firestore();


exports.processActivityFile = functions.storage.object().onFinalize(async (object) => {
      
    // this gets raised every time a file gets uploaded in storage
    const filePath = object.name;
    const fileName = path.basename(filePath);
    const fileBucket = object.bucket; 

    console.log('a file was uploaded')

    if (!fileName.endsWith('fit')) {
        return console.log('Not a valid .fit activity file');
    }

    // get the file contents and parse it
    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    await bucket.file(filePath).download({destination: tempFilePath});

    console.log('file: ', tempFilePath);

    fs.readFile(tempFilePath, (error, content) => {
      if (error) {
          console.log(error);
          return;
      }

      var easyFit = new EasyFit({
          force: true,
          speedUnit: 'km/h',
          lengthUnit: 'km',
          temperatureUnit: 'kelvin',
          elapsedRecordField: true,
          mode: 'cascade',
      });

      easyFit.parse(content, (error, data) => {
        if (error) {
          console.log(error);
          return;
        } else {
          console.log(JSON.stringify(data));
        }
      });
    });

    return 0;
})

