<template>
  <div class="container" id="Activity">
    <h2>Activity Details</h2>
    <h4 v-if="!loading">Zoom in on an activity section or select a lap for analysis.</h4>
    <span v-if="loading">Loading activity details, please wait...</span>
    <div id='activityDetails' ref="activityDetails" v-else>
      <vue-plotly id="plotly" ref="plotly" :watchShallow="false" v-on:selected="onChartSelection()" :data="chartData" :layout="chartLayout" :options="chartOptions" :autoResize="true"/>
      <b-card no-body :bg-variant="theme">
        <b-tabs pills card v-on:input="selectLap">
          <b-tab title="Entire Activity" active>
            <p class="card-text"><b>Date:</b> {{timestamp}}</p>
            <p class="card-text"><b>Total Time:</b> {{totalTime}} </p>
            <p class="card-text"><b>Distance:</b> {{totalDistance}} km </p>
            <p class="card-text"><b>Avg Speed:</b> {{avgSpeed}} km/h</p>
            <p class="card-text"><b>Avg Power:</b> {{avgPower}} W</p>
          </b-tab>
          <b-tab v-for="(lap, index) in laps" :key= "index" :title="'Lap ' + (index +1 )">
            <b-button v-if="!lapZoomedIn" v-on:click="zoomLap(index)" variant="secondary"><i class="fa fa-search-plus"></i> Zoom In</b-button>
            <b-button v-if="lapZoomedIn" v-on:click="zoomLap(-1)" variant="secondary">Reset Zoom</b-button>
            <b-button variant="primary" :to="{
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
            {{selectionActive}}
            <b-button variant="primary" :to="{
              name: 'activity.cda',
              params: {
                id: activityID,
                range: {},
                data: chartData,
                description: 'Manual selection'
              }}">Analyze Selection</b-button>
              <p>
            <p class="card-text"><b>Date:</b> {{timestamp}}</p>
            <p class="card-text"><b>Total Time:</b> {{totalTime}} </p>
            <p class="card-text"><b>Distance:</b> {{totalDistance}} km </p>
            <p class="card-text"><b>Avg Speed:</b> {{avgSpeed}} km/h</p>
            <p class="card-text"><b>Avg Power:</b> {{avgPower}} W</p>
          </b-tab>
        </b-tabs>
      </b-card>
    </div>
  </div>
</template>

<script>
import firebase from 'firebase/app'
import 'firebase/functions'
import VuePlotly from '@statnett/vue-plotly'
const rp = require('request-promise')

export default {
  name: 'Activity',
  metaInfo: {
    title: 'Activity Details'
  },
  data () {
    return {
      selectionActive: false,
      loading: true,
      activityID: this.$route.params.id,
      totalTime: '',
      totalDistance: '',
      avgSpeed: '',
      avgPower: '',
      avgCadence: '',
      timestamp: '',
      lapZoomedIn: false,
      laps: [],
      initXRangeStart: null,
      initXRangeEnd: null,
      chartData: null,
      chartLayout: {
        title: '',
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
  props: ['theme'],
  methods: {
    hover: function () {
      console.log('hover')
    },
    onChartSelection: function () {
      alert('selection on chart')
    },
    resetZoom: function () {
      let updateLayout = {
        xaxis: {
          range: [this.initXRangeStart, this.initXRangeEnd]
        }
      }
      const plotly = this.$refs.plotly
      plotly.relayout(updateLayout)
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

        let updateLayout = {
          xaxis: {
            range: [start, end]
          },
          shapes: [],
          title: 'Lap ' + (index + 1)
        }
        this.lapZoomedIn = true
        const plotly = this.$refs.plotly
        plotly.relayout(updateLayout)
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
        fillcolor: '#ffffff',
        opacity: 0.2,
        line: {
          width: 0
        }
      })

      return shapes
    },
    selectLap: function (index) {
      if (index === 0) {
        let updateLayout = {
          shapes: [],
          title: 'Entire Activity',
          xaxis: {
            range: [this.initXRangeStart, this.initXRangeEnd]
          }
        }
        this.lapZoomedIn = false
        this.$refs.plotly.relayout(updateLayout)
        return
      }

      let shapes = this.lapShape(index - 1)

      let updateLayout = {
        shapes: shapes,
        title: 'Lap ' + (index)
      }

      this.$refs.plotly.relayout(updateLayout)
    },
    fetchData: async function (id) {
      const token = await firebase.auth().currentUser.getIdToken(true)
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

      this.initXRangeStart = new Date(data.start_time)
      this.initXRangeEnd = new Date(this.initXRangeStart)
      this.initXRangeEnd.setSeconds(this.initXRangeStart.getSeconds() + parseInt(data.total_elapsed_time))

      this.chartData = [tracePower, traceAltitude, traceSpeed]
      this.loading = false
    }
  },
  components: {
    VuePlotly
  }
}
</script>
