<template>
  <div class="container" id="home">
    <b-card-group  deck>
      <b-card :bg-variant="theme" title="Activities"
              img-src="/static/images/home/sprint.png"
              img-alt="Activities"
              img-top>
        <p class="card-text">
          Upload and manage activities recorded on your Garmin or other cycling GPS device. View activity details and select segments for analysis
          to estimate your coefficient of drag (CdA). At this time only .FIT files are supported.
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
          Experiments group analysis done on different segments selected from the same activity. They allow you to compare CdA/crr across different runs
          making it easy to determine if a position or equipment change is beneficial or not.
        </p>
        <b-button href="#" variant="primary">Experiments</b-button>
        <div slot="footer">
          <small class="text-muted">Last updated 3 mins ago</small>
        </div>
      </b-card>
      <!-- <b-card title="Settings"
              :bg-variant="theme"
              img-src="/static/images/home/sprint.png"
              img-alt="Settings"
              img-top>
        <p class="card-text">
            This is a wider card with supporting text below as a natural lead-in to additional content. This card has even longer content
            than the first to show that equal height action.
        </p>
        <b-button href="#" variant="primary">Settings</b-button>
        <div slot="footer">
          <small class="text-muted">Last updated 3 mins ago</small>
        </div>
      </b-card> -->
    </b-card-group>
  </div>
</template>

<script>

export default {
  name: 'Home',
  metaInfo: {
    title: 'Home',
    links: [{ rel: 'canonical', href: 'https://mycda.app/#/home' }]
  },
  data () {
    return {}
  },
  props: ['theme'],
  methods: {}
}
</script>
