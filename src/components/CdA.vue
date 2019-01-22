<template>
  <div id="About">
    <div class="container">
      <h2>Activity Details</h2>
      <h4 v-if="!loading">Input rolling resistance , mass and air density. Use CdA slider to align the virtual elevation profile.</h4>
      <span v-if="loading">Loading segment details, please wait...</span>
    </div>
  </div>
</template>

<script>

export default {
  name: 'CdA',
  metaInfo: {
    title: 'CdA',
    links: []
  },
  data () {
    return {
      loading: true
    }
  },
  props: ['theme', 'range'],
  methods: {}
}
</script>
