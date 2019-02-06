<template>
  <section :class="this.theme === 'dark' ? 'text-white' : ''">
  <b-container fluid class="text-center">
    <div id="fullscreen_bg" class="fullscreen_bg"/>
    <b-row>
      <b-col>
        <b-jumbotron :bg-variant="theme" ref="jumbotron" id="jumbotron"  header="What's your CdA?" lead="Your aerodynamics field testing companion." >
          <hr class="my-4">
          <p>
            Sign in or sign up for free now!
          </p>
          <b-btn variant="success" href="#/signup">Sign Up</b-btn>
          <b-btn variant="primary" href="#/login">Sign In</b-btn>
        </b-jumbotron>
      </b-col>
    </b-row>
    <section :class="this.theme === 'dark' ? 'text-white' : ''">
    <b-row>
      <b-col md="4" xs="6">
        <font-awesome-icon icon="cloud-upload-alt" size="6x"/>
        <h3>Upload</h3>
        <p>Upload your cycling activities in Garmin .FIT file format. View and analyze recorded data such as power, speed and elevation across an entire activity or individual laps.</p>
      </b-col>
      <b-col md="4" xs="6">
        <font-awesome-icon icon="chart-area" size="6x"/>
        <h3>Analyze</h3>
        <p>Create segments by lap # or free selection then analyze and estimate coefficient of drag and / or rolling resistance.</p>
      </b-col>
      <b-col md="4" xs="6">
        <font-awesome-icon icon="clipboard-check" size="6x"/>
        <h3>Compare</h3>
        <p>Compare CdA / crr data across different segments belonging to the same activity.</p>
      </b-col>
    </b-row>
    </section>
  </b-container>
  </section>
</template>

<script>

export default {
  name: 'Landing',
  metaInfo: {
    title: 'MyCDA'
  },
  data () {
    return {}
  },
  props: ['theme'],
  methods: {}
}
</script>

<style>
.fullscreen_bg {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-size: cover;
  background-position: 50% 50%;
  background-image: url('/static/images/home/tuck-1200px.jpg');
  background-repeat:repeat;
}
</style>
