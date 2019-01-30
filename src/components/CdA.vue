<template>
  <div id="About">
    <!-- rho calculator model -->
    <b-modal :body-bg-variant="theme" hide-footer id="rhoModal" ref="rhoModal"
      :header-bg-variant="modalHeaderBgVariant"
      :header-text-variant="modalHeaderTextVariant"
      centered title="Air Density Calculator">
      <RhoCalculator v-on:calculate="onCalculate" showClose unitsType="metric" calculateCaption="Apply"/>
    </b-modal>
    <div class="container">
      <h2>CdA Analysis</h2>
      <h4 v-if="!loading">Enter rolling resistance, mass and air density. Use the CdA slider to align the virtual elevation profile.</h4>
      <span v-if="loading">Loading segment details, please wait...</span>
      <div id='virtualElevation' ref="virtualElevation" v-else>
        <b-container fluid>
          <b-row>
            <b-col sm="9">
              <vue-plotly id="plotly" ref="plotly" :data="chartData" :layout="chartLayout" :options="chartOptions" :autoResize="true"/>
            </b-col>
            <b-col sm="3">
              <b-card :bg-variant="theme">
                <b-form-group
                    description="Enter rider mass including bike in kilograms."
                    label="Rider Mass (kg)"
                    label-for="mass"
                >
                  <b-form-input id="mass" v-on:change="calculateCdA"
                    min="40" max="250"
                    v-model.trim="mass" type="number"></b-form-input>
                </b-form-group>
                <b-form-group
                    description="Enter air density. Use the Rho Calculator to derive the value."
                    label="Air Density (kg/m<sup>3</sup>)"
                    label-for="rho"
                >
                  <b-input-group>
                    <b-form-input v-on:change="calculateCdA" id="rho" v-model.trim="rho" type="number" step="0.0001"></b-form-input>
                    <b-input-group-append>
                      <b-btn variant="primary" id="btnCalc" v-on:click="showRhoCalculator" v-b-tooltip.hover title="Open Calculator"><i class="fa fa-calculator"></i></b-btn>
                    </b-input-group-append>
                  </b-input-group>
                </b-form-group>
                <b-form-group
                    description="Enter tire rolling resistance (crr) value."
                    label="Rolling Resistance"
                    label-for="crr"
                >
                  <b-form-input id="crr" v-on:change="calculateCdA"
                    min="0" max="1" ref="crr"
                    v-model.trim="crr" type="number" step="0.0001"></b-form-input>
                </b-form-group>
                CdA
                <vue-slider
                  :use-keyboard="true"
                  :min="0.150" :max="0.500"
                  :interval="0.001"
                  v-model="cda"
                  v-bind:tooltip-style="sliderStyle"
                  v-bind:process-style="sliderStyle"
                  >
                </vue-slider>
              </b-card>
            </b-col>
          </b-row>
          <b-row>
            <b-col cols=12>
              <br>
              <b-card :bg-variant="theme">
                <b-form-group horizontal
                              breakpoint="lg"
                              label="Notes"
                              label-size="lg"
                              label-class="font-weight-bold pt-0"
                              class="mb-0">
                  <b-form-group horizontal
                                label="Segment Name:"
                                label-class="text-sm-right"
                                label-for="name">
                    <b-form-input id="name" v-model="description"></b-form-input>
                  </b-form-group>
                  <b-form-group horizontal
                                label="Description:"
                                label-class="text-sm-right"
                                label-for="description">
                    <b-form-textarea id="description" v-model="analysisDescription"
                        placeholder="Enter description. You can record things such as weather conditions, equipment and position changes, etc."
                        :rows="3"
                        :max-rows="6">
                    </b-form-textarea>
                  </b-form-group>
                  <b-form-group>
                    <div align="right">
                      <b-button align="right" variant="primary">Save</b-button>
                    </div>
                  </b-form-group>
                </b-form-group>
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
import VirtualElevation from '@/services/ve'
import RhoCalculator from '@/components/RhoCalculator'

export default {
  name: 'CdA',
  metaInfo: {
    title: 'CdA Analysis'
  },
  components: {
    VuePlotly,
    vueSlider,
    RhoCalculator
  },
  computed: {
    user () {
      return this.$store.getters.getUser
    },
    userPrefs () {
      return this.$store.getters.getUserPrefs
    }
  },
  props: ['theme', 'range', 'data', 'description'],
  data () {
    return {
      sliderStyle: {},
      modalHeaderBgVariant: this.theme,
      modalHeaderTextVariant: this.theme === 'dark' ? 'light' : 'dark',
      loading: true,
      activityID: this.$route.params.id,
      analysisDescription: '',
      time: [],
      power: [],
      altitude: [],
      speed: [],
      ve: [],
      mass: 85,
      cda: 0.351,
      crr: 0.005,
      crrValid: true,
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
  watch: {
    cda: function (val) {
      this.calculateCdA()
    }
  },
  created: function () {
    this.fetchData(this.$props.data, this.$props.range)

    this.sliderStyle = {
      backgroundColor: '#3463af',
      borderColor: '#3463af'
    }
  },
  methods: {
    onCalculate: function (result) {
      this.rho = result
      this.$refs.rhoModal.hide()
    },
    showRhoCalculator: function () {
      this.$refs.rhoModal.show()
    },
    fetchData: async function (data, range) {
      let powerSeries = data[0]
      let altitudeSeries = data[1]
      let speedSeries = data[2]

      let time = []
      let power = []
      let altitude = []
      let speed = []

      powerSeries.x.forEach((x, i) => {
        // filter out dropouts or zero speed + zero power points
        if (x >= range.start && x <= range.end && !(speedSeries.y[i] === 0 && powerSeries.y[i] === 0)) {
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

      if (this.userPrefs) {
        this.units = this.userPrefs.units
        this.mass = parseFloat(this.userPrefs.weight) + parseFloat(this.userPrefs.bikeWeight)
        this.cda = this.userPrefs.cda
        this.crr = this.userPrefs.crr
      }

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
          type: 'scatter',
          name: 'Elevation'
        },
        {
          x: this.time,
          y: ve,
          type: 'scatter',
          name: 'Virtual Elevation',
          yaxis: 'y2'
        }
      ]
    }
  }
}
</script>

<style>
</style>
