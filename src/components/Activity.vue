<template>
  <div class="container-fluid" id="Activity">
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
          @keyup.native.esc="cancelEdit" @keyup.native.enter="updateTitle">
        </b-form-input>
        <b-input-group-append>
          <b-button variant="success" v-on:click="updateTitle" v-b-tooltip.hover title="Rename Activity"><i class="fa fa-check"></i></b-button>
        </b-input-group-append>
      </b-input-group>
    </h2>
    <h4 v-if="!loading">Zoom in on an activity section or select a lap for analysis.</h4>
    <span v-if="loading">Loading activity details, please wait... <font-awesome-icon icon="spinner" spin/></span>
    <div id='activityDetails' ref="activityDetails" v-else>
      <vue-plotly id="plotly" ref="plotly" :data="chartData" :layout="chartLayout" :options="chartOptions"
        :autoResize="true"
        v-on:relayout="onRelayout" :watchShallow="false" v-on:hover="onChartHover"/>
      <b-row>
        <b-col>
          <b-card no-body :bg-variant="theme">
            <b-tabs small pills card v-on:input="selectLap" v-on:activate-tab="selectLap">
              <b-tab :title="selectionTabTitle" active>
                <!-- Panel shown when NO selection -->
                <div v-show="!selectionActive" id="entireSelectionPanel">
                  <b-dropdown
                    v-if="showMap"
                    dropright
                    split
                    id="showLoopsDD"
                    @click="findLoops(false)"
                    variant="secondary"
                    :text="showLoops ? 'Hide Loops' : 'Show Loops'"
                    ref="loopsDropDown"
                    size="sm"
                    class="mb-3"
                  >
                    <b-dropdown-form style="width: 300px;">
                      <LoopFinderPrefs
                        :minDuration="loopFinderPrefs.minDuration"
                        :maxDuration="loopFinderPrefs.maxDuration"
                        :precision="loopFinderPrefs.precision"
                        @change="onLoopFinderPrefsChange"
                      />
                    </b-dropdown-form>
                  </b-dropdown>

                  <p class="card-text"><strong>Date:</strong> {{ timestamp }}</p>
                  <p class="card-text"><strong>Total Time:</strong> {{ totalTime }}</p>
                  <p class="card-text">
                    <strong>Distance:</strong> {{ convertDistance(totalDistance) }} {{ distanceUnits }}
                  </p>
                  <p class="card-text">
                    <strong>Avg Speed:</strong> {{ convertDistance(avgSpeed) }} {{ speedUnits }}
                  </p>
                  <p class="card-text"><strong>Avg Power:</strong> {{ avgPower }} W</p>
                </div>

                <!-- Panel shown when a selection IS active -->
                <div v-show="selectionActive" id="chartSelectionPanel">
                  <b-button size="sm" variant="secondary" @click="removeSelection" class="mb-3">
                    Undo Selection
                  </b-button>

                  <b-button
                    size="sm"
                    variant="success"
                    class="mb-3"
                    :to="{
                      name: 'activity.cda',
                      params: {
                        id: activityID,
                        range: selectionXRange,
                        data: {
                          time, speed, airspeed, distance, power, altitude, laps, location
                        },
                        description: 'Selection',
                        loopPrefs: loopFinderPrefs
                      }
                    }"
                  >
                    Analyze
                  </b-button>

                  <p class="card-text">
                    <strong>Start Time:</strong> {{ selectionXRange.start.toLocaleString() }}
                  </p>
                  <p class="card-text">
                    <strong>End Time:</strong> {{ selectionXRange.end.toLocaleString() }}
                  </p>
                  <p class="card-text">
                    <strong>Duration (h:m:s):</strong>
                    {{ utils.secondsToHms((selectionXRange.end - selectionXRange.start) / 1000) }}
                  </p>
                </div>
              </b-tab>
              <b-tab v-for="(lap, index) in laps" :key= "index" :title="'Lap ' + (index +1 )">
                <b-button v-if="!lapZoomedIn" size="sm" v-on:click="zoomLap(index)" variant="secondary"><i class="fa fa-search-plus"></i> Zoom In</b-button>
                <b-button v-if="lapZoomedIn" size="sm" v-on:click="zoomLap(-1)" variant="secondary">Reset Zoom</b-button>
                <b-button variant="success" size="sm" :to="{
                  name: 'activity.cda',
                  params: {
                    id: activityID,
                    range: getLapRange(index),
                    data: { time: time, speed: speed, airspeed: airspeed,
                      distance: distance, power: power,
                      altitude: altitude, laps: laps,
                      location: location, loopPrefs: loopFinderPrefs
                    },
                    description: 'Lap ' + (index + 1),
                    loopPrefs: loopFinderPrefs
                  }}">Analyze</b-button>
                <p>
                <p class="card-text"><b>Start Time:</b> {{new Date(lap.start_time).toLocaleString()}}</p>
                <p class="card-text"><b>Duration (h:m:s):</b> {{(new Date(parseInt(lap.total_elapsed_time) * 1000)).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0]}}</p>
                <p class="card-text"><b>Distance:</b> {{convertDistance(lap.total_distance)}} {{distanceUnits}} </p>
                <p class="card-text"><b>Avg Speed:</b> {{convertDistance(lap.avg_speed)}} {{speedUnits}}</p>
                <p class="card-text"><b>Avg Power:</b> {{lap.avg_power}} W</p>
              </b-tab>
            </b-tabs>
            </b-card>
          </b-col>
          <b-col md=8 v-if="showMap">
            <GmapMap
              id="map"
              ref="map"
              map-type-id="terrain"
              :zoom="13"
              style="width: 100%; height: 100%;"
              :styles="mapStyles"
              :center="mapCenter"
              :options="{
                zoomControl: true,
                mapTypeControl: false,
                scaleControl: true,
                streetViewControl: true,
                rotateControl: false,
                fullscreenControl: true,
                disableDefaultUi: false,
                styles: this.mapStyles
              }"
              >
              <gmap-polyline v-if="location.length > 0" :path="location" ref="polyline"
                :options="{
                  strokeColor: '#FF0000',
                  strokeWeight: 4
                }"
                ></gmap-polyline>
              <gmap-polyline v-if="location.length > 0" :path="selectionLocation" ref="polyline"
                :options="{
                  strokeColor: '#0000FF',
                  strokeWeight: 5
                }"
              ></gmap-polyline>
              <GmapMarker
                :position="mapMarker"
                :clickable="false"
                :draggable="false"
                :icon="{
                  path: this.google ? this.google.maps.SymbolPath.CIRCLE : '',
                  scale: 7,
                  fillColor: 'white',
                  fillOpacity: 0.8,
                }"
              />
              <GmapMarker
                :position="startMapMarker"
                :clickable="false"
                :draggable="false"
                :icon="{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                  scale: 1.5,
                  fillColor: 'green',
                  fillOpacity: 0.8,
                  anchor: {x:12,y:24},
                }"
              />
              <GmapMarker
                :position="endMapMarker"
                :clickable="false"
                :draggable="false"
                :icon="{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                  scale: 1.5,
                  fillColor: 'red',
                  fillOpacity: 0.8,
                  anchor: {x:12,y:24}
                }"
              />
            </GmapMap>
          </b-col>
        </b-row>
      <br>
      <b-table
        v-if="segments.length > 0"
        :dark="theme === 'dark'"
        :head-variant="theme"
        striped
        hover
        stacked="lg"
        responsive
        :items="segments"
        :fields="fields"
      >
        <template slot="cell(name)" slot-scope="row">
          <div v-if="row.item.isBaseline">
            <u v-b-tooltip.hover title="Baseline Segment">{{row.item.name}}</u>
          </div>
          <div v-else>
            {{row.item.name}}
          </div>
        </template>
        <template slot="cell(rangeStart)" slot-scope="row">
          {{row.item.rangeStart.toLocaleTimeString()}}
        </template>
        <template slot="cell(rangeEnd)" slot-scope="row">
          {{row.item.rangeEnd.toLocaleTimeString()}}
        </template>
        <template slot="cell(cda)" slot-scope="row">
          <span v-if="row.item.cdaDeltaPct < 0.0" class="text-danger"> <i class="fa fa-arrow-up"></i> {{row.item.cda}}</span>
          <span v-else-if="row.item.cdaDeltaPct > 0" class="text-success"> <i class="fa fa-arrow-down"></i> {{row.item.cda}}</span>
          <span v-else>{{row.item.cda}}</span>
        </template>
        <template slot="cell(actions)" slot-scope="row">
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
              variant="success"
              v-b-tooltip.hover title="Zoom In"
              v-on:click="onSegmentZoom(row.item.rangeStart, row.item.rangeEnd, row.item.name)"
            ><i class="fa fa-search-plus fa-1x"></i>
            </b-button>
            <b-button
              size="sm"
              variant="danger"
              v-b-tooltip.hover title="Delete Segment"
              v-on:click="showConfirmDelete(row.item)"
            ><i class="fa fa-trash fa-1x"></i>
            </b-button>
          </div>
        </template>
        <template slot="bottom-row" slot-scope="row">
          <td :colspan="row.columns">
            <div class="text-center"><strong>Mean:</strong> {{meanCdA.toFixed(3)}} <strong>SD:</strong> {{sdCdA.toFixed(3)}} <strong>CV:</strong> {{cvCdA.toFixed(3)}}
            </div>
            <div class="text-center text-secondary">
              <small> * Power/Time Savings Estimated @ 30 mph / 48.2 kmh</small>
            </div>
          </td>
        </template>
      </b-table>
    </div>
  </div>
