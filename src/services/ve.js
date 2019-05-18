/**
 * R. Chung's (rechung@gmail.com) Virtual elevation algorithm implementation.
 * Described at http://anonymous.coward.free.fr/wattage/cda/indirect-cda.pdf
 */
export default class VirtualElevation {
  /**
   * Initializes a new instance of the VirtualElevation class
   * @param {*} power power data point series
   * @param {*} speed  speed data point series
   * @param {*} airspeed  air speed data point series - if airspeed is not known, use ground speed (speed) in this parameter
   * @param {*} elevation elevation data point series
   * @param {*} time time data points series
   * @param {*} units units of measurement (imperial vs metric)
   * @param {*} dloss percentage drivetrain loss due to friction (crank vs hub power measurement)
   */
  constructor (power, speed, airspeed, elevation, time, units = 'metric', dloss = 0) {
    this.powerDataPoints = power
    this.speedDataPoints = speed
    this.airSpeedDataPoints = airspeed
    this.timeDataPoints = time
    this.elevationDataPoints = elevation
    this.units = units
    this.dloss = dloss
  }

  setAirSpeed (airspeed) {
    this.airSpeedDataPoints = airspeed
  }

  /**
   * Calculate virtual elevation points by solving the power equation for slope
   * @param {*} rho air density
   * @param {*} mass rider and bike mass
   * @param {*} crr rolling resistance
   * @param {*} cda coefficient of drag
   *
   * @returns an array of ve points
   */
  calculateVirtualElevation (rho, mass, crr, cda) {
    let veDataPoints = []
    const vFactor = this.units === 'metric' ? 3.600 : 2.237
    const g = 9.81
    this.powerDataPoints.forEach((power, i) => {
      const speed = this.speedDataPoints[i]
      const airspeed = this.airSpeedDataPoints[i]
      const velocity = speed / vFactor
      // we use air speed in our calculation - if no air speed data is available airspeed = speed
      const vair = airspeed / vFactor

      let ve = 0
      if (i > 0) {
        let interval = (this.timeDataPoints[i] - this.timeDataPoints[i - 1]) / 1000
        if (interval === 0) { interval = 1 }

        const previousVelocity = this.speedDataPoints[i - 1] / vFactor

        if (velocity === 0) {
          ve = this.elevationDataPoints[i - 1]
        } else {
          const a = (Math.pow(velocity, 2) - Math.pow(previousVelocity, 2)) / (2 * velocity * interval)
          power *= (1 - this.dloss / 100) // adjust power by drivetrain loss %
          const slope = power / (velocity * mass * g) - crr - (a / interval) / g - ((cda * rho * Math.pow(vair, 2)) / (2 * mass * g))

          const elevationDelta = slope * velocity * interval

          ve = elevationDelta + veDataPoints[i - 1]
        }
      } else {
        // set starting virtual elevation to real elevation starting point
        ve = this.elevationDataPoints[0]
      }
      veDataPoints.push(ve)
    })

    return veDataPoints
  }
}
