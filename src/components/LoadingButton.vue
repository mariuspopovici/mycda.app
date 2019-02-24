<template>
  <button class="btn btn-secondary" type="button" :disabled="loading">
    <div id="loadingButton" v-if="loading">
      <b-spinner small/>
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
