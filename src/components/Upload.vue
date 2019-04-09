<template>
  <div class="container-fluid" id="Upload">
    <!-- Delete confirmation modal -->
    <b-modal id="confirmModal" ref="confirmDeleteModal"
      centered title="Delete Activity"
      ok-title="Yes" cancel-title="No"
      v-on:ok="onConfirmDelete"
      ok-variant="danger"
      :header-bg-variant="modalHeaderBgVariant"
      :header-text-variant="modalHeaderTextVariant"
      :header-border-variant="modalHeaderBgVariant"
      :body-bg-variant="modalBodyBgVariant"
      :body-text-variant="modalBodyTextVariant"
      :footer-bg-variant="modalFooterBgVariant"
      :footer-border-variant="modalFooterBgVariant"
      :footer-text-variant="modalFooterTextVariant">
      <p>Delete activity '{{activityName}}'?</p>
    </b-modal>
    <!-- Edit Activity Name Modal Component -->
    <b-modal id="editActivityModal" ref="editActivityModal"
      centered title="Edit Activity"
        v-on:ok="onEditOK"
        v-on:shown="onShowEditActivity"
        :header-bg-variant="modalHeaderBgVariant"
        :header-text-variant="modalHeaderTextVariant"
        :header-border-variant="modalHeaderBgVariant"
        :body-bg-variant="modalBodyBgVariant"
        :body-text-variant="modalBodyTextVariant"
        :footer-bg-variant="modalFooterBgVariant"
        :footer-border-variant="modalFooterBgVariant"
        :footer-text-variant="modalFooterTextVariant">
      <b-form-group
          id="name"
          description="Name your activity."
          label="Activity Name"
          label-for="activityName"
          :invalid-feedback="invalidActivityNameFeedback"
          :state="isActivityNameValid"
          placeholder="New Activity"
      >
        <b-form-input ref="activityName" id="activityName"
          @keydown.native="onEditEnterKey"
          :state="isActivityNameValid"
          v-model="activityName">
        </b-form-input>
      </b-form-group>
    </b-modal>
    <div id="upload">
      <div id="head">
        <h2>Activities</h2>
        <h4>Create a new activity by importing a .FIT or .CSV file. Click <a href="#/faq">here</a> for .CSV specs.</h4>
      </div>
      <b-alert
        variant="danger"
        dismissible
        :show="uploadError"
        @dismissed="uploadError=false"
      >{{uploadMessage}}</b-alert>

      <!-- Drop Zone -->
      <vue-dropzone ref="uploadDropZone" id="uploadDropZone" :options="dropOptions" v-on:vdropzone-file-added="fileAdded" ></vue-dropzone>

      <br>
      <!-- Activities Table -->
      <b-table
        id="activities-table"
        :dark="isDark"
        :head-variant="theme"
        striped
        hover
        stacked="sm"
        responsive
        :items="activities"
        :fields="fields"
        :per-page="perPage"
        :current-page="currentPage"
      >
        <template slot="status" slot-scope="row">
          <div id='newStatus' v-if="row.item.status === 'New'">
            <font-awesome-icon icon="spinner" spin/>
          </div>
          <div id='newStatus' v-if="row.item.status === 'Processed'">
            <i class="fa fa-check text-success"></i>
          </div>
          <div id='newStatus' v-if="row.item.status === 'Error'">
            <i class="fa fa-exclamation-circle text-danger"></i>
          </div>
        </template>
        <template slot="distance" slot-scope="data">
          <div id='distance'>
            <span v-if="data.value">{{convertDistance(data.value)}} {{distanceUnits}}</span>
          </div>
        </template>
        <template slot="avgPower" slot-scope="data">
          <span v-if="data.value">{{data.value}} W</span>
        </template>
        <template slot="avgSpeed" slot-scope="data">
            <span v-if="data.value">{{convertDistance(data.value)}} {{speedUnits}}</span>
        </template>
        <template slot="actions" slot-scope="row">
          <div align="center">
            <span v-if="row.item.status === 'Error'">
              <b-button
                size="sm"
                variant="danger"
                :id="'errorDetails-' + row.index"
              >Error Details</b-button>
              <b-popover :target="'errorDetails-' + row.index"
                    placement="left"
                    title="Error Details"
                    triggers="hover focus"
                    :content="row.item.statusMessage">
              </b-popover>
            </span>
            <b-button v-if="row.item.status === 'Processed'"
              size="sm"
              variant="primary"
              :to="{name: 'activity.details', params: { id: row.item.id }}"
            >Details</b-button>
            <b-btn v-if="row.item.status === 'Processed'"
              size="sm"
              variant="secondary"
              v-b-tooltip.hover title="Rename Activity"
              v-on:click="showEditActivity(row.item)"
            ><i class="fa fa-edit fa-1x"></i></b-btn>
            <b-button v-if="row.item.status === 'Processed' || row.item.status === 'Error'"
              size="sm"
              variant="danger"
              v-b-tooltip.hover title="Delete Activity"
              v-on:click="showConfirmDelete(row.item)"
            ><i class="fa fa-trash fa-1x"></i>
            </b-button>
          </div>
        </template>
      </b-table>
      <b-pagination v-if="activities.length >= perPage"
        :variant="theme"
        align="center"
        hide-goto-end-buttons
        v-model="currentPage"
        :total-rows="rows"
        :per-page="perPage"
        aria-controls="activities-table"
        first-text="First"
        prev-text="Prev"
        next-text="Next"
        last-text="Last"
      ></b-pagination>
    </div>
  </div>
