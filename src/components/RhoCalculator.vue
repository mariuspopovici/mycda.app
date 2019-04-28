<template>
  <div id="RhoCalculator">
    <div class="container">
      <div style="margin-top: 2rem; padding-bottom: 1rem;">
        <form @submit.prevent="onSubmit">
          <div class="form-group row">
            <label for="example-text-input" class="col-4 col-form-label">Temperature:</label>
            <div class="col-8">
              <input
                class="form-control"
                type="text"
                id="temperature"
                v-model="$v.temperature.$model"
                @blur="$v.temperature.$touch()"
                autocomplete="off"
                maxlength="5"
                :placeholder="temperatureUnits"
              >
              <div v-if="$v.temperature.$error">
                <p
                  class="alert alert-danger"
                  v-if="!$v.temperature.required"
                >The temperature field is required!</p>
                <p
                  class="alert alert-danger"
                  v-if="!$v.temperature.decimal"
                >The temperature field is numeric!</p>
              </div>
            </div>
          </div>

          <div class="form-group row">
            <label for="example-text-input" class="col-4 col-form-label">Dew Point:</label>
            <div class="col-8">
              <input
                class="form-control"
                type="text"
                id="dewpoint"
                v-model="$v.dewpoint.$model"
                @blur="$v.dewpoint.$touch()"
                maxlength="5"
                autocomplete="off"
                :placeholder="temperatureUnits"
              >
              <div v-if="$v.dewpoint.$error">
                <p
                  class="alert alert-danger"
                  v-if="!$v.dewpoint.required"
                >The dew point field is required!</p>
                <p
                  class="alert alert-danger"
                  v-if="!$v.dewpoint.decimal"
                >The dew point field is numeric!</p>
              </div>
            </div>
          </div>

          <div class="form-group row">
            <label for="example-text-input" class="col-4 col-form-label">Air Pressure:</label>
            <div class="col-8">
              <input
                class="form-control"
                type="text"
                id="pressure"
                maxlength="6"
                v-model.trim="$v.pressure.$model"
                @blur="$v.pressure.$touch()"
                autocomplete="off"
                :placeholder="pressureUnits"
              >
              <div v-if="$v.pressure.$error">
                <p
                  class="alert alert-danger"
                  v-if="!$v.pressure.required"
                >The pressure field is required!</p>
                <p
                  class="alert alert-danger"
                  v-if="!$v.pressure.decimal"
                >The pressure field is numeric!</p>
              </div>
            </div>
          </div>

          <div class="form-group row">
            <label for="example-text-input" class="col-4 col-form-label">Altitude:</label>
            <div class="col-8">
              <input
                class="form-control"
                type="text"
                id="altitude"
                maxlength="6"
                v-model.trim="$v.altitude.$model"
                @blur="$v.altitude.$touch()"
                autocomplete="off"
                :placeholder="altitudeUnits"
              >
              <div v-if="$v.altitude.$error">
                <p
                  class="alert alert-danger"
                  v-if="!$v.altitude.required"
                >The altitude field is required!</p>
                <p
                  class="alert alert-danger"
                  v-if="!$v.altitude.decimal"
                >The altitude field is numeric!</p>
              </div>
            </div>
          </div>

          <div class="form-group row">
            <div class="offset-4 col-8 text-right">
              <div class="form-check form-check-inline">
                <label class="form-check-label">
                  <input
                    class="form-check-input"
                    type="radio"
                    name="inlineRadioOptions"
                    id="metric"
                    v-model="units"
                    value="metric"
                    checked
                  > Metric
                </label>
              </div>
              <div class="form-check form-check-inline disabled">
                <label class="form-check-label">
                  <input
                    class="form-check-input"
                    type="radio"
                    name="inlineRadioOptions"
                    id="imperial"
                    v-model="units"
                    value="imperial"
                  > Imperial
                </label>
              </div>
            </div>
          </div>

          <div class="form-group row" v-if="rho !== '' && units ==='metric'">
            <label for="example-text-input" class="col-4 col-form-label">
              Air Density: (kg/m<sup>3</sup>)
            </label>
            <div class="col-8">
              <input
                class="form-control"
                type="text"
                id="airdensity"
                maxlength="6"
                v-model.trim="rho"
                readonly="true"
                autocomplete="off"
              >
            </div>
          </div>

          <div class="form-group row" v-if="rho !== '' && units === 'imperial'">
            <label for="example-text-input" class="col-4 col-form-label">
              Air Density (lb/ft
              <sup>3</sup>):
            </label>
            <div class="col-8">
              <input
                class="form-control"
                type="text"
                id="airdensity"
                maxlength="6"
                v-model.trim="rho_lbcuft"
                readonly="true"
                autocomplete="off"
              >
            </div>
          </div>

          <div class="form-group row">
            <div class="col col-12 text-right">
              <b-dropdown id="dropdownLocation">
                <template slot="text">
                  <span v-if="loadingLocation">
                    <b-spinner small></b-spinner>
                  </span>
                  <span>&nbsp;Location</span>
                </template>
                <b-dropdown-item-btn v-on:click.native="getLocation">
                  <i class="fa fa-location-arrow"></i> Current Location
                </b-dropdown-item-btn>
                <b-dropdown-item-btn :disabled="this.activityInfo === null || !this.activityInfo.hasLocation"
                  v-on:click.native="getActivityLocation">
                  <i class="fa fa-map"></i> Activity Location / Time
                </b-dropdown-item-btn>
              </b-dropdown>
              <button type="submit" class="btn btn-primary">
                <font-awesome-icon icon="check"/>&nbsp;{{calculateCaption}}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { required, decimal } from 'vuelidate/lib/validators'
