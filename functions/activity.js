/**
 * Activity file parsing and transformation. Free of Firebase dependencies so it can be tested.
 *
 * parseActivityFile() detects the format from the file's contents (uploads are named .fit or .csv
 * by the browser regardless of what they contain), unwraps gzip and zip archives, and returns the
 * structure of a parsed .FIT file in cascade form: activity.sessions[].laps[].records[].
 */
const zlib = require("node:zlib");
const { unzipSync } = require("fflate");
const FitParser = require("fit-file-parser").default;
const { parseCSV } = require("./csv");
const { ActivityFileError } = require("./errors");

const MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;
const MAX_ARCHIVE_DEPTH = 2;

/**
 * Identifies an uploaded file from its first bytes.
 * @returns {"empty"|"gzip"|"zip"|"fit"|"csv"|"gpx"|"tcx"|"pwx"|"html"|"unknown"}
 */
function detectFormat(buffer) {
  if (buffer.length === 0) return "empty";
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) return "gzip";
  if (buffer.toString("latin1", 0, 4) === "PK\u0003\u0004") return "zip";
  if (buffer.length >= 12 && buffer.toString("latin1", 8, 12) === ".FIT") return "fit";

  const head = buffer.toString("utf8", 0, 1024).replace(/^﻿/, "").trimStart().toLowerCase();
  if (head.startsWith("<")) {
    if (head.includes("<gpx")) return "gpx";
    if (head.includes("<trainingcenterdatabase")) return "tcx";
    if (head.includes("<pwx")) return "pwx";
    if (head.startsWith("<!doctype html") || head.startsWith("<html")) return "html";
    return "unknown";
  }
  const firstLine = head.split(/\r?\n/, 1)[0];
  if (firstLine.includes(",") && /\b(time|power|speed)\b/.test(firstLine)) return "csv";
  return "unknown";
}

/**
 * Parses an uploaded activity file of any supported format.
 * @param {Buffer} buffer file contents
 * @param {{ startTime?: Date }} options startTime dates CSV files, which carry only elapsed time
 * @throws {ActivityFileError} with a user-facing message when the file can't be used
 */
async function parseActivityFile(buffer, options = {}, depth = 0) {
  const format = detectFormat(buffer);
  switch (format) {
    case "gzip":
    case "zip":
      if (depth >= MAX_ARCHIVE_DEPTH) {
        throw new ActivityFileError("The archive is nested too deeply.");
      }
      return parseActivityFile(extract(buffer, format), options, depth + 1);
    case "fit":
      return parseFIT(buffer);
    case "csv":
      return parseCSV(buffer.toString("utf8"), options);
    case "gpx":
    case "tcx":
    case "pwx":
      throw new ActivityFileError(
        `${format.toUpperCase()} files are not supported. Upload the original .FIT file from your device or Garmin Connect.`
      );
    case "empty":
      throw new ActivityFileError("The file is empty.");
    default:
      throw new ActivityFileError("This is not a .FIT or .CSV activity file.");
  }
}

function extract(buffer, format) {
  if (format === "gzip") {
    try {
      return zlib.gunzipSync(buffer, { maxOutputLength: MAX_UNCOMPRESSED_BYTES });
    } catch (error) {
      throw new ActivityFileError("The compressed file could not be read.");
    }
  }

  let entries;
  try {
    entries = unzipSync(new Uint8Array(buffer), {
      filter: (file) => /\.(fit|csv)$/i.test(file.name) && file.originalSize <= MAX_UNCOMPRESSED_BYTES
    });
  } catch (error) {
    throw new ActivityFileError("The zip file could not be read.");
  }
  const names = Object.keys(entries).sort((a, b) => Number(/\.csv$/i.test(a)) - Number(/\.csv$/i.test(b)));
  if (names.length === 0) {
    throw new ActivityFileError("The zip file contains no .FIT or .CSV file.");
  }
  return Buffer.from(entries[names[0]]);
}

/** Parses a .FIT file and assembles sessions, laps and records, recovering missing structure. */
async function parseFIT(buffer) {
  const parser = new FitParser({
    force: true,
    speedUnit: "km/h",
    lengthUnit: "km",
    temperatureUnit: "kelvin",
    elapsedRecordField: true,
    mode: "list"
  });

  let list;
  try {
    list = await parser.parseAsync(buffer);
  } catch (error) {
    const detail = (error && (error.message || String(error))) || "unknown error";
    throw new ActivityFileError(`The .FIT file could not be read (${detail}).`);
  }
  return assembleActivity(list);
}

