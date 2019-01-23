<template>
  <div id="About">
    <div class="container">
      <h2>CdA Analysis</h2>
      <h4 v-if="!loading">Input rolling resistance , mass and air density. Use CdA slider to align the virtual elevation profile.</h4>
      <span v-if="loading">Loading segment details, please wait...</span>
      {{activityID}}
      Range: {{range.start}} --> {{range.end}}
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
      loading: true,
      activityID: this.$route.params.id
    }
  },
  props: ['theme', 'range', 'data'],
  methods: {}
}
</script>
