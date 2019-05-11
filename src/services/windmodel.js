export default class WindModel {
  constructor (time, location, speed, windSpeed, windDirection) {
    this.locationDataPoints = location
    this.speedDataPoints = speed
    this.windSpeed = windSpeed
    this.timeDataPoints = time
    this.windDirection = windDirection
  }

  calculateAirSpeed () {
    let airspeeds = []
    var bearings = this._calculateBearing(this.locationDataPoints)

    this.speedDataPoints.forEach((groundSpeed, index) => {
      const travelDirection = bearings[index]
      const windDirection = this.windDirection[index]
      const relativeWindAngle = (windDirection - travelDirection) % 360

      const windSpeed = this.windSpeed[index]
      const airspeed = this._yaw(groundSpeed, windSpeed, relativeWindAngle)

      airspeeds.push(airspeed)
    })

    return airspeeds
  }

  _yaw (groundSpeed, windSpeed, windAngle) {
    windAngle = windAngle - Math.floor(windAngle / 360) * 360
    if (windAngle > 180) {
      windAngle = 360 - windAngle
    }

    let windAngleRadians = this._radians(windAngle)

    let headWind = Math.abs(groundSpeed) + windSpeed * Math.cos(windAngleRadians)

    let sideWind = 0
    if (windAngle !== 180) {
      sideWind = Math.sin(windAngleRadians) * windSpeed
    }

    var airspeed = Math.sqrt(headWind * headWind + sideWind * sideWind)
    var yaw = Math.atan(sideWind / headWind) * 180 / Math.PI

    return {
      airspeed: airspeed,
      yaw: yaw
    }
  }

  _calculateBearing (location) {
    let bearing = []
    let startPoint = location[0]
    let endPoint = location[10]
    let currentBearing = this._bearing(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng)

    location.forEach((point, index) => {
      // re-evaluate bearing every 10 points
      if (index > 0 && index % 10 === 0) {
        currentBearing = this._bearing(startPoint.lat, startPoint.lng, point.lat, point.lng)
        startPoint = point
      }

      bearing.push(currentBearing)
    })

    return bearing
  }

  _bearing (lat, lng, lat2, lng2) {
    const teta1 = this._radians(lat)
    const teta2 = this._radians(lat2)
    // eslint-disable-next-line no-unused-vars
    const delta1 = this._radians(lat2 - lat)
    const delta2 = this._radians(lng2 - lng)

    const y = Math.sin(delta2) * Math.cos(teta2)
    const x = Math.cos(teta1) * Math.sin(teta2) - Math.sin(teta1) * Math.cos(teta2) * Math.cos(delta2)
    let brng = Math.atan2(y, x)
    brng = this._degrees(brng)// radians to degrees
    brng = ((Math.trunc(brng) + 360) % 360)

    return brng
  }

  _radians (degrees) {
    return degrees * Math.PI / 180
  }

  _degrees (radians) {
    return radians * 180 / Math.PI
  }
}
