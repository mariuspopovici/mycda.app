<template>
  <div class="container" id="Activity">
    <!-- Delete segment modal -->
    <b-modal id="confirmModal" ref="confirmDeleteModal"
      centered title="Delete Segment"
      ok-title="Yes" cancel-title="No"
      v-on:ok="onconfirmDeleteSegment"
      ok-variant="danger"
      :header-bg-variant="modalHeaderBgVariant"
      :header-text-variant="modalHeaderTextVariant"
      :header-border-variant="modalHeaderBgVariant"
      :body-bg-variant="modalBodyBgVariant"
      :body-text-variant="modalBodyTextVariant"
      :footer-bg-variant="modalFooterBgVariant"
      :footer-border-variant="modalFooterBgVariant"
      :footer-text-variant="modalFooterTextVariant">
      <p>Delete segment '{{segmentName}}'?</p>
    </b-modal>

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
            <p class="card-text"><b>Distance:</b> {{convertDistance(totalDistance)}} {{distanceUnits}} </p>
            <p class="card-text"><b>Avg Speed:</b> {{convertDistance(avgSpeed)}} {{speedUnits}}</p>
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
            <p class="card-text"><b>Distance:</b> {{convertDistance(lap.total_distance).toFixed(2)}} {{distanceUnits}} </p>
            <p class="card-text"><b>Avg Speed:</b> {{convertDistance(lap.avg_speed).toFixed(2)}} {{speedUnits}}</p>
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
              <p class="card-text"><b>Duration (h:m:s):</b> {{utils.secondsToHms((this.selectionXRange.end - this.selectionXRange.start) / 1000)}}</p>
          </b-tab>
        </b-tabs>
      </b-card>
      <br>
      <b-table
        v-if="segments.length > 0"
        :dark="theme === 'dark'"
        :head-variant="theme"
        striped
        hover
        stacked="sm"
        responsive
        :items="segments"
        :fields="fields"
      >
        <template slot="rangeStart" slot-scope="row">
          {{row.item.rangeStart.toLocaleString()}}
        </template>
        <template slot="rangeEnd" slot-scope="row">
          {{row.item.rangeEnd.toLocaleString()}}
        </template>
        <template slot="actions" slot-scope="row">
          <div align="center">
            <b-btn
              size="sm"
              variant="primary"
              v-b-tooltip.hover title="Edit Segment"
              :to="{ name: 'activity.cda.direct',
                params: {id: row.item.activity, sid: row.item.id }
              }"
            ><i class="fa fa-edit fa-1x"></i></b-btn>
            <b-button
              size="sm"
              variant="danger"
              v-b-tooltip.hover title="Delete Segment"
              v-on:click="showConfirmDelete(row.item)"
            ><i class="fa fa-trash fa-1x"></i>
            </b-button>
          </div>
        </template>
      </b-table>
    </div>
  </div>
</template>

<script>
import { db } from '../main'
import VuePlotly from '@statnett/vue-plotly'
import Utils from '@/services/utils'
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
    },
    userPrefs () {
      return this.$store.getters.getUserPrefs
    }
  },
  data () {
    return {
      fields: [
        {key: 'name', label: 'Segment Name', sortable: true},
        {key: 'rangeStart', label: 'Start', sortable: true, sortDirection: 'asc'},
        {key: 'rangeEnd', label: 'End', sortable: true},
        {key: 'cda', label: 'CdA', class: 'text-right'},
        {key: 'crr', label: 'crr', class: 'text-right'},
        {key: 'actions', label: 'Actions', class: 'text-center'}
      ],
      distanceUnits: 'km',
      speedUnits: 'km/h',
      utils: new Utils(),
      segments: [],
      segmentName: '',
      segmentID: '',
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
      },
      modalHeaderBgVariant: this.theme,
      modalHeaderTextVariant: this.theme === 'dark' ? 'light' : 'dark',
      modalBodyBgVariant: this.theme === 'dark' ? 'semidark' : 'light',
      modalBodyTextVariant: 'dark',
      modalFooterBgVariant: this.theme,
      modalFooterTextVariant: this.theme === 'dark' ? 'light' : 'dark'
    }
  },
  created: function () {
    this.fetchData(this.activityID)
    this.distanceUnits = this.userPrefs.units === 'metric' ? 'km' : 'mi'
    this.speedUnits = this.userPrefs.units === 'metric' ? 'km/h' : 'mph'
  },
  methods: {
    convertDistance: function (d) {
      if (this.userPrefs.units !== 'metric') {
        return this.utils.kmToMi(d)
      } else {
        return d
      }
    },
    onconfirmDeleteSegment: async function () {
      let docRef = db.collection('segments').doc(this.segmentID)
      try {
        await docRef.delete()
      } catch (error) {
        console.log(error)
      }
    },
    showConfirmDelete: function (item) {
      this.segmentName = item.name
      this.segmentID = item.id
      this.$refs.confirmDeleteModal.show()
    },
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

        // get activity info
        let docRef = db.collection('activities').doc(id)
        const doc = await docRef.get()
        this.activityName = doc.data().name

        // get activity .fit file as JSON
        const result = await rp(
          'https://us-central1-mycda-c43c6.cloudfunctions.net/activity/' + id + '/',
          options
        )
        this.processData(result)

        // get any saved segments
        let segmentsRef = db.collection('segments')
        let _this = this

        segmentsRef
          .where('activity', '==', id)
          .orderBy('range.start', 'asc')
          .onSnapshot(function (querySnapshot) {
            _this.segments = []
            querySnapshot.forEach(function (doc) {
              let docData = doc.data()
              _this.segments.push({
                id: doc.id,
                activity: docData.activity,
                name: docData.name,
                cda: docData.cda,
                crr: docData.crr,
                description: docData.description,
                rangeStart: docData.range.start.toDate(),
                rangeEnd: docData.range.end.toDate()
              })
            })
          })
      } catch (error) {
        console.log(error)
      }
    },
    /**
     * Parse .FIT file and prepare it for charting.
     */
    processData: function (data) {
      this.totalTime = (new Date(parseInt(data.total_elapsed_time) * 1000)).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0]
      this.avgSpeed = parseFloat(data.avg_speed).toFixed(2)
      this.avgPower = parseInt(data.avg_power)
      this.avgCadence = parseInt(data.avg_cadence)
      this.timestamp = new Date(data.timestamp).toLocaleString()
      this.totalDistance = parseFloat(data.total_distance).toFixed(1)
      this.laps = data.laps

      // these are the chart series (data points)
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

      // these are the chart settings for each series
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

      // save the initial chart ranges so we can revert back after a zoom or selection
      let xRangeStart = new Date(data.start_time)
      let xRangeEnd = new Date(xRangeStart)
      xRangeEnd.setSeconds(xRangeStart.getSeconds() + parseInt(data.total_elapsed_time))
      this.initXRange = {
        start: xRangeStart,
        end: xRangeEnd
      }

      // go chart this
      this.chartData = [tracePower, traceAltitude, traceSpeed]
      this.loading = false
    }
  }
}

</script>
