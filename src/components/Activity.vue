<template>
  <div class="container" id="Activity">
    <h2 @mouseleave="onTitleHover" @mouseenter="onTitleHover">
      <span v-if="!editTitleEnabled">{{activityName}} Activity Details</span>
      <i @click="toggleTitleEdit" v-if="!editTitleEnabled && showEditButton" class="fa fa-edit fa-1x"></i>
      <b-input-group v-if="editTitleEnabled">
        <b-form-input ref="editActivityTitle"
          v-model="activityName"
          @keyup.native.esc="cancelEdit" @keyup.native.enter="updateTitle" @blur.native="cancelEdit">
        </b-form-input>
        <b-input-group-append>
          <b-btn variant="success" v-on:click="updateTitle" v-b-tooltip.hover title="Rename Activity"><i class="fa fa-check"></i></b-btn>
        </b-input-group-append>
      </b-input-group>
    </h2>
    <h4 v-if="!loading">Zoom in on an activity section or select a lap for analysis.</h4>
    <span v-if="loading">Loading activity details, please wait... <font-awesome-icon icon="spinner" spin/></span>
    <div id='activityDetails' ref="activityDetails" v-else>
      <vue-plotly id="plotly" ref="plotly" :data="chartData" :layout="chartLayout" :options="chartOptions"
        :autoResize="true"
        v-on:relayout="onRelayout"/>
      <b-card no-body :bg-variant="theme">
        <b-tabs small pills card v-on:input="selectLap">
          <b-tab title="Entire Activity" active>
            <p class="card-text"><b>Date:</b> {{timestamp}}</p>
            <p class="card-text"><b>Total Time:</b> {{totalTime}} </p>
            <p class="card-text"><b>Distance:</b> {{totalDistance}} km </p>
            <p class="card-text"><b>Avg Speed:</b> {{avgSpeed}} km/h</p>
            <p class="card-text"><b>Avg Power:</b> {{avgPower}} W</p>
          </b-tab>
          <b-tab v-for="(lap, index) in laps" :key= "index" :title="'Lap ' + (index +1 )">
            <b-button v-if="!lapZoomedIn" size="sm" v-on:click="zoomLap(index)" variant="secondary"><i class="fa fa-search-plus"></i> Zoom In</b-button>
            <b-button v-if="lapZoomedIn" size="sm" v-on:click="zoomLap(-1)" variant="secondary">Reset Zoom</b-button>
            <b-button variant="success" size="sm" :to="{
              name: 'activity.cda',
              params: {
                id: activityID,
                range: getLapRange(index),
                data: chartData,
                description: 'Lap ' + (index + 1)
              }}">Analyze</b-button>
            <p>
            <p class="card-text"><b>Start Time:</b> {{new Date(lap.start_time).toLocaleString()}}</p>
            <p class="card-text"><b>Duration (h:m:s):</b> {{(new Date(parseInt(lap.total_elapsed_time) * 1000)).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0]}}</p>
            <p class="card-text"><b>Distance:</b> {{lap.total_distance.toFixed(2)}} km </p>
            <p class="card-text"><b>Avg Speed:</b> {{lap.avg_speed.toFixed(2)}} km/h</p>
            <p class="card-text"><b>Avg Power:</b> {{lap.avg_power}} W</p>
          </b-tab>
          <b-tab title="Selection" v-if="selectionActive" active>
            <b-button size="sm" v-on:click="removeSelection" variant="secondary">Undo Selection</b-button>
            <b-button variant="success" size="sm" :to="{
              name: 'activity.cda',
              params: {
                id: activityID,
                range: selectionXRange,
                data: chartData,
                description: 'Selection'
              }}">Analyze</b-button>
              <p>
              <p class="card-text"><b>Start Time:</b> {{selectionXRange.start.toLocaleString()}}</p>
              <p class="card-text"><b>End Time:</b> {{selectionXRange.end.toLocaleString()}}</p>
              <p class="card-text"><b>Duration (h:m:s):</b> {{this.secondsToHms((this.selectionXRange.end - this.selectionXRange.start) / 1000)}}</p>
          </b-tab>
        </b-tabs>
      </b-card>
    </div>
  </div>