/**
 * Builds activity.sessions[].laps[].records[] from list-mode output, assigning records to laps and
 * laps to sessions the way fit-file-parser's cascade mode does. Files without lap or session
 * messages get one lap or session covering all records; a session's missing sport is taken from
 * the file's sport message.
 */
function assembleActivity(list) {
  const records = mergeSplitRecords(list.records || []);
  const fileSport = ((list.sports || []).find((s) => s.sport) || {}).sport;
  const firstTimestamp = records.length > 0 ? records[0].timestamp : undefined;

  let laps = (list.laps || []).map((lap) => Object.assign({}, lap, { records: undefined }));
  if (laps.length === 0) laps = [{ start_time: firstTimestamp, timestamp: firstTimestamp }];

  let sessions = (list.sessions || []).map((s) =>
    Object.assign({}, s, { sport: s.sport || fileSport, laps: undefined })
  );
  if (sessions.length === 0) sessions = [{ sport: fileSport, start_time: firstTimestamp }];

  assignByStartTime(laps, "records", records, (r) => r.timestamp);
  assignByStartTime(sessions, "laps", laps, (lap) => lap.start_time);

  return {
    file_id: list.file_id,
    activity: { sessions, sports: list.sports || [], events: list.events || [] }
  };
}

/**
 * Gives each container the items timestamped before the next container's start_time;
 * the last container takes the rest (fit-file-parser 6 cascade semantics).
 */
function assignByStartTime(containers, key, items, timeOf) {
  let index = 0;
  containers.forEach((container, i) => {
    const next = containers[i + 1];
    const nextStart = next ? time(next.start_time) : undefined;
    const assigned = [];
    while (index < items.length) {
      const t = time(timeOf(items[index]));
      if (nextStart !== undefined && t !== undefined && t >= nextStart) break;
      assigned.push(items[index]);
      index++;
    }
    container[key] = assigned;
  });
}

function time(value) {
  if (value === undefined || value === null) return undefined;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? undefined : t;
}

const hasSpeed = (r) => r.speed != null || r.enhanced_speed != null;
const hasPower = (r) => r.power != null;

/**
 * Some devices log speed and power in alternating records. Merges each speed-only record with an
 * adjacent power-only record at most 1 s away, keeping the later timestamp.
 */
function mergeSplitRecords(records) {
  const merged = [];
  for (let i = 0; i < records.length; i++) {
    const a = records[i];
    const b = records[i + 1];
    const complementary = b &&
      ((hasSpeed(a) && !hasPower(a) && hasPower(b) && !hasSpeed(b)) ||
        (hasPower(a) && !hasSpeed(a) && hasSpeed(b) && !hasPower(b)));
    if (complementary && Math.abs(time(b.timestamp) - time(a.timestamp)) <= 1000) {
      merged.push(Object.assign({}, a, definedFields(b)));
      i++;
    } else {
      merged.push(a);
    }
  }
  return merged;
}

function definedFields(record) {
  return Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined && v !== null));
}

/** The cycling session, or else the first session whose sport is unknown. */
function findSession(data) {
  const sessions = (data.activity && data.activity.sessions) || [];
  return sessions.find((s) => s.sport === "cycling") || sessions.find((s) => !s.sport);
}

function validateFileContents(data) {
  const session = findSession(data);
  if (!session) {
    const sessions = (data.activity && data.activity.sessions) || [];
    const sport = (sessions.find((s) => s.sport) || {}).sport;
    return invalid(sport
      ? `This is a ${sport} activity. MyCdA analyses cycling activities only.`
      : "The file contains no activity.");
  }

  const records = session.laps.flatMap((lap) => lap.records || []);
  if (records.length === 0) {
    return invalid("The file contains no data records.");
  }
  if (records.filter(hasSpeed).length < records.length / 2) {
    return invalid("The file has no speed data. MyCdA needs speed from a speed sensor or GPS.");
  }
  return { invalid: false, message: "" };
}

