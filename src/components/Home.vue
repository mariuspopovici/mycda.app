<template>
  <div class="container" id="home">
    <b-card-group  deck>
      <b-card :bg-variant="theme" title="Activities"
              img-src="/static/images/home/sprint.png"
              img-alt="Activities"
              img-top>
        <p class="card-text">
          Upload and manage activities recorded using your Garmin or other cycling head units. View activity details, select segments for analysis
          and estimate your coefficient of drag (CdA) or rolling resistance (crr).
        </p>
        <b-button to="activities" variant="primary">Activities</b-button>
        <div slot="footer">
          <small class="text-muted">Last updated 3 mins ago</small>
        </div>
      </b-card>

      <b-card title="Experiments"
              :bg-variant="theme"
              img-src="/static/images/home/velodrome.png"
              img-alt="Experiments"
              img-top>
        <p class="card-text">
          Group analysis performed on different segments selected from the same activity. Compare CdA/crr across different runs
          making it easy to determine if a position or equipment change is beneficial or not.
        </p>
        <b-button href="#" variant="primary">Experiments</b-button>
        <div slot="footer">
          <small class="text-muted">Last updated 3 mins ago</small>
        </div>
      </b-card>
    </b-card-group>
  </div>
</template>

<script>

export default {
  name: 'Home',
  metaInfo: {
    title: 'Home'
  },
  data () {
    return {}
  },
  props: ['theme'],
  methods: {}
}
</script>
