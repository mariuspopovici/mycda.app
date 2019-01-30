<template>
  <div class="container" id="Upload">
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
          v-model.trim="activityName">
        </b-form-input>
      </b-form-group>
    </b-modal>
    <div id="upload">
      <div id="head">
        <h2>Activities</h2>
        <h4>Create a new activity by importing a .FIT file.</h4>
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
        :dark="isDark"
        :head-variant="theme"
        striped
        hover
        stacked="sm"
        responsive
        :items="activities"
        :fields="fields"
      >
        <template slot="status" slot-scope="data">
          <div id='newStatus' v-if="data.value === 'New'">
            <span><font-awesome-icon icon="spinner" spin/>&nbsp;New</span>
          </div>
          <div id='newStatus' v-if="data.value === 'Processed'">
            <span>{{data.value}}</span>
          </div>
        </template>
        <template slot="actions" slot-scope="row">
          <div align="center">
            <b-button
              size="sm"
              variant="primary"
              :to="{name: 'activity.details', params: { id: row.item.id }}"
            >Show Details</b-button>
            <b-btn
              size="sm"
              variant="secondary"
              v-b-tooltip.hover title="Rename Activity"
              v-on:click="showEditActivity(row.item)"
            ><i class="fa fa-edit fa-1x"></i></b-btn>
            <b-button
              size="sm"
              variant="secondary"
              v-b-tooltip.hover title="Delete Activity"
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
import vueDropzone from 'vue2-dropzone'
import firebase from 'firebase/app'
import 'firebase/storage'
import Utils from '@/services/utils'

import { db } from '../main'

const utils = new Utils()

export default {
  name: 'Upload',
  metaInfo: {
    title: 'Upload'
  },
  data () {
    return {
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
        dictDefaultMessage: `<i class='fa fa-cloud-upload fa-4x'></i><p>Drop a .FIT file here or click to select one.`,
        acceptedFiles: '.fit'
      },
      fields: [
        {key: 'status', label: 'Status'},
        {key: 'name', label: 'Name', sortable: true},
        {key: 'timestamp', label: 'Date Time', sortable: true, sortDirection: 'desc'},
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
    this.fetchData()
  },
  watch: {
    theme: function (value) {
      this.isDark = value === 'dark'
    }
  },
  components: {
    vueDropzone
  },
  props: ['theme'],
  methods: {
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
      this.activityID = utils.uuid()

      let dz = this.$refs.uploadDropZone.dropzone
      this.uploadError = false

      if (dz.files.length <= dz.options.maxFiles) {
        let reader = new FileReader()
        const _this = this
        reader.onload = async function (event) {
          // create a new item in my activities collection
          let activities = db.collection('activities')
          let doc = {
            id: -1,
            uid: this.user.uid,
            status: 'New',
            timestamp: '-',
            name: 'New Activity',
            distance: '-',
            averageSpeed: '-',
            averagePower: '-'
          }
          // show a placeholder activity while the server parses the .fit file
          _this.activities.unshift(doc)

          // make sure we have an activity in firestore before the trigger is fired
          await activities.doc(_this.activityID).set(doc)

          uploadToStorage(_this.activityID, file, event.target.result, dz,
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
        .where('uid', '==', this.user.uid)
        .where('status', '==', 'Processed')
        .orderBy('timestamp', 'desc')
        .onSnapshot(function (querySnapshot) {
          _this.activities = []
          querySnapshot.forEach(function (doc) {
            let docData = doc.data()
            _this.activities.push({
              id: doc.id,
              name: docData.name,
              timestamp: docData.timestamp.toDate().toLocaleString(),
              distance: parseFloat(docData.distance).toFixed(1),
              avgPower: parseInt(docData.averagePower),
              avgSpeed: parseFloat(docData.averageSpeed).toFixed(2),
              status: docData.status
            })
          })
        })
    }
  }
}

function uploadToStorage (activityId, file, data, dz, callback, onErrorCallback) {
  // this is the dropzone's file preview progressbar, we're going to use this to let the user know how firebase upload is doing
  let dzProgressBar = file.previewElement.children[2]

  // create a unique id for the file to be uploaded - this will be the activity id from now on
  let path = 'userdata/' + this.user.uid + '/activities/' + activityId + '.fit'

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
  height: 150px;
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
