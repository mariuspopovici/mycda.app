<template>
  <div id="Upload">
    <div class="container"></div>
    <div id="upload">
      <vue-dropzone id="uploadDropZone" :options="dropOptions"></vue-dropzone>
    </div>
  </div>
</template>

<script>
/* eslint-disable */
import vueDropzone from "vue2-dropzone";

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
        dictDefaultMessage: "Drop .FIT files here."
      }
    };
  },
  components: {
    vueDropzone
  },
  props: ["theme"],
  methods: {}
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