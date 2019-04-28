<template>
  <div id="About">
    <!-- rho calculator model -->
    <b-modal :body-bg-variant="theme" hide-footer id="rhoModal" ref="rhoModal"
      :header-bg-variant="modalHeaderBgVariant"
      :header-text-variant="modalHeaderTextVariant"
      v-on:hidden="onHideCalculator"
      centered title="Air Density Calculator">
      <RhoCalculator v-if="isCalculatorVisible" v-on:calculate="onCalculate" :activityInfo="getActivityInfo()" showClose calculateCaption="Apply"/>
    </b-modal>
    <div class="container-fluid">
      <h2>CdA Analysis ({{analysisName}})</h2>
      <h4 v-if="!loading">Enter rolling resistance, mass and air density. Use the CdA slider to align the virtual elevation profile.
      </h4>
      <span v-if="loading">Loading segment details, please wait...<font-awesome-icon icon="spinner" spin/></span>
      <div id='virtualElevation' ref="virtualElevation" v-else>
        <b-container fluid>
          <b-row>
            <b-col lg="9">
              <vue-plotly id="plotly" ref="plotly" :data="chartData" :layout="chartLayout" :options="chartOptions" autoResize/>
              <b-row align-h="center" align-v="center">
                <b-form-checkbox id="showElevation" v-on:change="onShowElevation" v-model="showElevation">Elevation</b-form-checkbox>
                &nbsp;&nbsp;
                <b-form-checkbox v-if="laps.length > 0" id="showLaps" v-on:change="onShowLaps" v-model="showLaps">Laps</b-form-checkbox>
                &nbsp;&nbsp;
                <b-form-checkbox v-if="hasLocation" id="findLoopsCheckBox" v-on:change="onFindLoops" v-model="showLoops">Find Loops</b-form-checkbox>
                &nbsp;&nbsp;
                <b-dropdown v-if="showLoops" droptop id="showLoopsDD" no-caret
                  variant="primary" v-b-tooltip.hover title="Loop Finder Preferences"
                  ref="loopsDropDown" size="sm">
                  <template slot='text'>
                    <i class="fa fa-cog"></i>
                  </template>
                  <b-dropdown-form style="width: 300px;">
                    <LoopFinderPrefs :minDuration="loopFinderPrefs.minDuration"
                      :maxDuration="loopFinderPrefs.maxDuration"
                      :precision="loopFinderPrefs.precision" v-on:change='onLoopFinderPrefsChange'/>
                  </b-dropdown-form>
                </b-dropdown>
              </b-row>
            </b-col>
            <b-col lg="3">
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
import LoopFinder from '@/services/loopdetect'
import LoopFinderPrefs from '@/components/LoopFinderPrefs'
const utils = new Utils()