</template>

<script>
import { db } from '../main'
import VuePlotly from '@statnett/vue-plotly'
const rp = require('request-promise')

export default {
  name: 'Activity',
  metaInfo: {
    title: 'Activity Details'
  },
  components: {
    VuePlotly
  },
  props: ['theme'],
  computed: {
    user () {
      return this.$store.getters.getUser
    }
  },
  data () {
    return {
      showEditButton: false,
      editTitleEnabled: false,
      selectionActive: false,
      loading: true,
      activityID: this.$route.params.id,
      activityName: '',
      totalTime: '',
      totalDistance: '',
      avgSpeed: '',
      avgPower: '',
      avgCadence: '',
      timestamp: '',
      lapZoomedIn: false,
      laps: [],
      initXRange: null,
      selectionXRange: null,
      chartData: [],
      chartLayout: {
        title: '',
        dragmode: 'zoom+select',
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        modebar: {
          bgcolor: 'transparent'
        },
        font: { family: 'Roboto', color: '#b0bec5' },
        colorway: ['#f4a433', '#828893', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39'],
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
        yaxis3: {
          side: 'right',
          showgrid: false,
          overlaying: 'y',
          tickfont: { color: '#2196f3' }
        },
        xaxis: {
          showgrid: false
        }
      },
      chartOptions: {
        displayModeBar: false
      }
    }
  },
  created: function () {
    this.fetchData(this.activityID)
  },
  methods: {
    updateTitle: async function () {
      let docRef = db.collection('activities').doc(this.activityID)
      let _this = this
      try {
        await docRef.update({
          name: _this.activityName
        })
        this.editTitleEnabled = false
        this.showEditButton = false
      } catch (error) {
        console.log(error)
      }
    },
    cancelEdit: function () {
      // restore old activity name
      this.activityName = this.tmpActivityName
      this.toggleTitleEdit()
    },
    toggleTitleEdit: function () {
      this.editTitleEnabled = !this.editTitleEnabled
      if (this.editTitleEnabled) {
        // save the initial name in case of undo / cancel edit and focus the input control
        this.tmpActivityName = this.activityName
        let _this = this
        setTimeout(() => {
          // need a short delay because the element is not visible yet
          _this.$refs.editActivityTitle.focus()
        }, 200)
      } else {
        this.showEditButton = false
        this.tmpActivityName = ''
      }
    },
    onTitleHover: function () {
      this.showEditButton = !this.showEditButton
    },
    removeSelection: function () {
      this.selectionActive = false
      this.selectionXRange = null
      this.chartLayout.xaxis = {
        showgrid: false,
        range: [this.initXRange.start, this.initXRange.end]
      }
      this.chartLayout.title.text = 'Selection'
    },
    onRelayout: function (event) {
      // check if this was triggered by a drag to zoom event
      if ('xaxis.range[0]' in event && 'xaxis.range[1]' in event) {
        this.selectionActive = true
        this.selectionXRange = {
          start: new Date(event['xaxis.range[0]']),
          end: new Date(event['xaxis.range[1]'])
        }
        this.chartLayout.title.text = 'Selection'
      }
    },
    resetZoom: function () {
      this.chartLayout.xaxis = {
        showgrid: false,
        range: [this.initXRange.start, this.initXRange.end]
      }
      this.lapZoomedIn = false
    },
    getLapRange: function (index) {
      const lap = this.laps[index]
      let start = new Date(lap.start_time)
      let end = new Date(start)
      end.setSeconds(start.getSeconds() + parseInt(lap.total_elapsed_time))

      return {
        start: start,
        end: end
      }
    },
    zoomLap: function (index) {
      if (index < 0 && this.lapZoomedIn) {
        // reset zoom
        this.resetZoom()
      } else {
        // calculate new range based on the selected lap
        const lap = this.laps[index]
        let start = new Date(lap.start_time)
        let end = new Date(start)
        end.setSeconds(start.getSeconds() + parseInt(lap.total_elapsed_time))

        this.chartLayout.shapes = []
        this.chartLayout.title.text = 'Zoom Lap ' + (index + 1)
        this.chartLayout.xaxis = {
          showgrid: false,
          range: [start, end]
        }
        this.lapZoomedIn = true
      }
    },
    lapShape: function (index) {
      const lap = this.laps[index]
      let start = new Date(lap.start_time)
      let end = new Date(start)
      end.setSeconds(start.getSeconds() + parseInt(lap.total_elapsed_time))

      // add a new shape to the chart layout
      let shapes = []
      shapes.push({
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: start,
        y0: 0,
        x1: end,
        y1: 1,
        fillcolor: '#82149b',
        opacity: 0.2,
        line: {
          width: 0
        }
      })

      return shapes
    },
    selectLap: function (index) {
      if (this.selectionActive) {
        // don't do any of this if there's a manual selection active
        return
      }

      this.resetZoom()

      if (index === 0) {
        this.chartLayout.shapes = []
        this.chartLayout.title.text = 'Entire Activity'
        this.chartLayout.xaxis = {
          showgrid: false,
          range: [this.initXRange.start, this.initXRange.end]
        }
        this.lapZoomedIn = false
        return
      }

      this.chartLayout.shapes = this.lapShape(index - 1)
      this.chartLayout.title.text = 'Lap ' + (index)
    },
    fetchData: async function (id) {
      const token = await this.user.getIdToken(true)
      let docRef = db.collection('activities').doc(this.activityID)

      const options = {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36',
          'Accept-Encoding': 'gzip'
        },
        qs: {
          activity: id
        },
        json: true,
        gzip: true
      }
      try {
        this.loading = true

        const doc = await docRef.get()
        this.activityName = doc.data().name

        const result = await rp(
          'https://us-central1-mycda-c43c6.cloudfunctions.net/activity/' + id + '/',
          options
        )
        this.processData(result)
      } catch (error) {
        console.log(error)
      }
    },
    processData: function (data) {
      this.totalTime = (new Date(parseInt(data.total_elapsed_time) * 1000)).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0]
      this.avgSpeed = parseFloat(data.avg_speed).toFixed(2)
      this.avgPower = parseInt(data.avg_power)
      this.avgCadence = parseInt(data.avg_cadence)
      this.timestamp = new Date(data.timestamp).toLocaleString()
      this.totalDistance = parseFloat(data.total_distance).toFixed(1)
      this.laps = data.laps

      let time = []
      let power = []
      let altitude = []
      let speed = []

      data.points.forEach(function (point) { // new Date(point.timestamp).toLocaleTimeString()
        time.push(new Date(point.timestamp))
        power.push(point.power)
        altitude.push(point.altitude * 1000)
        speed.push(point.speed)
      })

      let tracePower = {
        x: time,
        y: power,
        mode: 'lines',
        name: 'Power',
        line: {
          width: 1
        }
      }

      let traceAltitude = {
        x: time,
        y: altitude,
        type: 'scatter',
        fill: 'tozeroy',
        mode: 'none',
        name: 'Elevation',
        yaxis: 'y2'
      }

      let traceSpeed = {
        x: time,
        y: speed,
        mode: 'lines',
        name: 'Speed',
        yaxis: 'y3'
      }

      let xRangeStart = new Date(data.start_time)
      let xRangeEnd = new Date(xRangeStart)
      xRangeEnd.setSeconds(xRangeStart.getSeconds() + parseInt(data.total_elapsed_time))
      this.initXRange = {
        start: xRangeStart,
        end: xRangeEnd
      }

      this.chartData = [tracePower, traceAltitude, traceSpeed]
      this.loading = false
    },
    secondsToHms (d) {
      d = Number(d)

      var h = Math.floor(d / 3600)
      var m = Math.floor(d % 3600 / 60)
      var s = Math.floor(d % 3600 % 60)

      return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2)
    }
  }
}

</script>
