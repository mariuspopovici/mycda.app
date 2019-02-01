<template>
  <div id="About">
    <div class="container">
      <div style="margin-top: 2rem; padding-bottom: 1rem;">
        <b-jumbotron :bg-variant="theme" header="MyCdA App" lead="What does MyCdA.app do?">
          <p>
            MyCdA.app lets you use data collected using a power meter, speed sensor and a cycling computer and
            estimate your drag coefficient (CdA) and /or rolling resistance (crr). Compare data across different runs in order
            to determine if an equipment or position change is beneficial or not.
          </p>
          <p>
            Determine how much faster or efficient a change in position or equipment will make you on race day by using a simple rule of thumb: Reducing CdA
            by 0.005 is worth 5W or 0.5 s/km (40 seconds over 40 km) at 30mph*.
          </p>
          <p>* flat course, no wind.  Time savings increase at lower speeds.</p>
          <br>
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
    title: "About"
  },
  data() {
    return {};
  },
  props: ["theme"],
  methods: {}
};
</script>




 