</template>

<script>
import vueDropzone from 'vue2-dropzone'
import firebase from 'firebase/app'
import 'firebase/storage'
import Utils from '@/services/utils'
import 'vue2-dropzone/dist/vue2Dropzone.css'

import { db } from '../main'

export default {
  name: 'Upload',
  metaInfo: {
    title: 'Upload'
  },
  data () {
    return {
      distanceUnits: 'km',
      speedUnits: 'km/h',
      utils: new Utils(),
      dropOptions: {
        url: '/',
        method: 'put',
        autoQueue: false,
        autoProcessQueue: false,
        maxFileSize: 4, // MB
        maxFiles: 1,
        chunking: true,
        forceChuncking: true,
        chunkSize: 500, // bytes
        dictDefaultMessage: `<i class='fa fa-cloud-upload fa-4x'></i><p>Drop .FIT or .CSV file here or click to select one.`,
        acceptedFiles: '.fit,.csv'
      },
      perPage: 10,
      currentPage: 1,
      fields: [
        {key: 'status', label: 'Status', class: 'text-center'},
        {key: 'name', label: 'Name', sortable: true},
        {key: 'activity_date', label: 'Date Time', sortable: true, sortDirection: 'desc'},
        {key: 'distance', label: 'Distance', class: 'text-right'},
        {key: 'avgSpeed', label: 'Avg. Speed', class: 'text-right'},
        {key: 'avgPower', label: 'Avg. Power', class: 'text-right'},
        {key: 'actions', label: 'Actions', class: 'text-center'}
      ],
      isDark: this.theme === 'dark',
      uploadError: false,
      uploadMessage: '',
      activities: [],
      activityID: null,
      activityName: '',
      modalHeaderBgVariant: this.theme,
      modalHeaderTextVariant: this.theme === 'dark' ? 'light' : 'dark',
      modalBodyBgVariant: this.theme === 'dark' ? 'semidark' : 'light',
      modalBodyTextVariant: 'dark',
      modalFooterBgVariant: this.theme,
      modalFooterTextVariant: this.theme === 'dark' ? 'light' : 'dark'
    }
  },
  computed: {
    rows () {
      return this.activities.length
    },
    user () {
      return this.$store.getters.getUser
    },
    userPrefs () {
      return this.$store.getters.getUserPrefs
    },
    isActivityNameValid () {
      return this.activityName.length > 0
    },
    invalidActivityNameFeedback () {
      if (this.activityName.length === 0) {
        return 'Please enter something'
      }
    },
    validActivityNameFeedback () {
      return this.activityName !== 'New Activity' && this.isActivityNameValid === true ? 'Thank you' : ''
    }
  },
  created: function () {
    if (this.user) {
      this.fetchData()
    }
  },
  watch: {
    theme: function (value) {
      this.isDark = value === 'dark'
    },
    userPrefs () {
      // need a watcher on userPrefs because these are loaded async from store
      // it could happen that user prefs are set after this component is loaded
      if (this.userPrefs) {
        this.distanceUnits = this.userPrefs.units === 'metric' ? 'km' : 'mi'
        this.speedUnits = this.userPrefs.units === 'metric' ? 'km/h' : 'mph'
      }
    }
  },
  components: {
    vueDropzone
  },
  props: ['theme'],
  methods: {
    convertDistance: function (d) {
      if (this.userPrefs.units !== 'metric' && !isNaN(d)) {
        return this.utils.kmToMi(d).toFixed(1)
      } else {
        return d
      }
    },
    onEditEnterKey: function (event) {
      if (event.which === 13) {
        this.onEditOK()
        this.$refs.editActivityModal.hide()
      }
    },
    onConfirmDelete: async function () {
      // delete here
      let docRef = db.collection('activities').doc(this.activityID)
      try {
        await docRef.delete()
      } catch (error) {
        console.log(error)
      }
    },
    showConfirmDelete: function (item) {
      this.activityName = item.name
      this.activityID = item.id
      this.$refs.confirmDeleteModal.show()
    },
    showEditActivity: function (item) {
      this.activityName = item.name
      this.activityID = item.id
      this.$refs.editActivityModal.show()
    },
    onShowEditActivity: function (event) {
      this.$refs.activityName.focus()
    },
    onEditOK: async function () {
      // let's update the activity name
      let docRef = db.collection('activities').doc(this.activityID)
      let _this = this
      try {
        await docRef.update({
          name: _this.activityName
        })
      } catch (error) {
        console.log(error)
      }
    },
    fileAdded: function (file) {
      this.activityID = this.utils.uuid()
      let dz = this.$refs.uploadDropZone.dropzone
      this.uploadError = false

      if (dz.files.length <= dz.options.maxFiles) {
        let reader = new FileReader()
        const _this = this
        reader.onload = async function (event) {
          // create a new item in my activities collection
          let activities = db.collection('activities')
          let doc = {
            id: _this.activityID,
            uid: _this.user.uid,
            status: 'New',
            timestamp: new Date(),
            name: 'New Activity',
            distance: null,
            averageSpeed: null,
            averagePower: null
          }
          // show a placeholder activity while the server parses the .fit file
          _this.activities.unshift(doc)

          // make sure we have an activity in firestore before the trigger is fired
          await activities.doc(_this.activityID).set(doc)

          uploadToStorage(_this.user.uid, _this.activityID, file, event.target.result, dz,
            // on success
            function (downloadURL) {
              // processing is handled by a firestore cloud function triggered by a storage add event
              // the cloud function will retrieve the activity, set the activity data parsed from
              // file and then fetchData() below will get notified and refresh the screen - Magic!
              dz.removeAllFiles()
            },
            // on error
            function (error) {
              this.uploadError = true
              this.uploadMessage = error.message
            }
          )
        }

        reader.readAsDataURL(file)
      }
    },
    fetchData: function () {
      let activitiesRef = db.collection('activities')
      let _this = this

      activitiesRef
        .where('uid', '==', _this.user.uid)
        .where('status', '==', 'Processed')
        .orderBy('timestamp', 'desc')
        .onSnapshot(function (querySnapshot) {
          _this.activities = []
          querySnapshot.forEach(function (doc) {
            let docData = doc.data()
            _this.activities.push({
              id: doc.id,
              name: docData.name,
              activity_date: docData.activity_date.toDate().toLocaleString(),
              timestamp: docData.timestamp.toDate().toLocaleString(),
              distance: parseFloat(docData.distance).toFixed(1),
              avgPower: parseInt(docData.averagePower),
              avgSpeed: parseFloat(docData.averageSpeed).toFixed(2),
              status: docData.status
            })
          })
        })

      // this is pretty lame but Firestore does not support OR queries as of 2/8/2019
      activitiesRef
        .where('uid', '==', _this.user.uid)
        .where('status', '==', 'Error')
        .orderBy('timestamp', 'desc')
        .onSnapshot(function (querySnapshot) {
          let deleted = []
          let added = []
          querySnapshot.docChanges().forEach(function (change) {
            let docData = change.doc.data()
            if (change.type === 'added') {
              // errors are pushed to the top
              added.push(docData.id)
              _this.activities.unshift({
                id: docData.id,
                name: docData.name,
                status: docData.status,
                statusMessage: docData.statusMessage
              })
            } else if (change.type === 'removed') {
              deleted.push(docData.id)
            }
            if (deleted.length > 0) {
              _this.activities = _this.activities.filter(function (item) {
                return !deleted.includes(item.id)
              })
            }
            if (added.length > 0) {
              // there are new errors remove 'New' item
              _this.activities = _this.activities.filter(function (item) {
                return item.status !== 'New'
              })
            }
          })
        })
    }
  }
}

