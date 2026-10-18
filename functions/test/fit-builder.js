/**
 * Builds small .FIT files for tests with fit-file-parser's low-level encoder.
 * Field numbers, types and scales follow the FIT SDK profile.
 */
const { FitBaseType: T, FitEncoder } = require("fit-file-parser/encoder");

const MESSAGE = { fileId: 0, sport: 12, session: 18, lap: 19, record: 20 };
const SPORT = { running: 1, cycling: 2 };
const SEMICIRCLES_PER_DEGREE = 2 ** 31 / 180;

const ts = (date) => FitEncoder.toFitTimestamp(date);
const field = (number, baseType, size, value) => ({ number, baseType, size, value });

/**
 * @param {object} spec
 * @param {Array<{time: Date, speed?: number, power?: number, altitude?: number, distance?: number, lat?: number, lng?: number}>} spec.records
 *   speed in km/h, altitude and distance in m
 * @param {Array<{start: Date, end: Date}>} [spec.laps] lap messages, written after their records
 * @param {{sport?: string|null, start: Date, end: Date, avgSpeed?: number, avgPower?: number}} [spec.session]
 * @param {string} [spec.fileSport] sport message
 */
function buildFit({ records, laps = [], session, fileSport }) {
  const encoder = new FitEncoder();
  encoder.writeMessage(MESSAGE.fileId, [
    field(0, T.Enum, 1, 4), // type: activity
    field(1, T.Uint16, 2, 255), // manufacturer: development
    field(4, T.Uint32, 4, ts(records[0].time))
  ]);
  if (fileSport) encoder.writeMessage(MESSAGE.sport, [field(0, T.Enum, 1, SPORT[fileSport])]);

  const writeLap = (lap) => encoder.writeMessage(MESSAGE.lap, [
    field(253, T.Uint32, 4, ts(lap.end)),
    field(2, T.Uint32, 4, ts(lap.start)),
    field(7, T.Uint32, 4, Math.round((lap.end - lap.start)))
  ], 2);

  const pending = [...laps];
  for (const r of records) {
    while (pending.length && r.time >= pending[0].end) writeLap(pending.shift());
    const fields = [field(253, T.Uint32, 4, ts(r.time))];
    if (r.lat !== undefined) {
      fields.push(field(0, T.Sint32, 4, Math.round(r.lat * SEMICIRCLES_PER_DEGREE)));
      fields.push(field(1, T.Sint32, 4, Math.round(r.lng * SEMICIRCLES_PER_DEGREE)));
    }
    if (r.altitude !== undefined) fields.push(field(2, T.Uint16, 2, Math.round((r.altitude + 500) * 5)));
    if (r.distance !== undefined) fields.push(field(5, T.Uint32, 4, Math.round(r.distance * 100)));
    if (r.speed !== undefined) fields.push(field(6, T.Uint16, 2, Math.round((r.speed / 3.6) * 1000)));
    if (r.power !== undefined) fields.push(field(7, T.Uint16, 2, r.power));
    encoder.writeMessage(MESSAGE.record, fields, 1);
  }
  pending.forEach(writeLap);

  if (session) {
    const fields = [
      field(253, T.Uint32, 4, ts(session.end)),
      field(2, T.Uint32, 4, ts(session.start)),
      field(7, T.Uint32, 4, Math.round(session.end - session.start))
    ];
    if (session.sport) fields.push(field(5, T.Enum, 1, SPORT[session.sport]));
    if (session.avgSpeed !== undefined) fields.push(field(14, T.Uint16, 2, Math.round((session.avgSpeed / 3.6) * 1000)));
    if (session.avgPower !== undefined) fields.push(field(20, T.Uint16, 2, session.avgPower));
    encoder.writeMessage(MESSAGE.session, fields, 3);
  }
  return Buffer.from(encoder.close());
}

/** A ride of `seconds` 1 Hz records starting at `start`. */
function ride(seconds, start = new Date("2026-05-01T08:00:00Z"), overrides = () => ({})) {
  return Array.from({ length: seconds }, (_, i) => Object.assign({
    time: new Date(start.getTime() + i * 1000),
    speed: 36,
    power: 250,
    altitude: 100,
    distance: i * 10
  }, overrides(i)));
}

module.exports = { buildFit, ride };
