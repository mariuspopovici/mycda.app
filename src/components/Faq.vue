<template>
  <div id="Faq">
    <div class="container">
      <div>
        <h2>MyCdA FAQ</h2>
        <h3>Answers to Frequently Asked Questions</h3>
        <h5>Have a question? <b-link href="https://groups.google.com/forum/#!forum/mycda" target="_new">Join</b-link> our user comunity.</h5>
        <b-card :bg-variant="theme" title="What file formats are supported by MyCdA?">

          <b-card-text>
            MyCdA supports most Garmin cycling activity files in .FIT (file extension) format as defined in the official
            <b-link href="https://www.thisisant.com/resources/fit">FIT SDK</b-link>. In most cases MyCdA
            can successfully parse activity files that can be imported into other fitness tracking applications such as Garmin Connect,
            Training Peaks or Strava. MyCdA will reject multi-sport activity files or any other files with activity types other than cycling.
            If you believe that your file is compatible and still have trouble importing it please <b-link href="mailto:support@mycda.app">contact us</b-link>.
          </b-card-text>

          <b-card-text>
            <p>Here's an overview of the .FIT file attributes required by MyCdA.</p>
            <b>file_id</b>
            <ul>
              <li>manufacturer</li>
              <li>product</li>
              <li>time_created</li>
            </ul>
            <b>session</b>
            <ul>
              <li>sport </li>
              <li>total_elapsed_time</li>
              <li>total_timer_time</li>
              <li>total_distance </li>
            </ul>
            <b>lap</b>
            <ul>
              <li>timestamp</li>
              <li>total_elapsed_time</li>
              <li>total_timer_time</li>
              <li>total_distance</li>
            </ul>
            <b>record</b>
            <ul>
              <li>timestamp</li>
              <li>position_lat</li>
              <li>position_long</li>
              <li>altitude</li>
              <li>distance</li>
              <li>power</li>
              <li>speed</li>
            </ul>
            <b>event</b>
            <ul>
              <li>timestamp</li>
              <li>type</li>
            </ul>
          </b-card-text>
          <div class="text-right"><b-link v-on:click='scrollTop' href="#" class="card-link">Top</b-link></div>
        </b-card>

        <br>
        <b-card :bg-variant="theme" title="What is the recommended protocol for collecting test data?">
          <b-card-text>
            In order to improve the accuracy and precision of the method used by MyCdA to estimate CdA
            we recommend following a set of guidelines for gathering test data.
          </b-card-text>
          <b-card-text>
            <ul>
              <li>Wind can negatively impact results. Ideally, test on a windless day or on a day with minimal wind (less than 5 kph / 3 mph).</li>
              <li>Select a safe location with no traffic. Use a loop, out-and-back or half-pipe course. Loops should be short (300m - 1.5km).
                Ride each one at a different speed and try to follow the same trajectory going into corners etc.
                You can ride these as slow or as fast as you want, speed is not important.
                Varying speed across the loops is useful because it makes it easier to isolate the combination of CdA and crr that will "level" the Virtual elevation
                plot.
              </li>
              <li>
                Each set of 5-6 loops can later be converted into a MyCdA segment for analysis.
                Record your entire test as a single .FIT file, you can use the lap button on your cycling computer
                to separate segments.
              </li>
              <li>Select a course with some elevation change if possible. Example of good test venues: flat road or velodrome, industrial park loop,
                out-and-back up a slight hill, climb same hill at different speeds and power.
              </li>
              <li>
                Don't use the brakes. Select a location where you can safely turn without using brakes (loop, finish at the top of a hill etc.)
              </li>
              <li>
                Maintain your riding position for the entire duration of the test. It can be challenging to perform tight turns while using the aerobars so
                pick your course accordingly and stay safe.
              </li>
              <li>
                Measure your body weight while wearing your kit, helmet and any other gear you plan to use. Weigh your bike and calculate total mass (rider + bike)
              </li>
              <li>
                GPS derived speed is not as accurate as you might think. Use a simple wheel or hub speed sensor and configure your cycling computer to use it as
                the primary source of speed data.
              </li>
              <li>
                Set cycling computer to record data every second instead of 'Smart Recording'.
              </li>
              <li>
                Zero / calibrate your power meter before testing.
              </li>
              <li>
                Record temperature, dew point and air pressure at your test location. You can use data from Accuweather, Wunderground etc. or measure it yourself
                using a temperature/weather sensor. MyCdA also has a handy calculator that will help you calculate air density based on these inputs.
                It can even retrieve these based on your current location. A mobile version of the calculator app you can use in the field is available
                <b-link href="https://rho.mycda.app">here</b-link>.
              </li>
            </ul>
          </b-card-text>
          <div class="text-right"><b-link v-on:click='scrollTop' href="#" class="card-link">Top</b-link></div>
        </b-card>

        <br>
        <b-card :bg-variant="theme" title="How do you use CdA Analysis to estimate CdA?">
          <b-card-text>
            From the main activity screen select a lap or a graph region and click on the Analyze button. Enter total mass, air density and rolling resistance
            in the CdA Analysis screen then use the CdA slider to align or level the virtual elevation profile. When the right combination of CdA and crr is selected
            the start and end virtual elevation of each loop should be the same.
          </b-card-text>

          <b-img src="./static/images/faq/cdalow.png" thumbnail center rounded fluid alt="CdA estimate too low"/>
          <figcaption class='text-center'>CdA estimate too low</figcaption>
          <br>
          <b-img src="./static/images/faq/cdahigh.png" thumbnail center rounded fluid alt="CdA estimate too high"/>
          <figcaption class='text-center'>CdA estimate too high</figcaption>
          <br>
          <b-img src="./static/images/faq/cdaright.png" thumbnail center rounded fluid alt="CdA estimate about right"/>
          <figcaption class='text-center'>CdA estimate about right</figcaption>

          <div class="text-right"><b-link v-on:click='scrollTop' href="#" class="card-link">Top</b-link></div>
        </b-card>

      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable */
export default {
  name: "Faq",
  metaInfo: {
    title: "Faq"
  },
  data() {
    return {
    };
  },
  props: ["theme"],
  methods: {
    scrollTop: function() {
      document.body.scrollTop = 0; // For Safari
      document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
    }
  }
};
</script>