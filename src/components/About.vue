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
          <p>MyCdA is free software.</p>
          <p>
            Determine how much faster or efficient a change in position or equipment will make you on race day by using a simple rule of thumb: reducing CdA
            by 0.005 is worth 5W or 0.5 s/km (20 seconds over 40 km) at 30mph*.
          </p>

          <br>
          <p>Version {{appVersion}}</p>
          <p>
            Developer:
            <a href="mailto:marius@popovici.net">marius@popovici.net</a>
          </p>
          <p>
            Virtual Elevation method implementation based on <a href="http://anonymous.coward.free.fr/wattage/cda/indirect-cda.pdf">algorithm</a>
            described by R. Chung (rechung@gmail.com) - <i>Estimating CdA with a power meter</i>.
          </p>
          <div>
            FavIcons made by
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
          <a class="github-button" href="https://github.com/mariuspopovici/mycda.app/" aria-label="Fork mariuspopovici/mycda.app on GitHub">GitHub</a>
          <a class="github-button" href="https://github.com/mariuspopovici/mycda.app/issues" data-icon="octicon-issue-opened" aria-label="Issue ntkme/github-buttons on GitHub">Report Issue</a>
          <p>Have a question? Visit our <b-link href="#/faq">FAQ</b-link> section or <b-link href="https://groups.google.com/forum/#!forum/mycda" target="_new">join</b-link> our user comunity.</p>
          <br>
          <h4>Follow Us</h4>
          <a href="https://www.instagram.com/mycda.app/" target="_blank"><i class="fa fa-instagram fa-3x"></i></a>
        </b-jumbotron>
      </div>
    </div>
  </div>
</template>

<script>
import { version } from '../../package.json'
/* eslint-disable */
export default {
  name: "About",
  metaInfo: {
    title: "About"
  },
  data() {
    return {
      appVersion: version
    };
  },
  mounted: function() {
    let script = document.createElement('script')
    script.async = true
    script.setAttribute('src', 'https://buttons.github.io/buttons.js')
    document.head.appendChild(script)
  },
  props: ["theme"],
  methods: {}
};
</script>
