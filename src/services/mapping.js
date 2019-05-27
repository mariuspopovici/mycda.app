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
  async sendRequest (lat, long, units = 'metric', options) {
    const rp = require('request-promise')

    const params = {
      locations: lat + ',' + long,
      key: options.appConfig.GOOGLE_MAPS_API_KEY
    }

    const url = 'https://maps.googleapis.com/maps/api/elevation/json?' + this._encodeData(params)
    const token = await options.user.getIdToken(true)

    try {
      const results = await rp(
        'https://us-central1-mycda-c43c6.cloudfunctions.net/api/cors',
        {
          method: 'GET',
          qs: { url: url },
          headers: {
            'Authorization': 'Bearer ' + token,
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36'
          },
          json: true
        }
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

  _encodeData (data) {
    return Object.keys(data).map(function (key) {
      return [key, data[key]].map(encodeURIComponent).join('=')
    }).join('&')
  }
}
