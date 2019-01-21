<template>
  <div class="container" id="Activity">
    <h2>Activity Details</h2>
    <div id ='loading' v-if="loading">
      <span>Loading activity details, please wait...</span>
    </div>
    <div id='activityDetails' v-else>
      <vue-plotly id="plotly" ref="plotly" :data="chartData" :layout="chartLayout" :options="chartOptions" :autoResize="true"/>
      <div role="tablist">
        <b-card no-body class="mb-1" :bg-variant="theme">
          <b-card-header header-tag="header" class="p-1" role="tab">
            <b-btn block href="#" v-b-toggle.accordion0 variant="primary">Activity Stats</b-btn>
          </b-card-header>
          <b-collapse v-on:shown="selectLap(-1)" visible id="accordion0" accordion="stats-accordion" role="tabpanel">
            <b-card-body :bg-variant="theme" title="Activity Stats">
              <p class="card-text"><b>Date:</b> {{timestamp}}</p>
              <p class="card-text"><b>Total Time:</b> {{totalTime}} </p>
              <p class="card-text"><b>Distance:</b> {{totalDistance}} km </p>
              <p class="card-text"><b>Avg Speed:</b> {{avgSpeed}} km/h</p>
              <p class="card-text"><b>Avg Power:</b> {{avgPower}} W</p>
            </b-card-body>
          </b-collapse>
        </b-card>
        <!-- Lap Stats -->
        <b-card v-for="(lap, index) in laps" :key="index" no-body class="mb-1" :bg-variant="theme">
          <b-card-header header-tag="header" class="p-1" role="tab">
            <b-btn block href="#" v-b-toggle="'accordion' + (index + 1)" variant="secondary">Lap {{index + 1}}</b-btn>
          </b-card-header>
          <b-collapse v-on:shown="selectLap(index)" v-bind:id="'accordion' + (index + 1)" accordion="stats-accordion" role="tabpanel">
            <b-card-body :bg-variant="theme" v-bind:title="'Lap ' + (index + 1)">
              <p class="card-text"><b>Start Time:</b> {{new Date(lap.start_time).toLocaleString()}}</p>
              <p class="card-text"><b>Duration (h:m:s):</b> {{(new Date(parseInt(lap.total_elapsed_time) * 1000)).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0]}}</p>
              <p class="card-text"><b>Distance:</b> {{lap.total_distance.toFixed(2)}} km </p>
              <p class="card-text"><b>Avg Speed:</b> {{lap.avg_speed.toFixed(2)}} km/h</p>
              <p class="card-text"><b>Avg Power:</b> {{lap.avg_power}} W</p>
            </b-card-body>
          </b-collapse>
        </b-card>
      </div>
    </div>
  </div>
</template>

<script>
import firebase from 'firebase/app'
import 'firebase/functions'
import VuePlotly from '@statnett/vue-plotly'
const rp = require('request-promise')

/* eslint-disable */
export default {
  name: "Activity",
  metaInfo: {
    title: "Activity Details"
  },
  data() {
    return {
      loading: true,
      activityID: this.$route.params.id,
      totalTime: '',
      totalDistance: '',
      avgSpeed: '',
      avgPower: '',
      avgCadence: '',
      timestamp: '',
      laps: [],
      chartData: null,
      chartLayout: {
        title: '',
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        modebar: {
          bgcolor: 'transparent'
        },
        font: { family: 'Roboto', color: '#b0bec5'}, 
        colorway: ["#f4a433","#404244","#2196f3","#03a9f4","#00bcd4","#009688","#4caf50","#8bc34a","#cddc39"],
        hoverlabel: {
          bgcolor: 'transparent'
        },
        legend: { orientation: 'h', yanchor: 'top', xanchor: 'center', y:1.1, x:0.5 },
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
      }
    };
  },
  created: function () {
    this.fetchDataGzip(this.activityID)
  },
  props: ["theme"],
  methods: {
    lapShape: function (index) {
      const lap = this.laps[index]
      let start = new Date(lap.start_time)
      let end = new Date(start);
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
      });

      return shapes;
    },
    selectLap: function (index) { 
      console.log(index)
      if (index < 0) {
        let updateLayout = {
          shapes: [],
          title: ''
        } 
        this.$refs.plotly.relayout(updateLayout)
        return;
      }

      let shapes = this.lapShape(index)

      let updateLayout = {
        shapes: shapes,
        title: 'Lap ' + (index + 1)
      }

      this.$refs.plotly.relayout(updateLayout)
    },
    onChartReady: function () {

    },
    fetchData: async function(id) {
      let activityFunction = firebase.functions().httpsCallable('getActivityData')
      try {
        this.loading = true
        console.time('function call')
        let result = await activityFunction({activity: id})
        console.timeEnd('function call')
        this.processData(result.data)
      } catch (error) {
        console.log(error)
      }
    },
    fetchDataGzip: async function(id) {
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
        console.time('gzip function call')
        const result = await rp(
          'https://us-central1-mycda-c43c6.cloudfunctions.net/activity/' + id + '/',
          options
        ) 
        console.timeEnd('gzip function call')

        this.processData(result)
      } catch (error) {
        console.log(error)
      }
    },
    processData: function(data) {
      this.totalTime = (new Date(parseInt(data.total_elapsed_time) * 1000)).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0];
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

      data.points.forEach(function(point) { //new Date(point.timestamp).toLocaleTimeString()
        time.push(new Date(point.timestamp))
        power.push(point.power)
        altitude.push(point.altitude*1000)
        speed.push(point.speed)
      })

      let tracePower = {
        x: time,
        y: power,
        mode: 'lines',
        name: 'Power',
        line: {
          width: 0.5
        }
      }

      let traceAltitude = {
        x: time,
        y: altitude,
        type: 'scatter',
        fill: 'tozeroy',
        mode: 'none',
        name: 'Elevation',
        yaxis: 'y2',
      }

      let traceSpeed = {
        x: time,
        y: speed,
        mode: 'lines',
        name: 'Speed',
        yaxis: 'y3'
      }

      this.chartData = [tracePower, traceAltitude, traceSpeed]
      this.loading = false
    }
  },
  components: {
    VuePlotly
  }
};
</script>
<style scoped>

</style>




 
