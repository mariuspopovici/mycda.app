<template>
  <div class="container" id="Activity">
    <h2>Activity Details</h2>

    <GChart
    type="LineChart"
    :data="chartData"
    :options="chartOptions"
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
      activityID: this.$route.params.id,
      chartData: null,
      chartOptions: {
        chart: {
          title: 'New Activity'
        },
        height: 400,
        vAxes: {
          0: {title: 'Power'}
        },
        hAxis: { textPosition: 'none' },
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
    fetchData: async function(id) {
      let activityFunction = firebase.functions().httpsCallable('getActivityData')
      try {
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
        ['Time', 'Power', 'Speed', 'Elevation']
      ]

      data.points.forEach(function(point) { //new Date(point.timestamp).toLocaleTimeString()
        chartData.push(
          [point.distance, point.power, point.speed, point.altitude*1000]
        )
      })
      this.chartData = chartData
    }
  },
  components: {
    GChart
  }
};
</script>




 
