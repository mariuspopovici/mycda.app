/**
 * Activity file parsing and transformation. Kept free of Firebase dependencies so it can be tested.
 */
const EasyFit = require("fit-file-parser").default;
const CSV = require("./csv");

function parseCSV(content) {
  let csv = new CSV({
    speedUnit: "km/h"
  });
  return new Promise((resolve, reject) => {
    csv.parse(content, (error, data) => {
      if (error) {
        reject(error);
      } else {
        console.log("Succesfully parsed .csv activity file.");
        resolve(data);
      }
    });
  });
}

function parseFIT(content) {
  let easyFit = new EasyFit({
    force: true,
    speedUnit: "km/h",
    lengthUnit: "km",
    temperatureUnit: "kelvin",
    elapsedRecordField: true,
    mode: "cascade"
  });

  return new Promise((resolve, reject) => {
    easyFit.parse(content, (error, data) => {
      if (error) {
        reject(error);
      } else {
        console.log("Succesfully parsed .fit activity file.");
        resolve(data);
      }
    });
  });
}

function validateFileContents(data) {
  if (!data.activity.sessions || data.activity.sessions.length === 0) {
    return {
      invalid: true,
      message: `Invalid file. Missing FIT session data.`
    };
  }

  let session = data.activity.sessions.filter(
    item => item.sport === "cycling"
  )[0];

  if (!session || session.sport !== "cycling") {
    return {
      invalid: true,
      message: `Invalid file. Could not locate a cycling session within .FIT file.`
    };
  }

  if (session.laps.length === 0) {
    return {
      invalid: true,
      message: `Invalid file. Missing lap data.`
    };
  }


  let record = session.laps[0].records[0];
  const hasSpeed = "speed" in record || "enhanced_speed" in record;
  if (!hasSpeed) {
    return {
      invalid: true,
      message: "Invalid file. Missing speed data."
    };
  }

  return {
    invalid: false,
    message: ""
  };
}

function getActivityData(data, options = { includeDataPoints: true }) {
  const session = data.activity.sessions.filter(
    item => item.sport === "cycling"
  )[0];
  const laps = session.laps;

  const useEnhancedSpeed = session.enhanced_avg_speed && !session.avg_speed;
  const altitudeField = useEnhancedSpeed ? 'enhanced_altitude' : 'altitude';
  const avgSpeedField = useEnhancedSpeed ? 'enhanced_avg_speed' : 'avg_speed';
  const speedField = useEnhancedSpeed ? 'enhanced_speed' : 'speed';
  const timestamp = laps[0].records[0].timestamp;

  let stats = null;
  let fileHasStats = session.avg_power && session[avgSpeedField];

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
        lap.records.forEach(record => {
          stats.points.push({
            lap: i + 1,
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
        });
      }
    });
  } else {
    // calculate stats from data
    let sumPower = 0;
    let sumSpeed = 0;
    let recordCount = 0;
    let totalDistance = 0;
    let totalElapsedTime = 0;
    let lapStats = [];
    let dataPoints = [];

    laps.forEach((lap, i) => {
      let lapSumPower = 0;
      let lapSumSpeed = 0;

      let lapStartDistance = lap.records[0].distance;
      let lapStartElapsedTime = lap.records[0].elapsed_time;

      lap.records.forEach(record => {
        recordCount++;
        sumPower += record.power;
        sumSpeed += record[speedField];
        lapSumPower += record.power;
        lapSumSpeed += record[speedField];
        totalDistance = record.distance;
        totalElapsedTime = record.elapsed_time;

        if (options.includeDataPoints) {
          dataPoints.push({
            lap: i + 1,
            timestamp: record.timestamp,
            distance: record.distance,
            power: record.power,
            altitude: record[altitudeField],
            speed: record[speedField],
            airspeed: record.air_speed
              ? record.air_speed
              : record.saturated_hemoglobin_percent,
            lat: record.position_lat,
            long: record.position_long
          });
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

    const avgPower = Math.ceil(sumPower / recordCount);
    const avgSpeed = (sumSpeed / recordCount).toFixed(2);

    stats = {
      timestamp: timestamp,
      start_time: timestamp,
      total_distance: totalDistance,
      total_elapsed_time: totalElapsedTime,
      avg_power: avgPower,
      avg_speed: avgSpeed,
      lap_count: laps.length,
      laps: lapStats,
      points: dataPoints
    };
  }

  return stats;
}

module.exports = {
  parseCSV,
  parseFIT,
  validateFileContents,
  getActivityData
};
