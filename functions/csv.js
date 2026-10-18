/**
 * Parses MyCdA CSV activity files into the same structure as a parsed .FIT file.
 *
 * Columns (header row, any order, case-insensitive):
 *   time (required)   elapsed time as [h:]mm:ss[.s] or seconds, clock time as h:mm[:ss] AM/PM,
 *                     or an ISO 8601 date-time
 *   power (required)  W
 *   speed (required)  km/h
 *   airspeed          km/h
 *   elevation         m
 *   lap               integer lap number
 *   lat, long         degrees
 */
const { parse } = require("csv-parse/sync");
const { ActivityFileError } = require("./errors");

const REQUIRED_COLUMNS = ["time", "power", "speed"];
/** Moving gaps longer than this don't add distance. */
const MAX_DISTANCE_GAP_SECONDS = 10;

/**
 * @param {string} content CSV text
 * @param {{ startTime?: Date }} options startTime is the timestamp of elapsed time 0
 *   (the upload time, since the CSV format carries no date)
 */
function parseCSV(content, options = {}) {
  const startTime = (options.startTime || new Date()).getTime();

  let records;
  try {
    records = parse(content.replace(/^\uFEFF/, ""), {
      columns: (header) => header.map((h) => h.trim().toLowerCase()),
      trim: true,
      skip_empty_lines: true
    });
  } catch (error) {
    throw new ActivityFileError(`The .CSV file could not be read: ${error.message}`);
  }

  if (records.length === 0) {
    throw new ActivityFileError("The .CSV file has no data rows.");
  }
  const missing = REQUIRED_COLUMNS.filter((c) => !(c in records[0]));
  if (missing.length > 0) {
    throw new ActivityFileError(
      `The .CSV file is missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`
    );
  }

  const times = records.map((r, i) => parseTime(r.time, i));
  const elapsed = elapsedSeconds(times.map((t) => t.seconds));
  // date-times date the ride themselves; otherwise elapsed time 0 is the upload time
  const start = times[0].absolute ? times[0].seconds * 1000 : startTime;
  const laps = [];
  let currentLapId;
  let distance = 0;

  records.forEach((row, index) => {
    const speed = number(row.speed);
    if (index > 0) {
      const dt = elapsed[index] - elapsed[index - 1];
      if (dt > 0 && dt <= MAX_DISTANCE_GAP_SECONDS && speed !== undefined) {
        distance += (speed / 3.6) * dt / 1000;
      }
    }

    const timestamp = new Date(start + elapsed[index] * 1000);
    const lapId = row.lap !== undefined && row.lap !== "" ? parseInt(row.lap, 10) : 1;
    if (lapId !== currentLapId) {
      currentLapId = lapId;
      laps.push({ start_time: timestamp, timestamp, records: [] });
    }

    const elevation = number(row.elevation);
    laps[laps.length - 1].records.push({
      timestamp,
      elapsed_time: elapsed[index],
      power: integer(row.power),
      speed,
      distance,
      position_lat: number(row.lat),
      position_long: number(row.long),
      altitude: elevation !== undefined ? elevation / 1000 : undefined, // km, like parsed .FIT files
      air_speed: number(row.airspeed)
    });
  });

  return {
    file_id: { manufacturer: "MyCdA", product_name: "MyCdA", type: "activity" },
    activity: {
      sessions: [{ sport: "cycling", start_time: laps[0].start_time, laps }]
    }
  };
}

/**
 * Converts times in seconds to seconds since the first row. Exports that print mm:ss without
 * hours wrap after 59:59; each wrap adds an hour.
 */
function elapsedSeconds(values) {
  let offset = 0;
  let previous;
  const seconds = values.map((value) => {
    if (previous !== undefined && value + offset < previous - 1800) offset += 3600;
    previous = value + offset;
    return previous;
  });
  return seconds.map((s) => s - seconds[0]);
}

const CLOCK_TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?\s*([ap])\.?m\.?$/i;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

/** @returns {{ seconds: number, absolute: boolean }} seconds since the epoch when absolute */
function parseTime(cell, index) {
  const text = String(cell).trim();

  if (ISO_DATE_TIME.test(text)) {
    const ms = Date.parse(text);
    if (Number.isFinite(ms)) return { seconds: ms / 1000, absolute: true };
  }

  const clock = CLOCK_TIME.exec(text);
  if (clock) {
    const hours = (Number(clock[1]) % 12) + (clock[4].toLowerCase() === "p" ? 12 : 0);
    return { seconds: hours * 3600 + Number(clock[2]) * 60 + Number(clock[3] || 0), absolute: false };
  }

  const parts = text.split(":").map(Number);
  if (text === "" || parts.length > 3 || parts.some((p) => !Number.isFinite(p))) {
    throw new ActivityFileError(`Invalid time "${cell}" in row ${index + 2} of the .CSV file.`);
  }
  return { seconds: parts.reduce((total, part) => total * 60 + part, 0), absolute: false };
}

function number(value) {
  if (value === undefined || value === "") return undefined;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

function integer(value) {
  const n = number(value);
  return n === undefined ? undefined : Math.trunc(n);
}

module.exports = { parseCSV };
