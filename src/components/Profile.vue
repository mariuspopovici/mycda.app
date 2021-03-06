<template>
  <div id="Profile">
    <div class="container-fluid">
      <h2>User Profile</h2>
      <h5>Please enter your preferences below. If you don't know some of them you can use the suggested values to establish a baseline profile.
      </h5>
      <br>
      <b-alert variant="success"
             dismissible
             :show="showUserInfoSuccessAlert"
             @dismissed="showUserInfoSuccessAlert=false">
        You user information was saved succesfully. Please <b-link v-on:click="signOut">sign out</b-link> and sign back in for changes to take effect.
      </b-alert>
      <b-card :bg-variant="theme">
        <b-form-group
                      label-cols-lg="3"
                      label="User Information"
                      label-size="lg"
                      label-class="font-weight-bold pt-0"
                      class="mb-0">
          <b-form-group label-cols-lg="3"
                        label="Display Name:"
                        label-class="text-sm-right"
                        label-for="name">
            <b-form-input id="name" v-on:input="enableSaveUserInfo" v-model.trim="displayName"></b-form-input>
          </b-form-group>
          <b-form-group label-cols-lg="3"
                        label="Email Address:"
                        label-class="text-sm-right"
                        label-for="email">
            <b-form-input id="email" v-on:input="enableSaveUserInfo" type="email" v-model.trim="email"></b-form-input>
          </b-form-group>
          <b-form-group label-cols-lg="3"
                        description="Enter your existing password to save any of the values in this section."
                        label="Current Password:"
                        label-class="text-sm-right"
                        label-for="password">
            <b-form-input id="password" v-on:input="enableSaveUserInfo" type="password" maxLength="25" required v-model.trim="password"></b-form-input>
          </b-form-group>
          <b-form-group label-cols-lg="3"
                        description="Enter your new password in case you want to change it."
                        label="New Password:"
                        label-class="text-sm-right"
                        label-for="password1">
            <b-form-input id="password1" v-on:input="enableSaveUserInfo" type="password" maxLength="25" v-model.trim="password1"></b-form-input>
          </b-form-group>
          <b-form-group label-cols-lg="3"
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
      <b-alert variant="success"
             dismissible
             :show="showUserPrefsSuccessAlert"
             @dismissed="showUserPrefsSuccessAlert=false">
        Your preferences were saved succesfully. Please <b-link v-on:click="signOut">sign out</b-link> and sign back in for changes to take effect.
      </b-alert>
      <b-card :bg-variant="theme">
        <b-form-group label-cols-lg="3"
                      label="Preferences"
                      label-size="lg"
                      label-class="font-weight-bold pt-0"
                      class="mb-0">
            <b-form-group label-cols-lg="3"
                        description="Select your preferred units of measurement type."
                        label="Units of Measurement:"
                        label-class="text-sm-right"
                        class="mb-0">
            <b-form-radio-group class="pt-2" id="units" v-on:change="onUnitsChanged" v-model="units" :options="[{text: 'Imperial', value: 'imperial'}, {text: 'Metric', value: 'metric'}]"
              v-on:input="enableSaveUserPrefs" />
          </b-form-group>
          <b-form-group label-cols-lg="3"
                        :label="'Weight (' + weightUnits + '):'"
                        description="Enter your weight including cycling kit, shoes, helmet etc."
                        label-class="text-sm-right"
                        label-for="weight">
            <b-form-input type="number" min="0" max="300" step="0.1" id="weight" v-model="weight" v-on:input="enableSaveUserPrefs"></b-form-input>
          </b-form-group>
          <b-form-group label-cols-lg="3"
                        description="Enter bike weight as set up for testing, including any accessories such as hydration, flat kit etc.."
                        :label="'Bike Weight (' + weightUnits + '):'"
                        label-class="text-sm-right"
                        label-for="weight">
            <b-form-input type="number" min="0" max="50" step="0.1" id="bikeWeight" v-model="bikeWeight" v-on:input="enableSaveUserPrefs"></b-form-input>
          </b-form-group>
          <b-form-group label-cols-lg="3"
                        label="CdA:"
                        description="Select your default coefficient of drag (CdA) if you know it. Typical values are in the 0.200 - 0.350 range with very fast positions under in the 0.170 - 0.200 range."
                        label-class="text-sm-right"
                        label-for="weight">
            <b-form-input id="cda" v-model="cda" type="number" min="0" max="1" step="0.001" v-on:input="enableSaveUserPrefs"></b-form-input>
          </b-form-group>
          <b-form-group label-cols-lg="3"
                        label="crr:"
                        label-class="text-sm-right"
                        label-for="weight">
            <template slot="description">
              Select your default coefficient of rolling resistance if you know it.
              Typical values are in the 0.003 - 0.008 range depending on road conditions and tires.
              Start with a value of 0.005 for average tires and good quality asphalt. A good set of tire crr roller test data
              can be found <a href='https://docs.google.com/spreadsheets/d/1vTm2AQYKeDuabP8Qiv5_AjatJVNYSY_DRBOeFmO3-_8/edit?usp=sharing' target='_blank'>here</a>.
              When using roller data, it's recommended to adjust crr by a factor of 1.8 for poor quality chipseal,
              1.5 for good asphalt, cement 1.4, unpolished wood velodrome 1.2 and 1.1 for polished wooden velodrome.
            </template>
            <b-form-input id="crr" v-model="crr" type="number" step="0.0001" min="0" max="1" v-on:input="enableSaveUserPrefs"></b-form-input>
          </b-form-group>
          <b-form-group label-cols-lg="3"
                        label="Drivetrain Loss (%):"
                        description="Adjust power numbers down using an estimated drivetrain / friction factor.
                          Typical values are in the 1% - 5% range depending on if a hub or crank based power meter
                          is used, the condition of bearings, chain, type of lubricant used etc."
                        label-class="text-sm-right"
                        label-for="weight">
            <b-form-input id="crr" v-model="dloss" type="number" step="1" min="0" max="5" v-on:input="enableSaveUserPrefs"></b-form-input>
          </b-form-group>
          <b-form-group>
            <div align="right">
              <b-button align="right" variant="primary"
                v-b-tooltip.hover title="Sign out and sign back in for changes to take effect."
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
import Utils from '@/services/utils'

