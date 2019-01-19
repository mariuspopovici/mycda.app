<template>
  <div class="container" id="Activity">
    <h2>Activity Details</h2>
    <div id ='loading' v-if="loading">
      <span>Loading details, please wait...</span>
    </div>
    <GChart
    type="LineChart"
    :data="chartData"
    :options="chartOptions"
    @ready="onChartReady"
  />

  </div>
</template>

<script>
import firebase from 'firebase/app'
import 'firebase/functions'
import { GChart } from 'vue-google-charts'

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
      chartOptions: {
        chart: {
          title: 'New Activity'
        },
        height: 400,
        series: {
          1: {
            targetAxisIndex:0
          },
          2: {
            targetAxisIndex:1
          }
        },
        vAxes: {
          0: {title: 'Power (W)'},
          1: {title: 'Elevation (m)'}
        },
        hAxes: {
          0: {title: 'Time (mm:ss)'}
        },
        hAxis: { 
          format: 'm:s',
          titleTextStyle: {color: '#607d8b'}, 
          gridlines: { count:0}, 
          textStyle: { color: '#b0bec5', fontName: 'Roboto', fontSize: '12', bold: true}
        },
        vAxis: {
          gridlines: {color:'#37474f'}, 
          titleTextStyle: {color: '#607d8b'}, 
          textStyle: { color: '#b0bec5', fontName: 'Roboto', fontSize: '12', bold: true}
        },
        legend: {position: 'top', alignment: 'center', textStyle: {color:'#607d8b', fontName: 'Roboto', fontSize: '12'} },
        colors: ["#f4a433","#3f51b5","#2196f3","#03a9f4","#00bcd4","#009688","#4caf50","#8bc34a","#cddc39"],
        areaOpacity: 0.24,
        lineWidth: 1.5,
        backgroundColor: 'transparent',
        chartArea: {
          backgroundColor: "transparent",
          width: '80%',
          height: '80%'
        },
        colorAxis: {colors: ["#3f51b5","#2196f3","#03a9f4","#00bcd4"] },
        backgroundColor: 'transparent',
        datalessRegionColor: '#37474f',
        displayMode: 'regions',
        explorer: {
          axis: 'horizontal',
          actions: ['dragToZoom', 'rightClickToReset'],
          maxZoomIn: .10
        } 
      }
    };
  },
  created: function () {
    this.fetchData(this.activityID)
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
    processData: function(data) {
      let chartData = [
        ['Time', 'Power', 'Elevation', 'Speed']
      ]
      data.points.forEach(function(point) { //new Date(point.timestamp).toLocaleTimeString()
        chartData.push(
          [new Date(point.timestamp), point.power, point.altitude*1000, point.speed,]
        )
      })
      this.chartData = chartData
      this.loading = false
    }
  },
  components: {
    GChart
  }
};
</script>




 