</template>

<script>
import { db } from '../main'
import VuePlotly from '@statnett/vue-plotly'
import Utils from '@/services/utils'
import { gmapApi } from 'vue2-google-maps'
import mapThemes from '../assets/mapthemes/activitymapstyle.json'
import Buffer from '@/services/buffer'
import LoopFinderPrefs from '@/components/LoopFinderPrefs'
import LoopFinder from '@/services/loopdetect'
import Cache from '@/services/cache'
const rp = require('request-promise')

export default {
  name: 'Activity',
  metaInfo: {
    title: 'Activity Details'
  },
  components: {
    VuePlotly,
    LoopFinderPrefs
  },
  props: ['theme'],
  computed: {
    mapBounds () {
      let bounds = new this.google.maps.LatLngBounds()
      this.location.forEach(point => {
        bounds.extend(point)
      })

      return bounds
    },

    google: gmapApi,
    user () {
      return this.$store.getters.getUser
    },
    userPrefs () {
      return this.$store.getters.getUserPrefs
    },
    meanCdA () {
      if (this.segments.length > 0) {
        return (this.segments.reduce(function (acc, curr) {
          return acc + parseFloat(curr.cda)
        }, 0)) / this.segments.length
      }
    },
    sdCdA () {
      const mean = this.meanCdA
      let aSigma = this.segments.map(function (segment) {
        return Math.pow(segment.cda - mean, 2)
      })
      const sigma = aSigma.reduce(function (acc, curr) {
        return acc + curr
      }, 0)
      return Math.sqrt(sigma / this.segments.length)
    },
    cvCdA () {
      return (this.sdCdA / this.meanCdA) * 100
    }
  },
  data () {
    return {
      fields: [
        {key: 'name', label: 'Segment Name', thStyle: {width: '200px'}},
        {key: 'rangeStart', label: 'Start', sortable: true, sortDirection: 'asc'},
        {key: 'rangeEnd', label: 'End', sortable: true},
        {key: 'cda', label: 'CdA', class: 'text-right', sortable: true},
        {key: 'crr', label: 'crr', class: 'text-right'},
        {key: 'cdaDeltaPct', label: 'Δ CdA (%)', class: 'text-right', sortable: true},
        {key: 'wattsSaved', label: 'Watts Saved*', class: 'text-right', sortable: true},
        {key: 'seconds40k', label: 'Sec/40k*', class: 'text-right', sortable: true},
        {key: 'actions', label: 'Actions', class: 'text-center'}
      ],
      showMap: false,
      showLoops: false,
      mapStyles: this.theme === 'dark' ? mapThemes.dark : mapThemes.light,
      distanceUnits: 'km',
      speedUnits: 'km/h',
      utils: new Utils(),
      activityCache: new Cache('ActivityCache', 5),
      loopFinder: null,
      loops: [],
      loopFinderPrefs: {
        precision: 'low',
        minDuration: 60,
        maxDuration: 1000
      },
      baseLineCdA: 0,
      segments: [],
      segmentName: '',
      segmentID: '',
      showEditButton: false,
      editTitleEnabled: false,
      selectionActive: false,
      selectionTabTitle: 'Entire Activity',
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
      mapCenter: {lat: -10, lng: -10},
      initXRange: null,
      selectionXRange: {start: new Date(), end: new Date()},
      chartData: [],
      time: [],
      altitude: [],
      power: [],
      speed: [],
      airspeed: [],
      distance: [],
      mapMarker: {lat: 0, lng: 0},
      startMapMarker: {lat: 0, lng: 0},
      endMapMarker: {lat: 0, lng: 0},
      location: [],
      selectionLocation: [],
      mapSelectionBounds: null,
      chartLayout: {
        title: '',
        dragmode: 'zoom+select',
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        modebar: {
          bgcolor: 'transparent'
        },
        font: { family: 'Roboto', color: '#b0bec5' },
        colorway: ['#f4a433', '#4d4b4f', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39'],
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
    if (this.user && this.userPrefs) {
      this.fetchData(this.activityID)
      this.distanceUnits = this.userPrefs.units === 'metric' ? 'km' : 'mi'
      this.speedUnits = this.userPrefs.units === 'metric' ? 'km/h' : 'mph'
    }
  },
  watch: {
    segments: function () {
      let _this = this
      this.segments.forEach(segment => {
        if (_this.baseLineCdA !== 0) {
          segment.cdaDelta = parseFloat(_this.baseLineCdA) - parseFloat(segment.cda)
          segment.cdaDeltaPct = ((segment.cdaDelta / ((parseFloat(_this.baseLineCdA) + parseFloat(segment.cda)) / 2)) * 100).toFixed(1)
          segment.wattsSaved = ((segment.cdaDelta / 0.005) * 5).toFixed(1)
          segment.seconds40k = Math.floor((segment.cdaDelta / 0.005) * 0.5 * 40)
        } else {
          segment.cdaDelta = 0
          segment.cdaDeltaPct = 'N/A'
          segment.wattsSaved = 'N/A'
          segment.seconds40k = 'N/A'
        }
      })
    }
  },
  methods: {
    onLoopFinderPrefsChange: function (args) {
      this.loopFinderPrefs = args
      this.showLoops = true
      this.findLoops(true)
      this.$refs.loopsDropDown.hide(true)
    },
    convertDistance: function (d) {
      if (this.userPrefs.units !== 'metric') {
        return this.utils.kmToMi(d).toFixed(2)
      } else {
        return parseFloat(d).toFixed(2)
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
      this.selectionXRange = {
        start: this.initXRange.start,
        end: this.initXRange.end
      }
      this.selectionTabTitle = 'Entire Activity'

      let plotly = this.$refs.plotly
      let layoutUpdate = {
        'xaxis.showgrid': false,
        'xaxis.range': [this.initXRange.start, this.initXRange.end],
        title: 'Selection'
      }
      plotly.relayout(layoutUpdate)

      this.resetMapSelection()
    },
    onRelayout: function (event) {
      // check if this was triggered by a drag to zoom event
      if ('xaxis.range[0]' in event && 'xaxis.range[1]' in event) {
        this.selectionActive = true
        this.selectionTabTitle = 'Selection'
        this.selectionXRange = {
          start: new Date(event['xaxis.range[0]']),
          end: new Date(event['xaxis.range[1]'])
        }
        this.setMapSelection(this.selectionXRange.start, this.selectionXRange.end)

        let plotly = this.$refs.plotly
        let layoutUpdate = {
          title: 'Selection'
        }
        plotly.relayout(layoutUpdate)
      }
    },
    onSegmentZoom: function (segmentStart, segmentEnd, segmentTitle) {
      this.selectionActive = true
      this.selectionXRange = {
        start: segmentStart,
        end: segmentEnd
      }
      this.setMapSelection(this.selectionXRange.start, this.selectionXRange.end)

      let plotly = this.$refs.plotly
      let layoutUpdate = {
        shapes: [this.makeShape(this.selectionXRange.start, this.selectionXRange.end)],
        title: `Segment - ${segmentTitle}`,
        'xaxis.showgrid': false,
        'xaxis.range': [segmentStart, segmentEnd]
      }
      plotly.relayout(layoutUpdate)

      let top = plotly.offsetTop
      window.scrollTo(0, top)
    },
    onChartHover: function (hoverData) {
      let pointNumber = hoverData.points[0].pointNumber
      if (pointNumber && this.showMap) {
        this.mapMarker = this.location[pointNumber]
      }
    },
    resetZoom: function () {
      let plotly = this.$refs.plotly
      let layoutUpdate = {
        'xaxis.showgrid': false,
        'xaxis.range': [this.initXRange.start, this.initXRange.end]
      }
      plotly.relayout(layoutUpdate)

      this.resetMapZoom()
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

        let plotly = this.$refs.plotly
        let layoutUpdate = {
          shapes: [],
          title: 'Zoom Lap ' + (index + 1),
          'xaxis.showgrid': false,
          'xaxis.range': [start, end]
        }
        plotly.relayout(layoutUpdate)

        this.zoomMapSelection()
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
      shapes.push(this.makeShape(start, end))

      return shapes
    },
    makeShape: function (start, end, color = '#82149b') {
      return {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: start,
        y0: 0,
        x1: end,
        y1: 1,
        fillcolor: color,
        opacity: 0.2,
        line: {
          width: 0
        }
      }
    },
    findLoops: function (refresh = false) {
      let layoutUpdate = {
        shapes: []
      }

      if (this.showLoops && !refresh) {
        // hide
        console.log('hide!')
        this.showLoops = false
      } else {
        // show
        this.showLoops = true

        let precision = 3
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
          let color = index % 2 === 0 ? '#7549a0' : this.utils.LightenDarkenColor('#7549a0', 40)
          let start = this.time[loop.startIndex]
          let end = this.time[loop.endIndex]
          layoutUpdate.shapes.push(this.makeShape(start, end, color))
        })
      }

      let plotly = this.$refs.plotly
      plotly.relayout(layoutUpdate)
    },
    selectLap: function (index) {
      if (this.selectionActive) {
        // don't do any of this if there's a manual selection active
        if (index < this.laps.length) {
          // remove manual selection if moving to a lap selection
          this.removeSelection()
        } else {
          return
        }
      }

      let plotly = this.$refs.plotly
      let layoutUpdate = {
        'xaxis.showgrid': false,
        'xaxis.range': [this.initXRange.start, this.initXRange.end]
      }

      if (index === 0) {
        layoutUpdate.shapes = []
        layoutUpdate.title = 'Entire Activity'
        plotly.relayout(layoutUpdate)
        this.lapZoomedIn = false
        this.resetMapSelection()
        return
      }

      layoutUpdate.shapes = this.lapShape(index - 1)
      layoutUpdate.title = 'Lap ' + (index)
      plotly.relayout(layoutUpdate)

      var lap = this.laps[index - 1]
      var start = new Date(this.laps[index - 1].start_time)
      var end = new Date(start)
      end.setSeconds(start.getSeconds() + parseInt(lap.total_elapsed_time))

      this.setMapSelection(start, end)
    },
    setMapSelection: function (start, end, zoomIn = false) {
      if (this.showMap) {
        this.mapSelectionBounds = new this.google.maps.LatLngBounds()
        let lapCoordinates = this.location.filter((point, i) => {
          if (start < this.time[i] && end > this.time[i]) {
            this.mapSelectionBounds.extend(point)
            return true
          } else {
            return false
          }
        })
        this.startMapMarker = lapCoordinates[0]
        this.endMapMarker = lapCoordinates[lapCoordinates.length - 1]
        this.selectionLocation = lapCoordinates
        if (zoomIn) {
          this.zoomMapSelection()
        }
      }
    },
    resetMapSelection: function () {
      if (this.showMap) {
        this.selectionLocation = []
        this.$refs.map.$mapPromise.then((map) => {
          map.fitBounds(this.mapBounds)
        })
        this.startMapMarker = this.location[0]
        this.endMapMarker = this.location[ this.location.length - 1 ]
      }
    },
    zoomMapSelection: function () {
      if (this.showMap) {
        this.$refs.map.$mapPromise.then((map) => {
          map.fitBounds(this.mapSelectionBounds)
        })
      }
    },
    resetMapZoom: function () {
      if (this.showMap) {
        this.$refs.map.$mapPromise.then((map) => {
          map.fitBounds(this.mapBounds)
        })
      }
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

        if (this.activityCache.contains(id)) {
          const result = this.activityCache.get(id)
          this.processData(result)
        } else {
          // get activity info
          console.time('Document')
          let docRef = db.collection('activities').doc(id)
          const doc = await docRef.get()
          this.activityName = doc.data().name
          console.timeEnd('Document')

          console.time('Cloud Call')
          // get activity file as JSON
          const result = await rp(
            'https://us-central1-mycda-c43c6.cloudfunctions.net/api/activity/' + id + '/',
            options
          )
          console.timeEnd('Cloud Call')

          this.activityCache.add(id, result)
          this.processData(result)
        }

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
              if (docData.isBaseline) {
                _this.baseLineCdA = docData.cda
              }
              _this.segments.push({
                id: doc.id,
                activity: docData.activity,
                name: docData.name,
                cda: docData.cda,
                crr: docData.crr,
                description: docData.description,
                rangeStart: docData.range.start.toDate(),
                rangeEnd: docData.range.end.toDate(),
                isBaseline: docData.isBaseline
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
      console.log('Processing data...')
      this.totalTime = (new Date(parseInt(data.total_elapsed_time) * 1000)).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0]
      this.avgSpeed = parseFloat(data.avg_speed).toFixed(2)
      this.avgPower = parseInt(data.avg_power)
      this.avgCadence = parseInt(data.avg_cadence)
      this.timestamp = new Date(data.timestamp).toLocaleString()
      this.totalDistance = parseFloat(data.total_distance).toFixed(1)
      this.laps = data.laps

      let _this = this

      let spikeBuffer = new Buffer(5)
      let power = 0

      data.points.forEach(function (point) {
        // eliminate ridiculous spikes and replace them with an average of the last 5 known good values
        if (point.power > 1500) {
          // get an average of the last 5 legit power points
          power = spikeBuffer.average()
          console.debug(`Detected a spike of ${point.power}W and averaged it down to ${power}W`)
        } else {
          power = point.power
        }

        spikeBuffer.add(power)

        _this.time.push(new Date(point.timestamp))
        _this.power.push(power !== undefined ? power : 0)
        _this.altitude.push(point.altitude !== undefined ? point.altitude * 1000 : 0)
        _this.speed.push(point.speed !== undefined ? point.speed : 0)
        _this.airspeed.push(point.airspeed !== undefined ? point.airspeed : point.speed)
        _this.distance.push(point.distance !== undefined ? point.distance : 0)
        if ('lat' in point && 'long' in point) {
          _this.location.push({lat: parseFloat(point.lat), lng: parseFloat(point.long)})
        }
      })

      if (this.location.length > 0 && this.location[0].lat && this.location[0].lng) {
        this.showMap = true
        this.startMapMarker = this.location[0]
        this.endMapMarker = this.location[ this.location.length - 1 ]
        let coordinates = this.location.map(a => Object.assign({}, a))
        this.loopFinder = new LoopFinder(coordinates, this.google)
      }

      let chartSpeed = this.speed
      let chartAltitude = this.altitude
      if (this.userPrefs.units !== 'metric') {
        // convert speed and altitude to mph and ft
        chartSpeed = this.speed.map(km => this.utils.kmToMi(km))
        chartAltitude = this.altitude.map(m => this.utils.mToFt(m))
      }

      // these are the chart settings for each series
      let tracePower = {
        x: this.time,
        y: this.power,
        mode: 'lines',
        name: 'Power',
        line: {
          width: 1
        }
      }

      let traceAltitude = {
        x: this.time,
        y: chartAltitude,
        type: 'scatter',
        fill: 'tozeroy',
        mode: 'none',
        name: 'Elevation',
        yaxis: 'y2'
      }

      let traceSpeed = {
        x: this.time,
        y: chartSpeed,
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
    },

    centerMap: function (locationArray) {
      var bounds = new this.google.maps.LatLngBounds()
      locationArray.forEach(function (point) {
        bounds.extend(point)
      })

      this.mapCenter = bounds.getCenter()
    }
  }
}

</script>
