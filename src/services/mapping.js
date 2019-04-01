/**
 * Several mapping related utilities.
 * Uses Google Maps API.
 */
export default class Mapping {
  /**
     * Gets altitude at coordinates.
     * @param {Number} lat latitude
     * @param {Number} long longitude
     * @param {String} units units of measurement (metric / imperial)
     * @param {*} config app config object containing Google Maps API key
     *
     * @returns {Number} altitude at specified latitude and longiture
     */
  async sendRequest (lat, long, units = 'metric', config) {
    const rp = require('request-promise')

    const options = {
      method: 'GET',
      headers: {},
      qs: {
        locations: lat + ',' + long,
        key: config.GOOGLE_MAPS_API_KEY
      },
      json: true
    }

    try {
      const cors = 'https://cors-anywhere.herokuapp.com/'
      const results = await rp(
        cors + 'https://maps.googleapis.com/maps/api/elevation/json',
        options
      )

      if (results && results.status === 'OK') {
        let result = results.results[0]
        const altitude =
            units === 'imperial'
              ? this.toFeet(result.elevation)
              : result.elevation.toFixed(2)

        return {
          elevation: altitude
        }
      } else if (results) {
        console.log('Google Maps elevation service error:', results.status)
      }
    } catch (e) {
      console.log(e)
      throw new Error('Cannot get elevation data.')
    }
  }

  toFeet (altitude) {
    return (altitude * 3.281).toFixed(2)
  }
}
