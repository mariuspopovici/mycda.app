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
                        label="Display Name:"
                        label-class="text-sm-right"
                        label-for="name">
            <b-form-input id="name" v-on:input="enableSaveUserInfo" v-model.trim="displayName"></b-form-input>
          </b-form-group>
          <b-form-group horizontal
                        label="Email Address:"
                        label-class="text-sm-right"
                        label-for="email">
            <b-form-input id="email" v-on:input="enableSaveUserInfo" type="email" v-model.trim="email"></b-form-input>
          </b-form-group>
          <b-form-group horizontal
                        description="Enter your existing password to save any of the values in this section."
                        label="Current Password:"
                        label-class="text-sm-right"
                        label-for="password">
            <b-form-input id="password" v-on:input="enableSaveUserInfo" type="password" maxLength="25" required v-model.trim="password"></b-form-input>
          </b-form-group>
          <b-form-group horizontal
                        description="Enter your new password in case you want to change it."
                        label="New Password:"
                        label-class="text-sm-right"
                        label-for="password1">
            <b-form-input id="password1" v-on:input="enableSaveUserInfo" type="password" maxLength="25" v-model.trim="password1"></b-form-input>
          </b-form-group>
          <b-form-group horizontal
                        description="Re-enter your new password. It must match the previous entry."
                        label="Repeat Password:"
                        label-class="text-sm-right"
                        label-for="password2">
            <b-form-input id="password1" v-on:input="enableSaveUserInfo" type="password" maxLength="25" v-model.trim="password2"></b-form-input>
          </b-form-group>
          <b-form-group>
            <b-alert v-if="saveUserInfoFail" show dismissible variant="danger">{{saveUserInfoFailMessage}}</b-alert>
            <div align="right">
              <b-button :disabled="!saveUserInfoEnabled" align="right" variant="primary" v-on:click="updateUserInfo">{{saveUserInfoCaption}}</b-button>
            </div>
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
            <b-form-radio-group class="pt-2" id="units" v-model="units" :options="[{text: 'Imperial', value: 'imperial'}, {text: 'Metric', value: 'metric'}]"
              v-on:input="enableSaveUserPrefs" />
          </b-form-group>
          <b-form-group horizontal
                        label="Weight:"
                        description="Enter your weight including cycling kit, shoes, helmet etc."
                        label-class="text-sm-right"
                        label-for="weight">
            <b-form-input type="number" min="0" max="300" id="weight" v-model="weight" v-on:input="enableSaveUserPrefs"></b-form-input>
          </b-form-group>
          <b-form-group horizontal
                        description="Enter bike weight as set up for testing, including any accessories such as hydration, flat kit etc.."
                        label="Bike Weight:"
                        label-class="text-sm-right"
                        label-for="weight">
            <b-form-input type="number" min="0" max="50" id="bikeWeight" v-model="bikeWeight" v-on:input="enableSaveUserPrefs"></b-form-input>
          </b-form-group>
          <b-form-group horizontal
                        label="CdA:"
                        description="Select your default coefficient of drag (CdA) if you know it."
                        label-class="text-sm-right"
                        label-for="weight">
            <b-form-input id="cda" v-model="cda" type="number" min="0" max="1" step="0.001" v-on:input="enableSaveUserPrefs"></b-form-input>
          </b-form-group>
          <b-form-group horizontal
                        label="crr:"
                        description="Select your default coefficient of rolling resistance if you know it."
                        label-class="text-sm-right"
                        label-for="weight">
            <b-form-input id="crr" v-model="crr" type="number" step="0.0001" min="0" max="1" v-on:input="enableSaveUserPrefs"></b-form-input>
          </b-form-group>
          <b-form-group>
            <div align="right">
              <b-button align="right" variant="primary"
                v-b-tooltip.hover title="Log out and log back in for changes to take effect."
                :disabled="!saveUserPrefsEnabled"
                v-on:click="updateUserPrefs">{{saveUserPrefsCaption}}</b-button>
            </div>
          </b-form-group>
        </b-form-group>
      </b-card>
    </div>
  </div>
</template>

<script>
import firebase from 'firebase/app'
import 'firebase/auth'
import LoadingButton from '@/components/LoadingButton'
import { db } from '../main'
import { required, email, between, minLength, maxLength, sameAs } from 'vuelidate/lib/validators'

