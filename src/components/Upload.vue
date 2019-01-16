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
        :items="items"
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

const uploadedItems = [
  {
    id: 1,
    activity_name: 'Saturday Morning Ride',
    date_time: '01/01/2019 8:00 AM',
    distance: '2.3mi',
    average_power: '158W',
    average_speed: '20mph'
  },
  {
    id: 2,
    activity_name: 'Monday Morning Ride',
    date_time: '01/02/2019 8:00 AM',
    distance: '2.4mi',
    average_power: '358W',
    average_speed: '28mph'
  }
]

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
        dictDefaultMessage: 'Drop .FIT files here or click to select file.'
      },
      fields: [
        'activity_name',
        'date_time',
        'distance',
        'average_speed',
        'average_power',
        'actions'
      ],
      items: uploadedItems,
      isDark: this.theme === 'dark',
      uploadError: false,
      uploadMessage: ''
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
        reader.onload = function (event) {
          uploadToStorage(file, event.target.result, dz,
            // on success
            function (downloadURL) {
              console.log('uploaded to: ' + downloadURL)
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
    }
  },
  watch: {
    theme: function (value) {
      this.isDark = value === 'dark'
    }
  }
}

function uploadToStorage (file, data, dz, callback, onErrorCallback) {
  // this is the dropzone's file preview progressbar, we're going to use this to let the user know how firebase upload is doing
  let dzProgressBar = file.previewElement.children[2]

  // create a unique id for the file to be uploaded
  var uuidString = uuid()
  let path = 'userdata/' + firebase.auth().currentUser.uid + '/activities/_' + uuidString + '_' + file.name

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
