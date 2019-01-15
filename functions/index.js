
const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');
const functions = require('firebase-functions');

admin.initializeApp(functions.config().firebase);


const db = admin.firestore();

const app = express();
const main = express();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});