export default {
  name: 'Profile',
  metaInfo: {
    title: 'User Profile'
  },
  components: {
    LoadingButton
  },
  validations: {
    password: { required, minLength: minLength(6), maxLength: maxLength(25) },
    password1: { minLength: minLength(6), maxLength: maxLength(25) },
    password2: { minLength: minLength(6), maxLength: maxLength(25), sameAsPassword1: sameAs('password1') },
    email: { email, required },
    cda: { between: between(0, 1) },
    crr: { between: between(0, 1) },
    bikeWeight: { between: between(0, 50) },
    weight: { between: between(0, 300) }
  },
  props: ['theme'],
  computed: {
    user () {
      return this.$store.getters.getUser
    }
  },
  data () {
    return {
      saveUserInfoCaption: 'Save',
      saveUserInfoEnabled: false,
      saveUserPrefsCaption: 'Save',
      saveUserPrefsEnabled: false,
      saveUserInfoFail: false,
      saveUserInfoFailMessage: '',
      password: '',
      password1: '',
      password2: '',
      displayName: '',
      email: '',
      units: '',
      weight: 0.0,
      bikeWeight: 0.0,
      cda: 0.0,
      crr: 0.0
    }
  },
  created: function () {
    this.fetchData()
  },
  methods: {
    enableSaveUserInfo: function () {
      let isValid = !(this.$v.email.$invalid) &&
        !(this.$v.password.$invalid)

      if (this.password1.length > 0) {
        isValid = isValid && !(this.$v.password1.$invalid) && !(this.$v.password2.$invalid)
      }

      this.saveUserInfoEnabled = isValid
      this.saveUserInfoCaption = 'Save'
    },
    fetchData: async function () {
      this.displayName = this.user.displayName
      this.email = this.user.email

      let prefsDocRef = db.collection('userprefs').doc(this.user.uid)
      let doc = await prefsDocRef.get()
      if (doc.exists) {
        const docData = doc.data()
        this.units = docData.units
        this.weight = docData.weight
        this.bikeWeight = docData.bikeWeight
        this.cda = docData.cda
        this.crr = docData.crr
      }
    },
    updateUserInfo: async function () {
      try {
        // let's try to reauthenticate the current user with their existing password
        const credential = firebase.auth.EmailAuthProvider.credential(this.user.email, this.password)
        await this.user.reauthenticateAndRetrieveDataWithCredential(credential)

        // let's check if a password change is requested
        if (this.password1.length !== 0) {
          // check if new passwords match
          if (this.password1 !== this.password2) {
            this.saveUserInfoFail = true
            this.saveUserInfoFailMessage = 'New passwords do not match.'
            return
          } else {
            // update password
            await this.user.updatePassword(this.password1)
          }
        }

        // update display name
        await this.user.updateProfile({
          displayName: this.displayName
        })

        // update email
        await this.user.updateEmail(this.email)

        this.saveUserInfoFail = false
        this.saveUserInfoFailMessage = ''
        this.saveUserInfoEnabled = false
        this.saveUserInfoCaption = 'Saved'
      } catch (error) {
        console.log(error)
        this.saveUserInfoFail = true
        this.saveUserInfoFailMessage = error.message
      }
    },
    enableSaveUserPrefs: function () {
      let isValid = !(this.$v.cda.$invalid) &&
        !(this.$v.crr.$invalid) &&
        !(this.$v.weight.$invalid) &&
        !(this.$v.bikeWeight.$invalid)

      this.saveUserPrefsEnabled = isValid
      this.saveUserPrefsCaption = 'Save'
    },
    updateUserPrefs: async function () {
      try {
        // save to firebase
        let userPrefs = db.collection('userprefs')
        let doc = {
          uid: this.user.uid,
          units: this.units,
          weight: this.weight,
          bikeWeight: this.bikeWeight,
          cda: this.cda,
          crr: this.crr
        }
        // make sure we have an activity in firestore before the trigger is fired
        await userPrefs.doc(this.user.uid).set(doc)

        this.saveUserPrefsEnabled = false
        this.saveUserPrefsCaption = 'Saved'
      } catch (error) {
        console.log(error)
      }
    }
  }
}
</script>