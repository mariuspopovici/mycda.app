<template>
  <div id="About">
    <div class="container">
      <h2>CdA Analysis</h2>
      <h4 v-if="!loading">Enter rolling resistance, mass and air density. Use CdA slider to align the virtual elevation profile.</h4>
      <span v-if="loading">Loading segment details, please wait...</span>
      <div id='virtualElevation' ref="virtualElevation" v-else>
        <b-container fluid>
          <b-row>
            <b-col cols="9">
              <vue-plotly id="plotly" ref="plotly" :data="chartData" :layout="chartLayout" :options="chartOptions" :autoResize="true"/>
            </b-col>
            <b-col cols="3">
              <b-card :bg-variant="theme">
                <b-form-group
                    description="Enter rider mass including bike in kilograms."
                    label="Rider Mass (kg)"
                    label-for="mass"
                >
                  <b-form-input id="mass" v-model.trim="mass"></b-form-input>
                </b-form-group>
                <b-form-group
                    description="Enter air density. Use the Rho Calculator to derive the value."
                    label="Air Density (kg/m<sup>3</sup>)"
                    label-for="rho"
                >
                  <b-form-input id="rho" v-model.trim="rho"></b-form-input>
                </b-form-group>
                <b-form-group
                    description="Enter tire rolling resistance (crr) value."
                    label="Tire Rolling Resistance"
                    label-for="crr"
                >
                  <b-form-input id="crr" v-model.trim="crr"></b-form-input>
                </b-form-group>
                CdA
                <vue-slider
                  lazy
                  :min="0.150" :max="0.500"
                  :interval="0.001"
                  v-model="cda">
                </vue-slider>
              </b-card>
            </b-col>
          </b-row>
        </b-container>
      </div>
    </div>
  </div>
</template>

<script>
import VuePlotly from '@statnett/vue-plotly'
import vueSlider from 'vue-slider-component'
import VirtualElevation from '../services/ve'

export default {
  name: 'CdA',
  metaInfo: {
    title: 'CdA',
    links: []
  },
  components: {
    VuePlotly,
    vueSlider
  },
  data () {
    return {
      loading: true,
      activityID: this.$route.params.id,
      time: [],
      power: [],
      altitude: [],
      speed: [],
      ve: [],
      mass: 85,
      cda: 0.351,
      crr: 0.005,
      rho: 1.1830,
      veService: null,
      invalidFeedback: '',
      validFeedback: '',
      chartData: [],
      chartLayout: {
        title: 'Virtual Elevation - ' + this.$props.description,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        modebar: {
          bgcolor: 'transparent'
        },
        font: { family: 'Roboto', color: '#b0bec5' },
        colorway: ['#f4a433', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39'],
        hoverlabel: {
          bgcolor: 'transparent'
        },
        legend: { orientation: 'h', yanchor: 'top', xanchor: 'center', y: 1.1, x: 0.5 },
        yaxis: {
          gridcolor: '#37474f',
          showgrid: true,
          tickfont: { color: '#f4a433' }
        },
        yaxis2: {
          side: 'right',
          showgrid: false,
          overlaying: 'y',
          tickfont: { color: '#404244' }
        },
        xaxis: {
          showgrid: false
        }
      },
      chartOptions: {
        displayModeBar: false,
        responsive: true
      }
    }
  },
  created: function () {
    this.filterData(this.$props.data, this.$props.range)
  },
  props: ['theme', 'range', 'data', 'description'],
  methods: {
    filterData: function (data, range) {
      let powerSeries = data[0]
      let altitudeSeries = data[1]
      let speedSeries = data[2]

      let time = []
      let power = []
      let altitude = []
      let speed = []

      powerSeries.x.forEach((x, i) => {
        if (x >= range.start && x <= range.end) {
          time.push(x)
          power.push(powerSeries.y[i])
          altitude.push(altitudeSeries.y[i])
          speed.push(speedSeries.y[i])
        }
      })

      this.time = time
      this.altitude = altitude
      this.power = power
      this.speed = speed

      this.chartData = [{
        x: time,
        y: altitude,
        mode: 'lines',
        name: 'Elevation'
      }]

      this.veService = new VirtualElevation(this.power, this.speed, this.altitude, this.time)
      this.calculateCdA()

      this.loading = false
    },
    calculateCdA: function () {
      // recalculate virtual elevation
      let ve = this.veService.calculateVirtualElevation(this.rho, this.mass, this.crr, this.cda)

      this.chartData = [
        {
          x: this.time,
          y: this.altitude,
          mode: 'lines',
          name: 'Elevation'
        },
        {
          x: this.time,
          y: ve,
          mode: 'lines',
          name: 'Virtual Elevation'
        }
      ]
    }
  },
  watch: {
    cda: function (val) {
      this.calculateCdA()
    }
  }
}
</script>

<style>
.tab-title-class {
    color: #FF0000 !important;
}
</style>
