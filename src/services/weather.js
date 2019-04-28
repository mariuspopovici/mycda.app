export default class WeatherServiceFactory {
  static create (config) {
    switch (config.WEATHER_API) {
      case 'OpenWeatherMap':
        return new OpenWeatherMapService(config)
      case 'DarkSky':
        return new DarkSkyWeatherService(config)
    }
  }
}

class WeatherServiceResponse {
  constructor (temperature, humidity, dewPoint, pressure) {
    this._temperature = temperature
    this._humidity = humidity
    this._dewPoint = dewPoint
    this._pressure = pressure
  }

  set temperature (temperature) {
    this._temperature = temperature
  }

  get temperature () {
    return this._temperature
  }

  set humidity (humidity) {
    this._humidity = humidity
  }

  get humidity () {
    return this._humidity
  }

  set dewPoint (dewPoint) {
    this._dewPoint = dewPoint
  }

  get dewPoint () {
    return this._dewPoint
  }

  set pressure (pressure) {
    this._pressure = pressure
  }

  get pressure () {
    return this._pressure
  }
}

export class WeatherService {
  constructor () {
    if (new.target === WeatherService) {
      throw new TypeError('Cannot instantiate WeatherService directly.')
    }

    if (this.sendRequest === undefined) {
      throw new TypeError('Must implement sendRequest method')
    }

    this.rp = require('request-promise')
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

  inHgTohPa (pressure) {
    return (pressure * 33.863886666667).toFixed(2)
  }
}

/**
 * Get's weather data for latitude and longitude.
 * Uses darksky.net web services.
 */
export class DarkSkyWeatherService extends WeatherService {
  constructor (config) {
    super()
    this.config = config
  }

  /**
   * Call web service.
   * @param {Number} lat latitude
   * @param {Number} long longitude
   * @param {String} units units of measurement (metric / imperial)
   *
   * @returns {WeatherServiceResponse} response
   */
  async sendRequest (lat, long, units = 'metric', time) {
    const options = {
      method: 'GET',
      headers: {
        'Access-Control-Allow-Origin': 'https://mycda.app'
      },
      qs: {},
      json: true
    }

    let timeString = parseInt((new Date()).getTime() / 1000).toString()
    if (time) {
      if (time instanceof Date) {
        timeString = parseInt(time.getTime() / 1000).toString()
      } else if (time instanceof String) {
        timeString = time
      }
    }

    try {
      const cors =
        this.config.NODE_ENV === 'development'
          ? 'https://cors-anywhere.herokuapp.com/'
          : ''
      const url = cors + 'https://api.darksky.net/forecast/' + this.config.DS_API_KEY + '/' + lat + ',' + long + ',' + timeString

      const result = await this.rp(
        url,
        options
      )

      if (result) {
        return new WeatherServiceResponse(
          units === 'metric' ? this.toCelcius(result.currently.temperature) : result.currently.temperature,
          result.currently.humidity,
          units === 'metric' ? this.toCelcius(result.currently.dewPoint) : result.currently.dewPoint,
          units === 'metric' ? result.currently.pressure : this.hpaToInHg(result.currently.pressure)
        )
      }
    } catch (e) {
      console.log(e)
      throw new Error('Cannot get weather data.')
    }
  }
}

/**
 * Get's weather data for latitude and longitude.
 * Uses openweathermap.org web services.
 */
export class OpenWeatherMapService extends WeatherService {
  constructor (config) {
    super()
    this.config = config
  }

  /**
   * Call web service.
   * @param {Number} lat latitude
   * @param {Number} long longitude
   * @param {String} units units of measurement (metric / imperial)
   *
   * @returns {WeatherServiceResponse} response
   */
  async sendRequest (lat, long, units = 'metric') {
    const options = {
      method: 'GET',
      headers: {
        'Access-Control-Allow-Origin': 'https://mycda.app'
      },
      qs: {
        lat: lat,
        lon: long,
        appid: this.config.OW_API_KEY,
        units: units
      },
      json: true
    }

    try {
      // use a proxy for CORS requests when in production mode
      const cors =
        this.config.NODE_ENV === 'development'
          ? 'https://cors-anywhere.herokuapp.com/'
          : ''
      const result = await this.rp(
        cors + 'http://api.openweathermap.org/data/2.5/weather',
        options
      )
      if (result) {
        const tempInCelcius =
          units === 'imperial'
            ? this.toCelcius(result.main.temp)
            : result.main.temp

        const dewPointInCelcius = (tempInCelcius - (100 - result.main.humidity) / 5).toFixed(2)

        return new WeatherServiceResponse(result.main.temp,
          result.main.humidity,
          units === 'imperial' ? this.toFahrenheit(dewPointInCelcius) : dewPointInCelcius,
          units === 'imperial' ? this.hpaToInHg(result.main.pressure) : result.main.pressure
        )
      }
    } catch (e) {
      console.log(e)
      throw new Error('Cannot get weather data.')
    }
  }
}