function uploadToStorage (userId, activityId, file, data, dz, callback, onErrorCallback) {
  // this is the dropzone's file preview progressbar, we're going to use this to let the user know how firebase upload is doing
  let dzProgressBar = file.previewElement.children[2]
  console.log(file)
  let fileExtension = file.name.endsWith('csv') ? '.csv' : '.fit'
  // create a unique id for the file to be uploaded - this will be the activity id from now on
  let path = 'userdata/' + userId + '/activities/' + activityId + fileExtension

  // get a ref to firebase storage root
  let storageRef = firebase.storage().ref()

  // create a reference for the file we are going to upload
  let fileRef = storageRef.child(path)

  // firebase gives you an UploadTask (promise) - we'll use this to monitor upload progress
  let task = fileRef.putString(data, 'data_url')

  // making sure progress bar is visible
  dzProgressBar.opacity = 1

  task.on(firebase.storage.TaskEvent.STATE_CHANGED,
    function progress (snapshot) {
      let progressString = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
      dzProgressBar.children[0].style.width = progressString + '%'
    },
    // handle upload errors
    function (error) {
      onErrorCallback(error)
    },
    // handle success
    function () {
      // get a download URL and return it to the caller
      task.snapshot.ref.getDownloadURL().then(function (downloadURL) {
        callback(downloadURL)
      })
      // hiding the progress bar
      dzProgressBar.opacity = 0
    }
  )
}

</script>

<style>

#uploadDropZone {
  height: 160px;
  padding: 10px;
  color: #b1aeae;
  background: transparent;
  box-sizing: border-box;
  border-radius: 5px;
  border: 2px dashed #b1aeae;
  border-image: none;
  margin-left: auto;
  margin-right: auto;
  margin-top: 10px;
}

#uploadDropZone .dz-preview {
  width: 160px;
  display: inline-block;
}
#uploadDropZone .dz-preview .dz-image {
  width: 80px;
  height: 80px;
  margin-left: 40px;
  margin-bottom: 10px;
}
#uploadDropZone .dz-preview .dz-image > div {
  width: inherit;
  height: inherit;
  border-radius: 50%;
  background-size: contain;
}
#uploadDropZone .dz-preview .dz-image > img {
  width: 100%;
}

#uploadDropZone .dz-preview .dz-details {
  color: white;
  transition: opacity 0.2s linear;
  text-align: center;
  background: #313131;
}
</style>

<style>
.page-item .page-link {
  margin: 0 4px;
  background-color: transparent;
  border: #313131;
}
.page-item.disabled .page-link {
  margin: 0 4px;
  background-color: transparent;
  border: transparent;
}
</style>
