<template>
  <div class="container" id="Upload">
    <div id="upload">
      <h2>Experiments</h2>
      <h3>Start an experiment by uploading a new .FIT activity file.</h3>
      <br>
      <vue-dropzone id="uploadDropZone" :options="dropOptions"></vue-dropzone>
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
/* eslint-disable */
import vueDropzone from "vue2-dropzone";

const uploadedItems = [
  {
    id: 1,
    activity_name: "Saturday Morning Ride",
    date_time: "01/01/2019 8:00 AM",
    distance: "2.3mi",
    average_power: "158W",
    average_speed: "20mph"
  },
  {
    id: 2,
    activity_name: "Monday Morning Ride",
    date_time: "01/02/2019 8:00 AM",
    distance: "2.4mi",
    average_power: "358W",
    average_speed: "28mph"
  }
];

export default {
  name: "Upload",
  metaInfo: {
    title: "Upload",
    links: [{ rel: "canonical", href: "https://mycda.app/#/upload" }]
  },
  data() {
    return {
      dropOptions: {
        url: "https://httpbin.org/post",
        maxFileSize: 4, // MB
        maxFiles: 10,
        chunking: true,
        chunkSize: 500, // bytes
        dictDefaultMessage: "Drop .FIT files here or click to select file."
      },
      fields: [
        "activity_name",
        "date_time",
        "distance",
        "average_speed",
        "average_power",
        "actions"
      ],
      items: uploadedItems,
      isDark: this.theme === "dark"
    };
  },
  components: {
    vueDropzone
  },
  props: ["theme"],
  methods: {},
  watch: {
    theme: function(value) {
      this.isDark = value === "dark";
    }
  }
};
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