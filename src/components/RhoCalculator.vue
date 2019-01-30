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
                @blur="$v.temperature.$touch()"
                v-model.trim="$v.temperature.$model"
                maxlength="5"
                autocomplete="off"
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
                v-model.trim="$v.dewpoint.$model"
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
                    checked="true"
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
              <LoadingButton
                :loading="loadingLocation"
                caption="My Location"
                loadingCaption="Please wait..."
                v-on:click.native="getLocation"
              ></LoadingButton>
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
import WeatherService from '@/services/weather'
import LoadingButton from '@/components/LoadingButton'

const weatherService = new WeatherService()

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
    unitsType: {
      type: String,
      default: 'metric'
    },
    calculateCaption: {
      type: String,
      default: 'Calculate'
    }
  },
  data () {
    return {
      temperature: '',
      dewpoint: '',
      pressure: '',
      rho: '',
      rho_lbcuft: '',
      temperatureUnits: '°C',
      pressureUnits: 'hPa',
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
    }
  },
  watch: {
    units: function (val, oldVal) {
      // when units change
      switch (val) {
        case 'imperial':
          // set placeholders
          this.temperatureUnits = '°F'
          this.pressureUnits = 'inHg'
          if (oldVal !== val) {
            // convert units to imperial from metric
            this.temperature = weatherService.toFahrenheit(this.temperature)
            this.dewpoint = weatherService.toFahrenheit(this.dewpoint)
            this.pressure = weatherService.hpaToInHg(this.pressure)
          }
          break
        case 'metric':
          // set placeholders
          this.temperatureUnits = '°C'
          this.pressureUnits = 'hPa'
          if (oldVal !== val) {
            // convert units to metric from imperial
            this.temperature = weatherService.toCelcius(this.temperature)
            this.dewpoint = weatherService.toCelcius(this.dewpoint)
            this.pressure = weatherService.inHgToC(this.pressure)
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
        let result = this.calculate()
        this.$emit('calculate', result)
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
    setPosition: async function (position) {
      this.lat = position.coords.latitude
      this.long = position.coords.longitude

      try {
        const weatherData = await weatherService.sendRequest(
          this.lat,
          this.long,
          this.units,
          process.env
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
      const rhoCalc = require('@mariuspopovici/rho')
      try {
        const result = rhoCalc(
          parseFloat(this.temperature),
          parseFloat(this.pressure),
          parseFloat(this.dewpoint),
          this.units
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
