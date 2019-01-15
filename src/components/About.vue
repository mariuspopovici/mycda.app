<template>
  <div id="About">
    <div class="container">
      <div style="margin-top: 2rem; padding-bottom: 1rem;">
        <b-jumbotron :bg-variant="theme" header="MyCdA App" lead="Estimate your CdA">
          <p>
            Estimate cycling coefficient of drag x frontal area (CdA) based
            using a power meter.
          </p>
          <p>
            Developer:
            <a href="mailto:marius@popovici.net">marius@popovici.net</a>
          </p>
          <div>
            Icons made by
            <a href="https://www.freepik.com/" title="Freepik">Freepik</a> from
            <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>
            is licensed by
            <a
              href="http://creativecommons.org/licenses/by/3.0/"
              title="Creative Commons BY 3.0"
              target="_blank"
            >CC 3.0 BY</a>
          </div>
          <p/>
          <p>For more information visit GitHub</p>
          <b-btn
            variant="primary"
            target="_blank"
            href="https://github.com/mariuspopovici/mycda.app"
          >More Info</b-btn>
        </b-jumbotron>
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable */
export default {
  name: "About",
  metaInfo: {
    title: "About",
    links: [{ rel: "canonical", href: "https://mycda.app/#/about" }]
  },
  data() {
    return {};
  },
  props: ["theme"],
  methods: {}
};
</script>




 