export default {
  name: 'CdA',
  metaInfo: {
    title: 'CdA Analysis'
  },
  components: {
    VuePlotly,
    vueSlider,
    RhoCalculator,
    LoopFinderPrefs
  },
  computed: {
    user () {
      return this.$store.getters.getUser
    },
    userPrefs () {
      return this.$store.getters.getUserPrefs
    }
  },
  props: ['theme', 'range', 'data', 'description', 'loopPrefs'],
  validations: {
    mass: { required, between: between(40, 300) },
    rho: { required, between: between(0, 2) },
    crr: { required, between: between(0, 1) },
    analysisName: { required, minLength: minLength(1), maxLength: maxLength(255) }
  },
  data () {
    return {
      loopFinder: null,
      showDistanceAxis: true,
      showElevation: true,
      showLaps: false,
      showLoops: false,
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
      airspeed: [],
      distance: [],
      ve: [],
      laps: [],
      loops: [],
      loopFinderPrefs: {
        precision: 'low',
        minDuration: 60,
        maxDuration: 1000
      },
      location: [],
      hasLocation: false,
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
        autoResize: true,
        height: 400,
        margin: {
          t: 80,
          b: 40
        },
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
      if (this.veService) {
        this.calculateCdA()
      }
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
    if (this.loopPrefs) {
      this.loopFinderPrefs = this.loopPrefs
    }
  },
  methods: {
    getActivityInfo: function () {
      return {
        hasLocation: this.hasLocation,
        location: this.location[0],
        time: this.time[0]
      }
    },
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
      let saveAirSpeed = this.airspeed
      let saveAltitude = this.altitude
      let saveDistance = this.distance

      if (this.units === 'imperial') {
        saveSpeed = this.speed.map(item => utils.miToKm(item))
        saveAirSpeed = this.airspeed.map(item => utils.miToKm(item))
        saveDistance = this.distance.map(item => utils.miToKm(item))
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
            distance: saveDistance,
            speed: saveSpeed,
            airspeed: saveAirSpeed,
            altitude: saveAltitude,
            location: this.location,
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

      if (this.distance.length > 0) {
        csvContent += [
          'time,speed,airspeed,distance,power,elevation',
          ...this.time.map((item, i) => {
            let timeString = item.getMinutes() + ':' + item.getSeconds() + '.' + item.getMilliseconds()
            return timeString + ',' + this.speed[i] + ',' + this.airspeed[i] + ',' + this.distance[i] + ',' + this.power[i] + ',' + this.altitude[i]
          })
        ]
          .join('\n')
          .replace(/(^\[)|(\]$)/gm, '')
      } else {
        csvContent += [
          'time,speed,airspeed,power,elevation',
          ...this.time.map((item, i) => {
            let timeString = item.getMinutes() + ':' + item.getSeconds() + '.' + item.getMilliseconds()
            return timeString + ',' + this.speed[i] + ',' + this.airspeed[i] + ',' + this.power[i] + ',' + this.altitude[i]
          })
        ]
          .join('\n')
          .replace(/(^\[)|(\]$)/gm, '')
      }

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
          this.laps = docData.laps ? docData.laps : []
          this.showDistanceAxis = docData.distance !== undefined

          docData.time.forEach((x, i) => {
            this.time.push(x.toDate())
            this.power.push(docData.power[i])
            this.altitude.push(docData.altitude[i])
            this.speed.push(docData.speed[i])
            this.airspeed.push(docData.airspeed ? docData.airspeed[i] : docData.speed[i])
            if (this.showDistanceAxis) {
              this.distance.push(docData.distance[i])
            }
            if (docData.location) {
              this.location.push(docData.location[i])
            }
          })

          this.ve = docData.ve
          this.savedRange = {
            start: docData.range.start.toDate(),
            end: docData.range.end.toDate(),
            startDistance: this.showDistanceAxis ? this.distance[0] : 0,
            endDistance: this.showDistanceAxis ? this.distance[this.distance.length - 1] : 0
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
        let airSpeedSeries = data.airspeed
        let timeSeries = data.time
        let distanceSeries = data.distance
        let locationSeries = data.location

        let time = []
        let power = []
        let altitude = []
        let speed = []
        let airspeed = []
        let distance = []
        let location = []

        let hasLocation = locationSeries && locationSeries.length > 0

        timeSeries.forEach((x, i) => {
        // filter out dropouts or zero speed, zero power points, power spikes
          if (x >= this.savedRange.start && x <= this.savedRange.end) {
            time.push(x)
            power.push(powerSeries[i])
            altitude.push(altitudeSeries[i])
            speed.push(speedSeries[i])
            airspeed.push(airSpeedSeries[i])
            distance.push(distanceSeries[i])
            if (hasLocation) {
              location.push(locationSeries[i])
            }
          }
        })

        this.savedRange.startDistance = distance[0]
        this.savedRange.endDistance = distance[distance.length - 1]

        this.time = time
        this.altitude = altitude
        this.power = power
        this.speed = speed
        this.airspeed = airspeed
        this.distance = distance
        this.laps = data.laps
        this.location = location

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

      this.hasLocation = this.location.length > 0 && this.location[0] !== undefined

      // now we have the data from whatever means it was obtained
      this.chartData = [{
        x: this.distance.length > 0 ? this.distance : this.time,
        y: this.altitude,
        mode: 'lines',
        name: 'Elevation'
      }]

      // convert units
      if (this.units === 'imperial') {
        this.speed = this.speed.map(item => utils.kmToMi(item))
        this.airspeed = this.airspeed.map(item => utils.kmToMi(item))
        this.distance = this.distance.map(item => utils.kmToMi(item))
        this.altitude = this.altitude.map(item => utils.mToFt(item))
      }

      this.veService = new VirtualElevation(this.power,
        this.speed,
        this.airspeed,
        this.altitude,
        this.time,
        this.userPrefs.units,
        this.userPrefs.dloss)

      this.calculateCdA()

      if (this.hasLocation) {
        this.loopFinder = new LoopFinder(this.location)
      }

      this.loading = false
    },
    onShowElevation: function (checked) {
      this.showElevation = checked
      this.calculateCdA()
    },
    onFindLoops: function (checked) {
      this.showLoops = checked
      if (checked && this.laps) {
        this.findLoops()
      } else {
        let layoutUpdate = {
          shapes: []
        }
        let plotly = this.$refs.plotly
        plotly.relayout(layoutUpdate)
        this.calculateCdA()
      }
    },
    findLoops: function () {
      let layoutUpdate = {
        shapes: []
      }
      this.showLaps = false

      let precision = 4
      switch (this.loopFinderPrefs.precision) {
        case 'low':
          precision = 3
          break
        case 'medium':
          precision = 4
          break
        case 'high':
          precision = 5
          break
        default:
          precision = 4
      }

      this.loops = this.loopFinder.findLoops(precision, this.loopFinderPrefs.minDuration, this.loopFinderPrefs.maxDuration)

      this.loops.forEach((loop, index) => {
        let start = this.distance[loop.startIndex]
        let end = this.distance[loop.endIndex]
        layoutUpdate.shapes.push(this.lapShape(start, end, index))
      })

      let plotly = this.$refs.plotly
      plotly.relayout(layoutUpdate)
      this.calculateCdA()
    },
    onLoopFinderPrefsChange: function (params) {
      this.loopFinderPrefs = params
      this.findLoops()
      this.$refs.loopsDropDown.hide(true)
    },
    onShowLaps: function (checked) {
      this.showLaps = checked
      if (checked) {
        this.showLoops = false
      }
      let plotly = this.$refs.plotly
      if (checked && this.laps) {
        // add a new shape to the chart layout
        let shapes = []
        let _this = this
        let lapNumber = 0
        let end = 0
        let start = 0
        let rangeStart = 0
        let rangeEnd = 0
        this.laps.forEach(function (lap, i) {
          if (_this.showDistanceAxis) {
            rangeStart = _this.savedRange.startDistance
            rangeEnd = _this.savedRange.endDistance
            start = parseFloat(lap.start_distance)
            end = start + parseFloat(lap.total_distance)
          } else {
            rangeStart = _this.savedRange.start
            rangeEnd = _this.savedRange.end
            start = new Date(lap.start_time)
            end = new Date(start)
            end.setSeconds(start.getSeconds() + parseInt(lap.total_elapsed_time))
          }

          if (start && end) {
            let newShape = null

            if (start > rangeStart && end < rangeEnd) {
              newShape = _this.lapShape(start, end, lapNumber)
            } else if (start < rangeStart && end >= rangeEnd) {
              newShape = _this.lapShape(rangeStart, rangeEnd, lapNumber)
            } else if (start < rangeStart && end >= rangeStart) {
              newShape = _this.lapShape(rangeStart, end, lapNumber)
            } else if (start < rangeEnd && end >= rangeEnd) {
              newShape = _this.lapShape(start, rangeEnd, lapNumber)
            }
            shapes.push(newShape)
          }

          lapNumber++
        })
        if (shapes.length > 0) {
          let layoutUpdate = {
            shapes: shapes
          }
          plotly.relayout(layoutUpdate)
          this.calculateCdA()
        }
      } else {
        let layoutUpdate = {
          shapes: []
        }
        plotly.relayout(layoutUpdate)
        this.calculateCdA()
      }
    },

    lapShape: function (start, end, index) {
      return {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: start,
        y0: 0,
        x1: end,
        y1: 1,
        fillcolor: index % 2 === 0 ? '#7549a0' : utils.LightenDarkenColor('#7549a0', 40),
        opacity: 0.2,
        line: {
          width: 0.5,
          dash: 'longdash'
        }
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
          x: this.distance.length > 0 ? this.distance : this.time,
          y: this.altitude,
          type: 'scatter',
          name: 'Elevation',
          yaxis: 'y2'
        })
      }
      data.push(
        {
          x: this.distance.length > 0 ? this.distance : this.time,
          y: this.ve,
          type: 'scatter',
          name: 'Virtual Elevation',

          line: {
            color: '#2196f3'
          }

        }
      )

      if (this.showLoops) {
        let x = []
        let y = []
        let text = []
        this.loops.forEach((loop, index) => {
          x.push(this.distance[loop.startIndex])
          y.push(this.ve[loop.startIndex])
          text.push('Loop ' + parseInt(index + 1))
          if (index === this.loops.length - 1) {
            x.push(this.distance[loop.endIndex])
            y.push(this.ve[loop.endIndex])
            text.push('End Loop ' + parseInt(index + 1))
          }
        })

        data.push(
          {
            x: x,
            y: y,
            type: 'scatter',
            mode: 'markers+text',
            text: text,
            textposition: 'bottom center',
            marker: {
              line: {
                color: 'rgb(231, 99, 250)',
                width: 6
              }
            },
            name: 'Loop Markers',
            showlegend: false
          }
        )
      }

      this.chartData = data
    }
  }
}
</script>

<style>
</style>
