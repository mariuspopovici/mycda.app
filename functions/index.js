const path = require("node:path");
const zlib = require("node:zlib");
const { promisify } = require("node:util");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { onRequest } = require("firebase-functions/v2/https");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { defineSecret } = require("firebase-functions/params");
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

initializeApp();
const db = getFirestore();
// optional summary fields (e.g. distance in files without it) are left out rather than rejected
db.settings({ ignoreUndefinedProperties: true });

/** Uploaded activity files: userdata/{uid}/activities/{activityId}.fit|.csv */
const ACTIVITY_FILE_PATH = /^userdata\/([^/]+)\/activities\/([^/]+)\.(fit|csv)$/i;

/**
 * Services the legacy web app calls through /cors. Each may only be called on its own HTTPS host,
 * so the API key substituted for the API_KEY placeholder can never be sent to an arbitrary URL.
 * Set keys with `firebase functions:secrets:set <NAME>`.
 */
const PROXY_SERVICES = {
  openweather: { host: "api.openweathermap.org", key: defineSecret("OPENWEATHER_API_KEY") },
  maps: { host: "maps.googleapis.com", key: defineSecret("GOOGLE_MAPS_API_KEY") }
};

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
 * Proxies a GET request to one of the PROXY_SERVICES, replacing the API_KEY placeholder in the url
 * with the service's key.
 *
 *   GET /api/cors?service=openweather&url=<encoded url>
 */
app.get("/cors", async (req, res) => {
  const { url, service } = req.query;

  if (typeof url !== "string" || typeof service !== "string") {
    res.status(400).send("URL and service are required.");
    return;
  }

  const config = Object.prototype.hasOwnProperty.call(PROXY_SERVICES, service) && PROXY_SERVICES[service];
  if (!config) {
    res.status(403).send("Unknown service.");
    return;
  }

  let target;
  try {
    target = new URL(url);
  } catch (error) {
    res.status(400).send("Invalid URL.");
    return;
  }

  if (target.protocol !== "https:" || target.hostname !== config.host ||
      target.username || target.password || target.port) {
    res.status(403).send("URL not allowed for this service.");
    return;
  }

  const apiKey = config.key.value();
  if (!apiKey) {
    res.status(403).send("Service API key not configured.");
    return;
  }

  try {
    const response = await fetch(target.toString().replace("API_KEY", encodeURIComponent(apiKey)));
    const body = await response.text();
    res.status(response.ok ? 200 : 502)
      .type(response.headers.get("content-type") || "text/plain")
      .send(body);
  } catch (error) {
    logger.error("Proxy request failed", { service, error: error.message });
    res.status(500).send("An error occurred while processing cors proxy request.");
  }
});

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

exports.api = onRequest(
  { cors: true, secrets: Object.values(PROXY_SERVICES).map((s) => s.key) },
  app
);

/**
 * Runs when a file is uploaded to userdata/{uid}/activities/. Parses it, stores the parsed
 * structure as {activityId}.json.gz next to the original, and records status and summary
 * statistics on activities/{activityId}. The activity must belong to the uploader.
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

    const bucket = getStorage().bucket(event.data.bucket);
    const jsonFilePath = path.posix.join(path.posix.dirname(filePath), `${activityId}.json.gz`);

    let data;
    try {
      const [content] = await bucket.file(filePath).download();
      // the format is detected from the content; CSV rows are timed from the upload
      data = await parseActivityFile(content, { startTime: new Date(event.data.timeCreated) });
    } catch (error) {
      if (error.name !== "ActivityFileError") logger.error("Parse error", { filePath, error: error.stack });
      await docRef.update({
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
        await docRef.update({ fitFile: jsonFilePath, status: "Error", statusMessage: validation.message });
        return;
      }

      const stats = getActivityData(data, { includeDataPoints: false });
      await docRef.update({
        timestamp: new Date(),
        activity_date: new Date(stats.timestamp),
        distance: stats.total_distance,
        averagePower: stats.avg_power,
        averageSpeed: stats.avg_speed,
        fitFile: jsonFilePath,
        status: "Processed"
      });
    } catch (error) {
      logger.error("Processing error", { filePath, error: error.stack });
      await docRef.update({
        fitFile: jsonFilePath,
        status: "Error",
        statusMessage: "An error occurred while processing the file."
      });
    }
  }
);
