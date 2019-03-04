<template>
  <div id="About">
    <!-- rho calculator model -->
    <b-modal :body-bg-variant="theme" hide-footer id="rhoModal" ref="rhoModal"
      :header-bg-variant="modalHeaderBgVariant"
      :header-text-variant="modalHeaderTextVariant"
      v-on:hidden="onHideCalculator"
      centered title="Air Density Calculator">
      <RhoCalculator v-if="isCalculatorVisible" v-on:calculate="onCalculate" showClose calculateCaption="Apply"/>
    </b-modal>
    <div class="container-fluid">
      <h2>CdA Analysis ({{analysisName}})</h2>
      <h4 v-if="!loading">Enter rolling resistance, mass and air density. Use the CdA slider to align the virtual elevation profile.
      </h4>
      <span v-if="loading">Loading segment details, please wait...<font-awesome-icon icon="spinner" spin/></span>
      <div id='virtualElevation' ref="virtualElevation" v-else>
        <b-container fluid>
          <b-row>
            <b-col sm="9">
              <vue-plotly id="plotly" ref="plotly" :data="chartData" :layout="chartLayout" :options="chartOptions" :autoResize="true"/>
            </b-col>
            <b-col sm="3">
              <b-card :bg-variant="theme">
                <b-form-group
                    description="Enter rider mass including bike."
                    :label="'Total Mass (' + this.weightUnits + ')'"
                    label-for="mass"
                >
                  <b-form-input id="mass" v-on:change="calculateCdA"
                    min="40" max="300" step="0.1"
                    v-model.trim="mass" type="number"></b-form-input>
                </b-form-group>
                <b-form-group
                    description="Enter air density. Use the Rho Calculator to derive the value."
                    label="Air Density (kg/m^3)"
                    label-for="rho"
                >
                  <b-input-group>
                    <b-form-input v-on:change="calculateCdA" id="rho" v-model.trim="rho" type="number" min="0" max="2" step="0.0001"></b-form-input>
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
                  :min="0.100" :max="0.500"
                  :interval="0.001"
                  v-model="cda"
                  v-bind:tooltip-style="sliderStyle"
                  v-bind:process-style="sliderStyle"
                  >
                </vue-slider>
                <b-row>
                  <b-col><b-form-checkbox id="showElevation" v-on:change="onShowElevation" v-model="showElevation">Elevation</b-form-checkbox></b-col>
                  <b-col><b-form-checkbox id="showLaps" v-on:change="onShowLaps" v-model="showLaps">Laps</b-form-checkbox></b-col>
                </b-row>
              </b-card>
            </b-col>
          </b-row>
          <b-row>
            <b-col cols=12>
              <br>
              <b-card :bg-variant="theme">
                <b-form-group label-cols-lg="3" label-cols-sm="4"
                              label="Notes"
                              label-size="lg"
                              label-class="font-weight-bold pt-0"
                              class="mb-0">
                  <b-form-group label-cols-lg="3" label-cols-sm="4"
                                label="Segment Name:"
                                label-class="text-sm-right"
                                label-for="name">
                    <b-form-input id="name" v-model="analysisName" v-on:input="setDirty"></b-form-input>
                  </b-form-group>
                  <b-form-group label-cols-lg="3" label-cols-sm="4"
                                label="Description:"
                                label-class="text-sm-right"
                                label-for="description">
                    <b-form-textarea id="description" v-model="analysisDescription"
                        placeholder="Enter description. You can record things such as weather conditions, equipment and position changes, etc."
                        v-on:input="setDirty"
                        :rows="3"
                        :max-rows="6">
                    </b-form-textarea>
                  </b-form-group>
                  <b-form-group label-cols-lg="3" label-cols-sm="4"
                    description="Mark this as the baseline segment. All other segments in this activity will be compared to this one.">
                    <b-form-checkbox id="baseline" v-model="isBaseline">Baseline Segment</b-form-checkbox>
                  </b-form-group>

                  <b-form-group label-cols-lg="3" label-cols-sm="4" v-if="$v.$invalid">
                    <b-alert show variant="danger">
                      <div v-if="$v.analysisName.$invalid">Segment name is required and length must be between 1 and 255.</div>
                      <div v-if="$v.mass.$invalid">Total Mass is required and must be between 40 and 300.</div>
                      <div v-if="$v.rho.$invalid">Air Density is required and must be between 0 and 2.</div>
                      <div v-if="$v.crr.$invalid">Rolling Resistance is required and must be between 0 and 1.</div>
                    </b-alert>
                  </b-form-group>

                  <b-form-group>
                    <div align="right">
                      <b-button v-on:click="exportData" variant="success">Export .CSV</b-button>
                      <b-button align="right" variant="primary"
                        :disabled="!dirty || $v.$invalid"
                        v-on:click="saveAnalysis">
                        <b-spinner small v-if="saving"/>
                        <span v-if="dirty && !saving">Save</span><span v-else-if="saving">Saving...</span><span v-else>Saved</span
                        ></b-button>
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
import { required, between, minLength, maxLength } from 'vuelidate/lib/validators'
import { db } from '../main'
import Utils from '@/services/utils'

