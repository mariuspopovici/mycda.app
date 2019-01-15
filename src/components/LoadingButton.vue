<template>
  <button class="btn btn-info" type="button" :disabled="loading">
    <div id="loadingButton" v-if="loading">
      <font-awesome-icon icon="spinner" spin/>
      &nbsp;{{loadingCaption}}
    </div>
    <div id="loadingButton" v-else>
      <font-awesome-icon icon="location-arrow"/>
      &nbsp;{{caption}}
    </div>
  </button>
</template>

<script>
export default {
  props: {
    loading: { type: Boolean },
    caption: { type: String },
    loadingCaption: { type: String }
  }
}
</script>