function invalid(message) {
  return { invalid: true, message };
}

function getActivityData(data, options = { includeDataPoints: true }) {
  const session = findSession(data);
  const laps = session.laps;

  const useEnhancedSpeed = session.enhanced_avg_speed && !session.avg_speed;
  const altitudeField = useEnhancedSpeed ? "enhanced_altitude" : "altitude";
  const avgSpeedField = useEnhancedSpeed ? "enhanced_avg_speed" : "avg_speed";
  const speedField = useEnhancedSpeed ? "enhanced_speed" : "speed";
  const firstLap = laps.find((lap) => lap.records.length > 0);
  const timestamp = firstLap.records[0].timestamp;

  const toPoint = (record, lapNumber) => ({
    lap: lapNumber,
    timestamp: record.timestamp,
    distance: record.distance,
    power: record.power ? record.power : 0,
    altitude: record[altitudeField],
    speed: record[speedField],
    airspeed: record.air_speed
      ? record.air_speed
      : record.saturated_hemoglobin_percent,
    lat: record.position_lat,
    long: record.position_long
  });

  let stats = null;
  const fileHasStats = session.avg_power && session[avgSpeedField];

  if (fileHasStats) {
    // file has stats such as session and lap averages
    stats = {
      timestamp: timestamp,
      start_time: timestamp,
      total_distance: session.total_distance,
      total_elapsed_time: session.total_elapsed_time,
      avg_power: session.avg_power,
      avg_speed: session[avgSpeedField],
      lap_count: laps.length,
      laps: [],
      points: []
    };

    laps.forEach((lap, i) => {
      stats.laps.push({
        start_time: lap.start_time,
        total_elapsed_time: lap.total_elapsed_time,
        total_distance: lap.total_distance,
        start_distance: lap.records.length > 0 ? lap.records[0].distance : 0,
        avg_power: lap.avg_power,
        avg_speed: lap[avgSpeedField]
      });

      if (options.includeDataPoints) {
        lap.records.forEach((record) => stats.points.push(toPoint(record, i + 1)));
      }
    });
  } else {
    // calculate stats from data
    let sumPower = 0;
    let sumSpeed = 0;
    let recordCount = 0;
    let totalDistance = 0;
    let totalElapsedTime = 0;
    const lapStats = [];
    const dataPoints = [];

    laps.forEach((lap, i) => {
      let lapSumPower = 0;
      let lapSumSpeed = 0;

      if (lap.records.length === 0) {
        lapStats.push({
          start_time: lap.start_time,
          avg_power: 0,
          avg_speed: (0).toFixed(4),
          start_distance: totalDistance,
          total_distance: 0,
          total_elapsed_time: 0
        });
        return;
      }

      const lapStartDistance = lap.records[0].distance;
      const lapStartElapsedTime = lap.records[0].elapsed_time;

      lap.records.forEach((record) => {
        recordCount++;
        sumPower += record.power || 0;
        sumSpeed += record[speedField] || 0;
        lapSumPower += record.power || 0;
        lapSumSpeed += record[speedField] || 0;
        totalDistance = record.distance;
        totalElapsedTime = record.elapsed_time;

        if (options.includeDataPoints) {
          dataPoints.push(Object.assign(toPoint(record, i + 1), { power: record.power }));
        }
      });

      lapStats.push({
        start_time: lap.start_time,
        avg_power: Math.ceil(lapSumPower / lap.records.length),
        avg_speed: (lapSumSpeed / lap.records.length).toFixed(4),
        start_distance: lapStartDistance,
        total_distance: totalDistance - lapStartDistance,
        total_elapsed_time: totalElapsedTime - lapStartElapsedTime
      });
    });

    stats = {
      timestamp: timestamp,
      start_time: timestamp,
      total_distance: totalDistance,
      total_elapsed_time: totalElapsedTime,
      avg_power: Math.ceil(sumPower / recordCount),
      avg_speed: (sumSpeed / recordCount).toFixed(2),
      lap_count: laps.length,
      laps: lapStats,
      points: dataPoints
    };
  }

  return stats;
}

module.exports = {
  detectFormat,
  parseActivityFile,
  parseFIT,
  parseCSV,
  assembleActivity,
  mergeSplitRecords,
  validateFileContents,
  getActivityData
};
