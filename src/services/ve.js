export default class VirtualElevation {
  constructor (power, speed, elevation, time) {
    this.powerDataPoints = power
    this.speedDataPoints = speed
    this.timeDataPoints = time
    this.elevationDataPoints = elevation
  }

  calculateVirtualElevation (rho, mass, crr, cda) {
    let veDataPoints = []
    this.powerDataPoints.forEach((power, i) => {
      const vFactor = 3.600
      const g = 9.81
      const speed = this.speedDataPoints[i]
      const velocity = speed / vFactor

      let ve = 0
      if (i > 0) {
        const interval = (this.timeDataPoints[i] - this.timeDataPoints[i - 1]) / 1000
        const previousVelocity = this.speedDataPoints[i - 1] / vFactor
        const a = (Math.pow(velocity, 2) - Math.pow(previousVelocity, 2)) / (2 * velocity * interval)
        const slope = power / (velocity * mass * g) - crr - (a / interval) / g - ((cda * rho * Math.pow(velocity, 2)) / (2 * mass * g))

        const elevationDelta = slope * velocity * interval

        ve = elevationDelta + veDataPoints[i - 1]
      } else {
        // set starting elevation to real elevation start
        ve = this.elevationDataPoints[0]
      }
      veDataPoints.push(ve)
    })

    return veDataPoints
  }
}
