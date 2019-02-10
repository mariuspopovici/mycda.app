/**
 * Get's weather data for latitude and longitude.
 * Uses openweathermap.org web services.
 */
export default class Weather {
  /**
   * Call web service.
   * @param {Number} lat latitude
   * @param {Number} long longitude
   * @param {String} units units of measurement (metric / imperial)
   * @param {*} config app config object containing openweathermap API keys
   *
   * @returns object {temperature, humidity, dewPoint, pressure}
   */
  async sendRequest (lat, long, units = 'metric', config) {
    const rp = require('request-promise')

    const options = {
      method: 'GET',
      headers: {},
      qs: {
        lat: lat,
        lon: long,
        appid: config.OW_API_KEY,
        units: units
      },
      json: true
    }

    try {
      // use a proxy for CORS requests when in production mode
      const cors =
        config.NODE_ENV === 'production'
          ? 'https://cors-anywhere.herokuapp.com/'
          : ''
      const result = await rp(
        cors + 'http://api.openweathermap.org/data/2.5/weather',
        options
      )
      if (result) {
        const tempInCelcius =
          units === 'imperial'
            ? this.toCelcius(result.main.temp)
            : result.main.temp
        const dewPointInCelcius = (
          tempInCelcius -
          (100 - result.main.humidity) / 5
        ).toFixed(2)

        return {
          temperature: result.main.temp,
          humidity: result.main.humidity,
          dewPoint:
            units === 'imperial'
              ? this.toFahrenheit(dewPointInCelcius)
              : dewPointInCelcius,
          pressure:
            units === 'imperial'
              ? this.hpaToInHg(result.main.pressure)
              : result.main.pressure
        }
      }
    } catch (e) {
      console.log(e)
      throw new Error('Cannot get weather data.')
    }
  }

  toFahrenheit (temp) {
    return ((temp * 9) / 5 + 32).toFixed(2)
  }

  toCelcius (temp) {
    return (((temp - 32) * 5) / 9).toFixed(2)
  }

  hpaToInHg (pressure) {
    return (pressure / 33.863886666667).toFixed(2)
  }

  inHgToC (pressure) {
    return (pressure * 33.863886666667).toFixed(2)
  }
}
