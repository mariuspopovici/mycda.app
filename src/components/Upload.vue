<template>
  <div class="container" id="Upload">
    <div id="upload">
      <h2>Experiments</h2>
      <h3>Start an experiment by uploading a new .FIT activity file.</h3>
      <b-alert
        variant="danger"
        dismissible
        :show="uploadError"
        @dismissed="uploadError=false"
      >{{uploadMessage}}</b-alert>
      <br>
      <vue-dropzone ref="uploadDropZone" id="uploadDropZone" :options="dropOptions" v-on:vdropzone-file-added="fileAdded" ></vue-dropzone>
      <br>
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
        <template slot="actions" slot-scope="row">
          <b-button
            size="sm"
            variant="primary"
            :to="{path: 'about', params: { id: row.item.id }}"
          >Show Details</b-button>
        </template>
      </b-table>
    </div>
  </div>
</template>

<script>
import vueDropzone from 'vue2-dropzone'
import firebase from 'firebase'
import { db } from '../main'

export default {
  name: 'Upload',
  metaInfo: {
    title: 'Upload',
    links: [{ rel: 'canonical', href: 'https://mycda.app/#/upload' }]
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
        dictDefaultMessage: 'Drop .FIT files here or click to select file.',
        acceptedFiles: '.fit'
      },
      fields: [
        'status',
        'name',
        'timestamp',
        'distance',
        'averageSpeed',
        'averagePower',
        'actions'
      ],
      isDark: this.theme === 'dark',
      uploadError: false,
      uploadMessage: '',
      activities: []
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
    fileAdded: function (file) {
      let dz = this.$refs.uploadDropZone.dropzone
      this.uploadError = false

      if (dz.files.length <= dz.options.maxFiles) {
        let reader = new FileReader()
        const _this = this
        reader.onload = function (event) {
          let uuidString = uuid()
          uploadToStorage(uuidString, file, event.target.result, dz,
            // on success
            function (downloadURL) {
              console.log('uploaded to: ' + downloadURL)
              // create a new item in my activities collection
              let activities = db.collection('activities')
              let doc = {
                uid: firebase.auth().currentUser.uid,
                fitURL: downloadURL,
                status: 'New',
                timestamp: new Date(),
                name: 'New Activity',
                distance: '',
                averageSpeed: '',
                averagePower: '',
                fit: ''
              }
              _this.activities.push(doc)
              activities.doc(uuidString).set(doc).then(() => {
                console.info('Added new activity document to store.' + JSON.stringify(doc))
              }).catch(error => console.log(error))
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
        .where('uid', '==', firebase.auth().currentUser.uid)
        .where('status', '==', 'Processed')
        .orderBy('timestamp', 'desc')
        .onSnapshot(function (querySnapshot) {
          this.activities = []
          querySnapshot.forEach(function (doc) {
            let docData = doc.data()
            let docFITData = JSON.parse(docData.fit)
            console.log(docFITData)
            let session = docFITData.activity.sessions[0]
            _this.activities.push({
              id: 2,
              name: 'New Activity',
              timestamp: new Date(docFITData.activity.timestamp).toLocaleString(),
              distance: parseFloat(session.total_distance).toFixed(1),
              averagePower: parseInt(session.avg_power),
              averageSpeed: parseFloat(session.avg_speed).toFixed(2),
              status: docData.status
            })
          })
        })
    }
  }
}

function uploadToStorage (uuidString, file, data, dz, callback, onErrorCallback) {
  // this is the dropzone's file preview progressbar, we're going to use this to let the user know how firebase upload is doing
  let dzProgressBar = file.previewElement.children[2]

  // create a unique id for the file to be uploaded - this will be the activity id from now on
  let path = 'userdata/' + firebase.auth().currentUser.uid + '/activities/' + uuidString + '.fit'

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

      console.log(dzProgressBar)
      // hiding the progress bar
      dzProgressBar.opacity = 0
    }
  )
}

function uuid () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    // eslint-disable-next-line one-var
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
</script>

<style>
#uploadDropZone {
  height: 200px;
  padding: 40px;
  color: white;
  background: #313131;
  box-sizing: border-box;
  border-radius: 5px;
  border: 2px dashed #b1aeae;
  border-image: none;
  margin-left: auto;
  margin-right: auto;
  margin-top: 10px;
  max-width: 500px;
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