export default {
  name: 'Profile',
  metaInfo: {
    title: 'User Profile'
  },
  components: {
    LoadingButton
  },
  validations: {
    weightUnits: 'kg',
    password: { required, minLength: minLength(6), maxLength: maxLength(25) },
    password1: { minLength: minLength(6), maxLength: maxLength(25) },
    password2: { minLength: minLength(6), maxLength: maxLength(25), sameAsPassword1: sameAs('password1') },
    email: { email, required },
    cda: { between: between(0, 1) },
    crr: { between: between(0, 1) },
    bikeWeight: { between: between(0, 50) },
    weight: { between: between(0, 300) },
    dloss: { between: between(0, 5) }
  },
  props: ['theme'],
  computed: {
    user () {
      return this.$store.getters.getUser
    }
  },
  watch: {
  },
  data () {
    return {
      showUserPrefsSuccessAlert: false,
      showUserInfoSuccessAlert: false,
      weightUnits: 'kg',
      utils: new Utils(),
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
      units: 'metric',
      weight: 0.0,
      bikeWeight: 0.0,
      cda: 0.0,
      crr: 0.0,
      dloss: 1
    }
  },
  created: function () {
    this.fetchData()
  },
  methods: {
    onUnitsChanged: function (value) {
      this.units = value
      if (value === 'imperial') {
        this.weight = this.utils.kgToLbs(this.weight).toFixed(1)
        this.bikeWeight = this.utils.kgToLbs(this.bikeWeight).toFixed(1)
        this.weightUnits = 'lbs'
      } else {
        this.weight = this.utils.lbsToKg(this.weight).toFixed(1)
        this.bikeWeight = this.utils.lbsToKg(this.bikeWeight).toFixed(1)
        this.weightUnits = 'kg'
      }
    },
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
      if (this.user) {
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
          this.dloss = docData.dloss
        }
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

        this.showUserInfoSuccessAlert = true
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
          crr: this.crr,
          dloss: this.dloss
        }
        // make sure we have an activity in firestore before the trigger is fired
        await userPrefs.doc(this.user.uid).set(doc)

        this.saveUserPrefsEnabled = false
        this.saveUserPrefsCaption = 'Saved'
        this.showUserPrefsSuccessAlert = true
      } catch (error) {
        console.log(error)
      }
    },
    signOut: function () {
      this.$emit('signout')
    }
  }
}
</script>
