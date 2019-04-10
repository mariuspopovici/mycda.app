/**
 * Handles CSV parsing and transformation to Garmin FIT JSON data.
 */
class CSV {
    constructor (options = { speedUnit: 'km/h' }) {
        this.csv = require('csv-parse');
        this.speedUnit = options.speedUnit;
    }

    /**
     * Parse CSV content. Return Garmin FIT JSON representation of data.
     * @param {*} content 
     */
    parse(content, callback) {
      let _this = this;
      this.csv(content, { 
        bom: true,
        columns: true, 
        trim: true,
        skip_empty_lines: true,
        cast: function(value, context) {
          switch (context.column) {
            case 'time':
              return _this.parseTime(value);
            case 'power':
            case 'lap':
              return parseInt(value);
            case 'speed':
            case 'airspeed':
            case 'lat':
            case 'long':
            case 'elevation':
              return parseFloat(value);
            default:
              return value;
          }
        },
      }, (err, records) => {
        if(err) {
            return callback(err, null);
        } else {
            let result = this.validate(records);
            if (result.isValid) {
              return callback(null, this.fit(records));
            } else {
              return callback(new Error(result.message), null);
            }
        }
      });
    }

    /**
     * Transform CSV content to Garmin FIT JSON.
     * @param {*} records 
     */
    fit(records) {
      let fit = {
        file_id: {
          manufacturer: 'MyCdA',
          product_name: 'MyCdA',
          type: 'activity'
        },
        activity: {
          num_sessions: 1,
          sessions: [
            {
              sport: 'cycling',
              laps: []
            }
          ]
        }
      };

      let laps = [];
      let currentLapId = 0;
      let lapCounter = 0;
      let vFactor = this.speedUnit === 'km/h' ? 3.600 : 2.237;
      let interval = 1
      let distance = 0

      records.forEach((record, index) => {
        
        let speed = parseFloat(record.speed);
        let power = parseInt(record.power);
        let timestamp = record.time;
        let velocity = speed / vFactor;
        distance += velocity * interval / 1000;

        let lapId = 'lap' in record ? record.lap : 1;
        if (lapId !== currentLapId) {
          // add a new lap
          lapCounter++;
          currentLapId = lapId;
          laps.push({
            start_time: timestamp,
            timestamp: timestamp,
            records: []
          })
        }
        
        let lap = laps[lapCounter - 1];
      
        lap.records.push({
          timestamp: timestamp,
          elapsed_time: index,
          power: power,
          speed: speed,
          distance: distance,
          position_lat: record.lat,
          position_long: record.long,
          altitude: record.elevation / 1000, // transform to km to be consistent with .FIT file parsing
          air_speed: record.airspeed
        })

      });

      fit.activity.sessions[0].laps = laps;

      return fit;
    }

    /**
     * Validate required fields.
     * @param {*} records 
     */
    validate(records) {
      
      if (records.length === 0) {
        return {
          isValid: false,
          message: 'Missing data in .CSV file. Found zero records.'
        }
      }
  
      let firstRecord = records[0];
      console.log(firstRecord)
      // validate required columns
      if (!(firstRecord.hasOwnProperty('time'))) {
        return {
          isValid: false,
          message: 'Missing required <time> column'
        }
      }
      if (!(firstRecord.hasOwnProperty('power'))) {
        return {
          isValid: false,
          message: 'Missing required <time> column'
        }
      }
      if (!(firstRecord.hasOwnProperty('speed'))) {
        return {
          isValid: false,
          message: 'Missing required <speed> column'
        }
      }

      return {
        isValid: true,
        message: ''
      }
    }

    parseTime(timeString) {
      if (timeString && timeString.includes(':')) {
        let parts = timeString.split(':')
        let seconds = parseInt(parts.pop());
        let minutes = parseFloat(parts.pop());
        let date = new Date();
        date.setMinutes(minutes);
        date.setSeconds(seconds);

        return date;
      }
      else {
        throw new Error(`Invalid time string: ${timeString}`);
      }
    }
}

module.exports = CSV;
