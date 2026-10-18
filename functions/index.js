const path = require("node:path");
const zlib = require("node:zlib");
const { promisify } = require("node:util");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const logger = require("firebase-functions/logger");
const express = require("express");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const {
  parseActivityFile,
  validateFileContents,
  getActivityData
} = require("./activity");

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// The web app calls https://us-central1-mycda-c43c6.cloudfunctions.net/api. Without an explicit
// region the CLI places Storage triggers on the default bucket's "us" multi-region in us-east1.
setGlobalOptions({ region: "us-central1" });

initializeApp();
const db = getFirestore();
// optional summary fields (e.g. distance in files without it) are left out rather than rejected
db.settings({ ignoreUndefinedProperties: true });

/**
 * Version of the upload pipeline, recorded on every processed activity so clients can tell results
 * of the current parser from those of the legacy one (which predates this field).
 */
const PIPELINE_VERSION = 2;

/** Uploaded activity files: userdata/{uid}/activities/{activityId}.fit|.csv */
const ACTIVITY_FILE_PATH = /^userdata\/([^/]+)\/activities\/([^/]+)\.(fit|csv)$/i;

const app = express();
app.use(compression());
app.use(cookieParser());
app.use(validateFirebaseIdToken);

/**
 * Express middleware that requires a Firebase ID token, passed as `Authorization: Bearer <token>`
 * or in a `__session` cookie. The decoded token is available as `req.user`.
 */
async function validateFirebaseIdToken(req, res, next) {
  const header = req.headers.authorization || "";
  const idToken = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : req.cookies && req.cookies.__session;

  if (!idToken) {
    res.status(403).send("Unauthorized");
    return;
  }

  try {
    req.user = await getAuth().verifyIdToken(idToken);
    next();
  } catch (error) {
    logger.warn("Invalid Firebase ID token", { error: error.message });
    res.status(403).send("Unauthorized");
  }
}

/**
 * Returns the caller's parsed activity: summary, laps and data points (see docs/architecture/data-model.md).
 * Responds 404 for missing and foreign activities alike, so activity IDs can't be probed.
 */
app.get("/activity/:activity", async (req, res) => {
  const doc = await db.collection("activities").doc(req.params.activity).get();
  if (!doc.exists || doc.data().uid !== req.user.uid) {
    res.status(404).send("No such activity exists!");
    return;
  }

  try {
    const [compressed] = await getStorage().bucket().file(doc.data().fitFile).download();
    const data = JSON.parse(await gunzip(compressed));
    res.status(200).json(getActivityData(data));
  } catch (error) {
    logger.error("Get activity failed", { activity: req.params.activity, error: error.message });
    res.status(500).send("An error occurred.");
  }
});

/** Message for activities whose upload never completed, so there is nothing to process. */
const NO_UPLOAD_MESSAGE = "The upload didn't finish, so there's no file to process. Delete this activity and upload the file again.";

/**
 * Runs processing again on the caller's stored upload: for activities stuck at "New" (lost
 * trigger, interrupted upload) and for errors the current parser may now handle.
 * Responds with the resulting status.
 */
app.post("/activity/:activity/reprocess", async (req, res) => {
  const docRef = db.collection("activities").doc(req.params.activity);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().uid !== req.user.uid) {
    res.status(404).send("No such activity exists!");
    return;
  }

  const bucket = getStorage().bucket();
  const base = `userdata/${req.user.uid}/activities/${docRef.id}`;
  let original;
  for (const candidate of [`${base}.fit`, `${base}.csv`]) {
    const [exists] = await bucket.file(candidate).exists();
    if (exists) {
      original = candidate;
      break;
    }
  }

  try {
    if (!original) {
      await docRef.update({ processedWith: PIPELINE_VERSION, status: "Error", statusMessage: NO_UPLOAD_MESSAGE });
    } else {
      const [metadata] = await bucket.file(original).getMetadata();
      await processUpload(bucket, original, docRef, new Date(metadata.timeCreated));
    }
    const updated = (await docRef.get()).data();
    res.status(200).json({ status: updated.status, statusMessage: updated.statusMessage || null });
  } catch (error) {
    logger.error("Reprocess failed", { activity: docRef.id, error: error.stack });
    res.status(500).send("An error occurred.");
  }
});

exports.api = onRequest(
  // an explicit empty list: omitting it leaves bindings from earlier deploys (the removed /cors
  // proxy's keys) attached to the function
  { cors: true, secrets: [] },
  app
);

/**
 * Parses an uploaded activity file, stores the parsed structure as {activityId}.json.gz next to
 * the original, and records status and summary statistics on the activity document.
 * @param {Date} startTime upload time, used to date CSV files
 */
async function processUpload(bucket, filePath, docRef, startTime) {
  const activityId = docRef.id;
  const jsonFilePath = path.posix.join(path.posix.dirname(filePath), `${activityId}.json.gz`);

  let data;
  try {
    const [content] = await bucket.file(filePath).download();
    // the format is detected from the content; CSV rows are timed from the upload
    data = await parseActivityFile(content, { startTime });
  } catch (error) {
    if (error.name !== "ActivityFileError") logger.error("Parse error", { filePath, error: error.stack });
    await docRef.update({
      processedWith: PIPELINE_VERSION,
      status: "Error",
      statusMessage: error.name === "ActivityFileError"
        ? error.message
        : "An error occurred while reading the file. Please read the FAQ for additional information about supported file types."
    });
    return;
  }

  try {
    // the parsed file is kept in Storage; the activity document only holds a summary
    await bucket.file(jsonFilePath).save(await gzip(JSON.stringify(data)), {
      contentType: "application/gzip"
    });

    const validation = validateFileContents(data);
    if (validation.invalid) {
      await docRef.update({ processedWith: PIPELINE_VERSION, fitFile: jsonFilePath, status: "Error", statusMessage: validation.message });
      return;
    }

    const stats = getActivityData(data, { includeDataPoints: false });
    await docRef.update({
      processedWith: PIPELINE_VERSION,
      timestamp: new Date(),
      activity_date: new Date(stats.timestamp),
      distance: stats.total_distance,
      averagePower: stats.avg_power,
      averageSpeed: stats.avg_speed,
      fitFile: jsonFilePath,
      status: "Processed",
      statusMessage: FieldValue.delete()
    });
  } catch (error) {
    logger.error("Processing error", { filePath, error: error.stack });
    await docRef.update({
      processedWith: PIPELINE_VERSION,
      fitFile: jsonFilePath,
      status: "Error",
      statusMessage: "An error occurred while processing the file."
    });
  }
}

/**
 * Runs when a file is uploaded to userdata/{uid}/activities/. The activity must belong to the
 * uploader.
 */
exports.processActivityFile = onObjectFinalized(
  { memory: "512MiB", timeoutSeconds: 120 },
  async (event) => {
    const filePath = event.data.name;
    const match = ACTIVITY_FILE_PATH.exec(filePath);
    if (!match) return;
    const [, uid, activityId] = match;

    const docRef = db.collection("activities").doc(activityId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().uid !== uid) {
      logger.warn("Upload does not match an activity owned by the uploader", { filePath });
      return;
    }

    await processUpload(getStorage().bucket(event.data.bucket), filePath, docRef, new Date(event.data.timeCreated));
  }
);
