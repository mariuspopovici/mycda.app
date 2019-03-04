/**
 * Just a bunch of utility methods. Units conversion and stuff.
 */
export default class CdaUtils {
  /**
   * Generates a random unique ID
   */
  uuid () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      // eslint-disable-next-line one-var
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Converts input to degrees Fahrenheit
   * @param {*} temp
   */
  toFahrenheit (temp) {
    return ((temp * 9) / 5 + 32).toFixed(2)
  }

  /**
   * Converts input to degrees Celcius
   * @param {*} temp
   */
  toCelcius (temp) {
    return (((temp - 32) * 5) / 9).toFixed(2)
  }

  /**
   * Converts pressure from hpa to InHg
   * @param {*} pressure
   */
  hpaToInHg (pressure) {
    return (pressure / 33.863886666667).toFixed(2)
  }

  /**
   * Converts input pressure from inHg to hpa
   * @param {} pressure
   */
  inHgTohpa (pressure) {
    return (pressure * 33.863886666667).toFixed(2)
  }

  /**
   * Converts seconds to hour:minutes:seconds format.
   * @param {*} d seconds
   */
  secondsToHms (d) {
    d = Number(d)

    var h = Math.floor(d / 3600)
    var m = Math.floor(d % 3600 / 60)
    var s = Math.floor(d % 3600 % 60)

    return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2)
  }

  /**
   * Converts from km to miles
   * @param {*} d
   */
  kmToMi (d) {
    return d / 1.609
  }

  /**
   * Convert from miles to km
   * @param {*} d
   */
  miToKm (d) {
    return d * 1.609
  }

  /**
   * Convert meters to feet
   */
  mToFt (d) {
    return (d * 3.281)
  }

  /**
   * Convert ft to meters
   * @param {*} d
   */
  ftToM (d) {
    return (d / 3.281)
  }

  /**
   * Convert kg to lbs
   * @param {} d
   */
  kgToLbs (d) {
    return d * 2.205
  }

  /**
   * Convert lbs to kg
   */
  lbsToKg (d) {
    return d / 2.205
  }

  /**
   * Lighten or darken a color
   */
  LightenDarkenColor (col, amt) {
    var usePound = false

    if (col[0] === '#') {
      col = col.slice(1)
      usePound = true
    }

    var num = parseInt(col, 16)

    var r = (num >> 16) + amt

    if (r > 255) r = 255
    else if (r < 0) r = 0

    var b = ((num >> 8) & 0x00FF) + amt

    if (b > 255) b = 255
    else if (b < 0) b = 0

    var g = (num & 0x0000FF) + amt

    if (g > 255) g = 255
    else if (g < 0) g = 0

    return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16)
  }
}
