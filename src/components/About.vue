<template>
  <div id="About">
    <div class="container">
      <div style="margin-top: 2rem; padding-bottom: 1rem;">
        <b-jumbotron :bg-variant=theme header="Rho App" lead="Air Density Calculator" >
            <p>Calculate air density (rho) based on air temperature, pressure and dew point.</p>
            <p>Developer: <a href="mailto:marius@popovici.net">marius@popovici.net</a></p>
            <div>Icons made by <a href="https://www.freepik.com/" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/"
                title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" 			    
                title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a>
            </div>
            <p>
            <p>For more information visit GitHub</p>
            <b-btn variant="primary" target="_blank" href="https://github.com/mariuspopovici/rhoapp">More Info</b-btn>
        </b-jumbotron>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: "About",
  data() {
    return {
    };
  },
  props: ['theme'],
  methods: {
  }
};
</script>
<style>
#About .logo {
  height: 64px;
  max-width:64px;
}
</style>