const utils = new Utils()

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
  validations: {
    mass: { required, between: between(40, 300) },
    rho: { required, between: between(0, 2) },
    crr: { required, between: between(0, 1) },
    analysisName: { required, minLength: minLength(1), maxLength: maxLength(255) }
  },
  data () {
    return {
      showElevation: true,
      showLaps: false,
      weightUnits: '',
      isCalculatorVisible: false,
      saving: false,
      dirty: true,
      sliderStyle: {},
      modalHeaderBgVariant: this.theme,
      modalHeaderTextVariant: this.theme === 'dark' ? 'light' : 'dark',
      loading: true,
      activityID: this.$route.params.id,
      segmentID: this.$route.params.sid,
      analysisDescription: '',
      analysisName: '',
      isBaseline: false,
      time: [],
      power: [],
      altitude: [],
      speed: [],
      ve: [],
      laps: [],
      mass: 80,
      cda: 0.350,
      crr: 0.005,
      crrValid: true,
      rho: 1.2,
      savedRange: null,
      veService: null,
      invalidFeedback: '',
      validFeedback: '',
      chartData: [],
      chartLayout: {
        title: 'Virtual Elevation',
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
          tickfont: { color: '#2196f3' }
        },
        yaxis2: {
          side: 'right',
          showgrid: false,
          overlaying: 'y',
          tickfont: { color: '#f4a433' }
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
    if (this.user) {
      this.fetchData()
    }
    this.sliderStyle = {
      backgroundColor: '#3463af',
      borderColor: '#3463af'
    }

    this.weightUnits = this.userPrefs.units === 'metric' ? 'kg' : 'lbs'
  },
  methods: {
    setDirty: function () {
      this.dirty = true
    },
    saveAnalysis: async function () {
      if (this.$v.$invalid) {
        return
      }
      let isNew = false
      if (!this.segmentID) {
        isNew = true
        this.segmentID = utils.uuid()
      }

      // convert speed and elevation back to metric
      // convert units
      let saveSpeed = this.speed
      let saveAltitude = this.altitude

      if (this.units === 'imperial') {
        saveSpeed = this.speed.map(item => utils.miToKm(item))
        saveAltitude = this.altitude.map(item => utils.ftToM(item))
      }

      this.saving = true
      try {
        let segments = db.collection('segments')
        // if this is an edit there's no need to
        // send all the series ... they can't change.
        if (isNew) {
          let doc = {
            id: this.segmentID,
            mass: this.mass,
            rho: this.rho,
            cda: this.cda,
            crr: this.crr,
            activity: this.activityID,
            name: this.analysisName,
            description: this.analysisDescription,
            range: this.savedRange,
            time: this.time,
            power: this.power,
            speed: saveSpeed,
            altitude: saveAltitude,
            isBaseline: this.isBaseline,
            ve: this.ve,
            laps: this.laps ? this.laps : []
          }

          await segments.doc(this.segmentID).set(doc)
        } else {
          let doc = {
            mass: this.mass,
            rho: this.rho,
            cda: this.cda,
            crr: this.crr,
            name: this.analysisName,
            description: this.analysisDescription,
            isBaseline: this.isBaseline,
            ve: this.ve
          }
          await segments.doc(this.segmentID).update(doc)
        }
        this.saving = false
        this.dirty = false
      } catch (error) {
        console.log(error)
      }
    },
    onCalculate: function (result) {
      this.rho = result
      this.$refs.rhoModal.hide()
      this.isCalculatorVisible = false
      this.calculateCdA()
    },
    showRhoCalculator: function () {
      this.isCalculatorVisible = true
      this.$refs.rhoModal.show()
    },
    onHideCalculator () {
      this.isCalculatorVisible = false
    },
    exportData: function () {
      let csvContent = 'data:text/csv;charset=utf-8,'
      csvContent += [
        'Time,Speed,Power,Altitude',
        ...this.time.map((item, i) => {
          return item.toLocaleTimeString() + ',' + this.speed[i] + ',' + this.power[i] + ',' + this.altitude[i]
        })
      ]
        .join('\n')
        .replace(/(^\[)|(\]$)/gm, '')

      const data = encodeURI(csvContent)

      const link = document.createElement('a')
      link.setAttribute('href', data)
      link.setAttribute('download', 'export.csv')
      document.body.appendChild(link)
      link.click()
    },
    fetchData: async function () {
      if (this.segmentID) {
        // a specific segment was requested for editing
        // so let's fetch the segment saved details from store
        try {
          let docRef = db.collection('segments').doc(this.segmentID)
          const doc = await docRef.get()
          const docData = doc.data()
          this.mass = docData.mass
          this.rho = docData.rho
          this.cda = docData.cda
          this.crr = docData.crr
          this.analysisName = docData.name
          this.analysisDescription = docData.description
          this.isBaseline = docData.isBaseline ? docData.isBaseline : false
          this.laps = docData.laps

          docData.time.forEach((x, i) => {
            if (docData.speed[i] !== 0 && docData.power[i] !== 0) {
              this.time.push(x.toDate())
              this.power.push(docData.power[i])
              this.altitude.push(docData.altitude[i])
              this.speed.push(docData.speed[i])
            }
          })

          this.ve = docData.ve
          this.savedRange = {
            start: docData.range.start.toDate(),
            end: docData.range.end.toDate()
          }
          if (this.userPrefs) {
            this.units = this.userPrefs.units
          }
        } catch (error) {
          console.log(error)
          return
        }
      } else {
        // we use the data sent through properties
        // and we need to filter it by range
        this.savedRange = this.range
        let data = this.data
        let powerSeries = data.power
        let altitudeSeries = data.altitude
        let speedSeries = data.speed
        let timeSeries = data.time

        let time = []
        let power = []
        let altitude = []
        let speed = []

        timeSeries.forEach((x, i) => {
        // filter out dropouts or zero speed, zero power points, power spikes
          if (x >= this.savedRange.start && x <= this.savedRange.end &&
            speedSeries[i] !== 0 && powerSeries[i] !== 0 &&
            powerSeries[i] < 2000) {
            time.push(x)
            power.push(powerSeries[i])
            altitude.push(altitudeSeries[i])
            speed.push(speedSeries[i])
          }
        })

        this.time = time
        this.altitude = altitude
        this.power = power
        this.speed = speed
        this.laps = data.laps

        // we load these from preferences if a new analysis is requested
        // otherwise we used the saved ones
        if (this.userPrefs) {
          this.units = this.userPrefs.units
          this.mass = parseFloat(this.userPrefs.weight) + parseFloat(this.userPrefs.bikeWeight)
          this.cda = this.userPrefs.cda
          this.crr = this.userPrefs.crr
        }
        this.analysisName = this.description
      }

      // now we have the data from whatever means it was obtained
      this.chartData = [{
        x: this.time,
        y: this.altitude,
        mode: 'lines',
        name: 'Elevation'
      }]

      // convert units
      if (this.units === 'imperial') {
        this.speed = this.speed.map(item => utils.kmToMi(item))
        this.altitude = this.altitude.map(item => utils.mToFt(item))
      }

      this.veService = new VirtualElevation(this.power,
        this.speed,
        this.altitude,
        this.time,
        this.userPrefs.units,
        this.userPrefs.dloss)
      this.calculateCdA()

      this.loading = false
    },
    onShowElevation: function (checked) {
      this.showElevation = checked
      this.calculateCdA()
    },

    onShowLaps: function (checked) {
      this.showLaps = checked
      if (checked && this.laps) {
        // add a new shape to the chart layout
        let shapes = []
        let _this = this
        let lapNumber = 0
        this.laps.forEach(function (lap) {
          let start = new Date(lap.start_time)
          let end = new Date(start)
          end.setSeconds(start.getSeconds() + parseInt(lap.total_elapsed_time))

          if (start > _this.savedRange.start && end < _this.savedRange.end) {
            lapNumber++
            shapes.push({
              type: 'rect',
              xref: 'x',
              yref: 'paper',
              x0: start,
              y0: 0,
              x1: end,
              y1: 1,
              fillcolor: utils.LightenDarkenColor('#82149b', (lapNumber + 1) * 20),
              opacity: 0.2,
              line: {
                width: 0.5
              }
            })
          }
        })
        if (shapes.length > 0) {
          this.chartLayout.shapes = shapes
          this.calculateCdA()
        }
      } else {
        console.log('hide laps')
        this.chartLayout.shapes = []
        this.calculateCdA()
      }
    },

    calculateCdA: function () {
      this.dirty = true
      // recalculate virtual elevation
      // use mass in kg for ve calculations
      let mass = this.units === 'metric' ? this.mass : utils.lbsToKg(this.mass)

      this.ve = this.veService.calculateVirtualElevation(this.rho, mass, this.crr, this.cda)
      let data = []

      if (this.showElevation) {
        data.push({
          x: this.time,
          y: this.altitude,
          type: 'scatter',
          name: 'Elevation',
          yaxis: 'y2'
        })
      }
      data.push(
        {
          x: this.time,
          y: this.ve,
          type: 'scatter',
          name: 'Virtual Elevation',

          line: {
            color: '#2196f3'
          }

        }
      )
      this.chartData = data
    }
  }
}
</script>

<style>
</style>
