<template>
  <div id="Profile">
    <div class="container">
      <b-card :bg-variant="theme">
        <b-form-group horizontal
                      breakpoint="lg"
                      label="User Information"
                      label-size="lg"
                      label-class="font-weight-bold pt-0"
                      class="mb-0">
          <b-form-group horizontal
                        label="Full Name:"
                        label-class="text-sm-right"
                        label-for="name">
            <b-form-input id="name"></b-form-input>
          </b-form-group>
          <b-form-group horizontal
                        label="Email Address:"
                        label-class="text-sm-right"
                        label-for="email">
            <b-form-input id="email"></b-form-input>
          </b-form-group>
        </b-form-group>
      </b-card>
      <br>
      <b-card :bg-variant="theme">
        <b-form-group horizontal
                      breakpoint="lg"
                      label="Preferences"
                      label-size="lg"
                      label-class="font-weight-bold pt-0"
                      class="mb-0">
            <b-form-group horizontal
                        description="Select your preferred units of measurement type."
                        label="Units of Measurement:"
                        label-class="text-sm-right"
                        class="mb-0">
            <b-form-radio-group class="pt-2" id="units" :options="['Imperial', 'Metric']" />
          </b-form-group>
          <b-form-group horizontal
                        label="Weight:"
                        description="Enter your weight including cycling kit, shoes, helmet etc."
                        label-class="text-sm-right"
                        label-for="weight">
            <b-form-input type="number" id="weight"></b-form-input>
          </b-form-group>
          <b-form-group horizontal
                        description="Enter bike weight as set up for testing, including any accessories such as hydration, flat kit etc.."
                        label="Bike Weight:"
                        label-class="text-sm-right"
                        label-for="weight">
            <b-form-input type="number" id="bikeWeight"></b-form-input>
          </b-form-group>
          <b-form-group horizontal
                        label="CdA:"
                        description="Select your default coefficient of drag (CdA) if you know it."
                        label-class="text-sm-right"
                        label-for="weight">
            <b-form-input type="number" id="cda" step="0.001"></b-form-input>
          </b-form-group>
          <b-form-group horizontal
                        label="crr:"
                        description="Select your default coefficient of rolling resistance if you know it."
                        label-class="text-sm-right"
                        label-for="weight">
            <b-form-input type="number" id="crr" step="0.0001"></b-form-input>
          </b-form-group>
        </b-form-group>
      </b-card>
    </div>
  </div>
</template>

<script>
import firebase from 'firebase/app'
import 'firebase/auth'

export default {
  name: 'Profile',
  metaInfo: {
    title: 'User Profile'
  },
  data () {
    return {
      user: firebase.auth().currentUser
    }
  },
  props: ['theme'],
  methods: {}
}
</script>
