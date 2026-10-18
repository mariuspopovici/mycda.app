const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { zipSync } = require("fflate");
const {
  detectFormat,
  parseActivityFile,
  validateFileContents,
  getActivityData
} = require("../activity");
const { buildFit, ride } = require("./fit-builder");

const FIXTURES = path.join(__dirname, "fixtures");
const START = new Date("2026-05-01T08:00:00Z");
const at = (seconds) => new Date(START.getTime() + seconds * 1000);

async function parseAndExtract(buffer, options) {
  const data = await parseActivityFile(buffer, options);
  const validation = validateFileContents(data);
  return { data, validation, result: validation.invalid ? undefined : getActivityData(data) };
}

async function rejects(buffer, message) {
  await assert.rejects(parseActivityFile(buffer), (error) => {
    assert.equal(error.name, "ActivityFileError");
    assert.match(error.message, message);
    return true;
  });
}

const simpleFit = () => buildFit({
  records: ride(20),
  laps: [{ start: at(0), end: at(10) }, { start: at(10), end: at(20) }],
  session: { sport: "cycling", start: at(0), end: at(20), avgSpeed: 36, avgPower: 250 }
});

describe("detectFormat", () => {
  it("recognizes files by content, not name", () => {
    assert.equal(detectFormat(simpleFit()), "fit");
    assert.equal(detectFormat(zlib.gzipSync(simpleFit())), "gzip");
    assert.equal(detectFormat(Buffer.from(zipSync({ "a.fit": simpleFit() }))), "zip");
    assert.equal(detectFormat(Buffer.from("\uFEFFspeed,power,time\n1,2,00:00")), "csv");
    assert.equal(detectFormat(Buffer.from("Time,Power,Speed\n0,1,2")), "csv");
    assert.equal(detectFormat(Buffer.from('<?xml version="1.0"?>\n<gpx creator="x">')), "gpx");
    assert.equal(detectFormat(Buffer.from("<?xml version=\"1.0\"?><TrainingCenterDatabase>")), "tcx");
    assert.equal(detectFormat(Buffer.from("<?xml version=\"1.0\"?><pwx version=\"1.0\">")), "pwx");
    assert.equal(detectFormat(Buffer.from("<!DOCTYPE html><html>")), "html");
    assert.equal(detectFormat(Buffer.alloc(0)), "empty");
    assert.equal(detectFormat(Buffer.from("hello world")), "unknown");
  });
});

describe("parseActivityFile: containers and unsupported formats", () => {
  it("unwraps gzip and zip", async () => {
    const plain = getActivityData(await parseActivityFile(simpleFit()));
    assert.deepEqual(getActivityData(await parseActivityFile(zlib.gzipSync(simpleFit()))), plain);
    const zipped = Buffer.from(zipSync({ "readme.txt": Buffer.from("hi"), "ride.FIT": simpleFit() }));
    assert.deepEqual(getActivityData(await parseActivityFile(zipped)), plain);
  });

  it("reads a CSV inside a zip", async () => {
    const csv = fs.readFileSync(path.join(FIXTURES, "test.csv"));
    const { result } = await parseAndExtract(Buffer.from(zipSync({ "ride.csv": csv })), { startTime: START });
    assert.equal(result.points.length, 253);
  });

  it("explains unsupported and unusable files", async () => {
    await rejects(Buffer.from('<?xml version="1.0"?><gpx>'), /GPX files are not supported/);
    await rejects(zlib.gzipSync(Buffer.from('<?xml version="1.0"?><pwx>')), /PWX files are not supported/);
    await rejects(Buffer.from("<!DOCTYPE html><html></html>"), /not a \.FIT or \.CSV/);
    await rejects(Buffer.alloc(0), /empty/);
    await rejects(Buffer.from(zipSync({ "notes.txt": Buffer.from("x") })), /contains no \.FIT or \.CSV/);
    await rejects(zlib.gzipSync(zlib.gzipSync(zlib.gzipSync(simpleFit()))), /nested too deeply/);
  });
});

