<template>
  <div class="container" id="Activity">
    <h2>Activity Details</h2>
    <div id ='loading' v-if="loading">
      <span>Loading details, please wait...</span>
    </div>
    <div id='chart' v-else>
      <vue-plotly :data="chartData" :layout="chartLayout" :options="chartOptions" :autoResize="true"/>
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
    title: "Activity"
  },
  data() {
    return {
      loading: true,
      activityID: this.$route.params.id,
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
          showgrid: true
        },
        yaxis2: {
          side: 'right',
          showgrid: false,
          overlaying: 'y'
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
      let time = [];
      let power = [];
      let altitude = [];
      let speed = [];

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
        name: 'Power'
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
        name: 'Speed'
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




 