import WeatherServiceFactory from '@/services/weather'
import Mapping from '@/services/mapping'
import Utils from '@/services/utils'
import LoadingButton from '@/components/LoadingButton'
const rhoCalc = require('@mariuspopovici/rho')
const weatherService = WeatherServiceFactory.create(process.env)
const mappingService = new Mapping()
const utils = new Utils()

export default {
  name: 'RhoCalculator',
  metaInfo: {
    title: 'Calculator'
  },
  components: {
    LoadingButton
  },
  computed: {
    user () {
      return this.$store.getters.getUser
    },
    userPrefs () {
      return this.$store.getters.getUserPrefs
    }
  },
  props: {
    showClose: {
      type: Boolean,
      default: false
    },
    calculateCaption: {
      type: String,
      default: 'Calculate'
    },
    activityInfo: {
      type: Object,
      default: null
    }
  },
  data () {
    return {
      units: '',
      temperature: '',
      dewpoint: '',
      pressure: '',
      altitude: 0,
      rho: '',
      rho_lbcuft: '',
      temperatureUnits: '°C',
      pressureUnits: 'hPa',
      altitudeUnits: 'm',
      lat: '',
      long: '',
      loadingLocation: false
    }
  },
  validations: {
    temperature: {
      required,
      decimal
    },
    dewpoint: {
      required,
      decimal
    },
    pressure: {
      required,
      decimal
    },
    altitude: {
      required,
      decimal
    }
  },
  watch: {
    units: function (val, oldVal) {
      switch (val) {
        case 'imperial':
          // set placeholders
          this.temperatureUnits = '°F'
          this.pressureUnits = 'inHg'
          if (oldVal !== val) {
            // convert units to imperial from metric
            if (this.temperature !== '') { this.temperature = utils.toFahrenheit(this.temperature) }
            if (this.dewpoint !== '') { this.dewpoint = utils.toFahrenheit(this.dewpoint) }
            if (this.pressure !== '') { this.pressure = utils.hpaToInHg(this.pressure) }
            if (this.altitude !== '') { this.altitude = utils.mToFt(this.altitude.toFixed(2)) }
          }
          break
        case 'metric':
          // set placeholders
          this.temperatureUnits = '°C'
          this.pressureUnits = 'hPa'
          if (oldVal !== val) {
            // convert units to metric from imperial
            if (this.temperature !== '') { this.temperature = utils.toCelcius(this.temperature) }
            if (this.dewpoint !== '') { this.dewpoint = utils.toCelcius(this.dewpoint) }
            if (this.pressure !== '') { this.pressure = utils.inHgTohpa(this.pressure) }
            if (this.altitude !== '') { this.altitude = utils.ftToM(this.altitude).toFixed(2) }
          }
          break
        default:
          this.temperatureUnits = '°C'
          this.pressureUnits = 'hPa'
      }
    }
  },
  created: function () {
    this.units = this.userPrefs.units
  },
  methods: {
    onSubmit: function () {
      this.$v.$touch()
      if (this.$v.$invalid) {
        this.rho = ''
      } else {
        this.calculate()
        // trigger event to parent component that a result is ready
        this.$emit('calculate', this.rho)
      }
    },
    getLocation: function (event) {
      if (navigator.geolocation) {
        this.loadingLocation = true
        navigator.geolocation.getCurrentPosition(this.setPosition)
      } else {
        alert('Geolocation is not supported')
      }
    },
    getActivityLocation: function () {
      console.log(this.activityInfo)
      if (this.activityInfo) {
        this.loadingLocation = true
        this.setPosition({
          coords: {
            latitude: this.activityInfo.location.lat,
            longitude: this.activityInfo.location.lng
          },
          time: this.activityInfo.time
        })
      }
    },
    setPosition: async function (position) {
      console.log(position)

      this.lat = position.coords.latitude
      this.long = position.coords.longitude
      let time = new Date()
      if ('time' in position) {
        time = position.time
      }

      try {
        const elevationData = await mappingService.sendRequest(this.lat, this.long, this.units, process.env)
        if (elevationData) {
          this.altitude = elevationData.elevation
        }

        const weatherData = await weatherService.sendRequest(
          this.lat,
          this.long,
          this.units,
          time
        )
        if (weatherData) {
          this.temperature = weatherData.temperature
          this.dewpoint = weatherData.dewPoint
          this.pressure = weatherData.pressure
          this.calculate()
        }
      } catch (e) {
        console.log(e)
      } finally {
        this.loadingLocation = false
      }
    },
    calculate: function (event) {
      try {
        const result = rhoCalc(
          parseFloat(this.temperature),
          parseFloat(this.pressure),
          parseFloat(this.dewpoint),
          this.units,
          parseFloat(this.altitude)
        )
        this.rho = parseFloat(result).toFixed(4)
        this.rho_lbcuft = result.toPoundsPerCubicFeet().toFixed(4)

        return (this.units === 'metric' ? this.rho : this.rho_lbcuft)
      } catch (e) {
        console.log(e)
      }
    }
  }
}
</script>