describe("parseActivityFile: .FIT structure recovery", () => {
  it("uses session and lap statistics when the file has them", async () => {
    const { result } = await parseAndExtract(simpleFit());
    assert.equal(result.lap_count, 2);
    assert.equal(result.avg_power, 250);
    assert.equal(result.avg_speed, 36);
    assert.deepEqual(result.points.map((p) => p.lap), [...Array(10).fill(1), ...Array(10).fill(2)]);
    assert.equal(result.points[0].altitude, 0.1);
    assert.equal(result.points[0].speed, 36);
  });

  it("falls back to record totals when the session has averages but no totals", async () => {
    const { result } = await parseAndExtract(simpleFit());
    assert.equal(result.total_distance, 0.19);
    assert.equal(result.total_elapsed_time, 20);
  });

  it("recovers files without a session message, taking the sport from the sport message", async () => {
    const { data, result } = await parseAndExtract(buildFit({
      records: ride(20), laps: [{ start: at(0), end: at(20) }], fileSport: "cycling"
    }));
    assert.equal(data.activity.sessions[0].sport, "cycling");
    assert.equal(result.points.length, 20);
    assert.equal(result.avg_power, 250);
  });

  it("accepts sessions whose sport is not recorded", async () => {
    const { validation } = await parseAndExtract(buildFit({
      records: ride(20), session: { start: at(0), end: at(20) }
    }));
    assert.equal(validation.invalid, false);
  });

  it("recovers files without lap messages as one lap", async () => {
    const { result } = await parseAndExtract(buildFit({
      records: ride(30), session: { sport: "cycling", start: at(0), end: at(30) }
    }));
    assert.equal(result.lap_count, 1);
    assert.equal(result.points.length, 30);
  });

  it("handles an empty first lap", async () => {
    const { result } = await parseAndExtract(buildFit({
      records: ride(20),
      laps: [{ start: at(0), end: at(0) }, { start: at(0), end: at(20) }],
      session: { sport: "cycling", start: at(0), end: at(20) }
    }));
    assert.equal(result.lap_count, 2);
    assert.equal(result.laps[0].total_distance, 0);
    assert.equal(result.points.length, 20);
    assert.equal(new Date(result.timestamp).getTime(), START.getTime());
  });

  it("keeps records logged before the first lap starts", async () => {
    const { result } = await parseAndExtract(buildFit({
      records: ride(20),
      laps: [{ start: at(5), end: at(20) }],
      session: { sport: "cycling", start: at(0), end: at(20), avgSpeed: 36, avgPower: 250 }
    }));
    assert.equal(result.points.length, 20);
    assert.equal(new Date(result.timestamp).getTime(), START.getTime());
  });

  it("merges alternating speed-only and power-only records", async () => {
    const records = ride(20).map((r, i) => (i % 2 === 0
      ? { time: r.time, power: 240 + i }
      : { time: r.time, speed: 30 + i, distance: i * 10 }));
    const { result } = await parseAndExtract(buildFit({ records, session: { sport: "cycling", start: at(0), end: at(20) } }));
    assert.equal(result.points.length, 10);
    assert.equal(result.points[0].power, 240);
    assert.ok(Math.abs(result.points[0].speed - 31) < 0.01);
  });

  it("does not merge records that already have both speed and power", async () => {
    const { result } = await parseAndExtract(buildFit({ records: ride(20), session: { sport: "cycling", start: at(0), end: at(20) } }));
    assert.equal(result.points.length, 20);
  });

  it("accepts files whose first record lacks speed", async () => {
    const records = ride(20, START, (i) => (i === 0 ? { speed: undefined } : {}));
    const { validation } = await parseAndExtract(buildFit({ records, session: { sport: "cycling", start: at(0), end: at(20) } }));
    assert.equal(validation.invalid, false);
  });

  it("computes statistics without NaN when power is missing", async () => {
    const records = ride(20, START, (i) => (i < 5 ? { power: undefined } : {}));
    const { result } = await parseAndExtract(buildFit({ records, session: { sport: "cycling", start: at(0), end: at(20) } }));
    assert.ok(Number.isFinite(result.avg_power));
  });

  it("rejects other sports and files without speed, naming the problem", async () => {
    const running = await parseAndExtract(buildFit({ records: ride(20), session: { sport: "running", start: at(0), end: at(20) } }));
    assert.match(running.validation.message, /running activity/);

    const noSpeed = await parseAndExtract(buildFit({
      records: ride(20, START, () => ({ speed: undefined })),
      session: { sport: "cycling", start: at(0), end: at(20) }
    }));
    assert.match(noSpeed.validation.message, /no speed data/);
  });
});

describe("parseActivityFile: CSV", () => {
  const csv = (rows) => Buffer.from(rows.join("\n"));

  for (const fixture of ["bommycdatest.csv", "exported.csv", "mytest.csv", "test.csv"]) {
    it(`parses ${fixture}`, async () => {
      const { validation, result } = await parseAndExtract(fs.readFileSync(path.join(FIXTURES, fixture)), { startTime: START });
      assert.equal(validation.invalid, false);
      assert.ok(result.points.length > 200);
      assert.equal(result.points[0].distance, 0);
      assert.equal(new Date(result.points[0].timestamp).getTime(), START.getTime());
    });
  }

  it("times rows from the upload time and accumulates distance over real intervals", async () => {
    const { result } = await parseAndExtract(csv([
      "Time,Power,Speed,Elevation",
      "0:00,200,36,10",
      "0:01,200,36,10",
      "0:03,200,36,10",
      "1:00:03,200,36,10"
    ]), { startTime: START });
    assert.deepEqual(result.points.map((p) => new Date(p.timestamp).getTime() - START.getTime()), [0, 1000, 3000, 3603000]);
    assert.deepEqual(result.points.map((p) => Math.round(p.distance * 1000)), [0, 10, 30, 30]);
    assert.equal(result.points[0].altitude, 0.01);
  });

  it("handles mm:ss wrapping past an hour, clock times and ISO date-times", async () => {
    const elapsed = async (times) => {
      const { result } = await parseAndExtract(csv(["time,power,speed", ...times.map((t) => `${t},200,30`)]), { startTime: START });
      return result.points.map((p) => (new Date(p.timestamp) - new Date(result.points[0].timestamp)) / 1000);
    };
    assert.deepEqual(await elapsed(["59:58", "59:59", "00:00"]), [0, 1, 2]);
    assert.deepEqual(await elapsed(["11:59:59 AM", "12:00:00 PM", "12:00:01 PM"]), [0, 1, 2]);

    const { result } = await parseAndExtract(csv(["time,power,speed", "2019-04-09T14:00:00Z,200,30", "2019-04-09T14:00:01Z,200,30"]), { startTime: START });
    assert.equal(result.timestamp.toISOString(), "2019-04-09T14:00:00.000Z");
  });

  it("names missing columns and bad times", async () => {
    await rejects(csv(["time,speed", "0:00,30"]), /missing required column: power/);
    await rejects(csv(["time,power,speed", "soon,200,30"]), /Invalid time "soon" in row 2/);
  });
});

describe("private ride sweep", { skip: !process.env.ALL_FIXTURES && "set ALL_FIXTURES=1" }, () => {
  const dir = path.join(__dirname, "../../web/src/core/__fixtures__/private");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(fit|csv)$/i.test(f)) : [];

  it(`every file parses or is rejected with a message (${files.length} files)`, async () => {
    let accepted = 0;
    for (const file of files) {
      try {
        const { validation, result } = await parseAndExtract(fs.readFileSync(path.join(dir, file)), { startTime: START });
        if (!validation.invalid) {
          accepted++;
          assert.ok(result.points.length > 0, file);
        }
      } catch (error) {
        assert.equal(error.name, "ActivityFileError", `${file}: ${error.stack}`);
      }
    }
    console.log(`accepted ${accepted} of ${files.length}`);
  });
});
