<template>
  <b-container fluid id="parent">
    <div id="fullscreen_bg" class="fullscreen_bg"/>
    <div class="container" id="Reset">
      <b-row align-v="center">
        <b-col align-self="center" cols="12">
          <b-alert
            variant="danger"
            dismissible
            :show="isError"
            @dismissed="isError=false"
          >{{errorMessage}}
          </b-alert>
          <b-alert
            variant="success"
            dismissible
            :show="isSuccess"
            @dismissed="isSuccess=false"
          >Password reset successfully. Click <b-link v-on:click="signIn">here</b-link> to sign in.
          </b-alert>

          <b-card v-if="isCodeValid" :bg-variant="theme">
            <h2>Set New Password</h2>

            <b-form-group
              horizontal
              :label-cols="4"
              label-size="lg"
              label="Email:"
              label-for="email"
            >
              <b-form-input id="email" type="text" size="lg" v-model="email" readonly></b-form-input>
            </b-form-group>

            <b-form-group
              horizontal
              :label-cols="4"
              label-size="lg"
              label="New Password:"
              label-for="password"
            >
              <b-form-input id="password" type="password" v-on:input="$v.password.$touch()" @keyup.native.enter="setPassword" size="lg" v-model="password"></b-form-input>
              <div v-if="$v.password.$dirty && $v.password.$invalid">
                <br><b-alert show variant="danger">Password is required and must be between 6 and 25 characters.</b-alert>
              </div>
            </b-form-group>

            <b-form-group
              horizontal
              :label-cols="4"
              label-size="lg"
              label="Repeat Password:"
              label-for="repeatPassword"
            >
              <b-form-input id="repeatPassword" type="password" v-on:input="$v.repeatPassword.$touch()" @keyup.native.enter="reset" size="lg" v-model="repeatPassword"></b-form-input>
              <div v-if="$v.repeatPassword.$dirty && $v.repeatPassword.$invalid">
                <br><b-alert show variant="danger">Repeat Password is required and must match Password.</b-alert>
              </div>
            </b-form-group>
            <div>
              <b-row>
                <b-col>
                    <div align='right'><b-button :disabled="$v.$invalid" align='right' size="lg" variant="primary" @click="setPassword">Set Password</b-button></div>
                </b-col>
              </b-row>
            </div>
          </b-card>
        </b-col>
      </b-row>
    </div>
  </b-container>
</template>

<script>
import firebase from 'firebase/app'
import 'firebase/auth'
import { required, minLength, maxLength, sameAs } from 'vuelidate/lib/validators'

export default {
  name: 'reset',
  metaInfo: {
    title: 'Recover Password'
  },
  props: ['theme'],
  validations: {
    password: { required, minLength: minLength(6), maxLength: maxLength(25) },
    repeatPassword: { minLength: minLength(6), maxLength: maxLength(25), sameAs: sameAs('password') }
  },
  data () {
    return {
      email: '',
      password: '',
      repeatPassword: '',
      isError: false,
      errorMessage: '',
      isSuccess: false,
      successMessage: '',
      code: '',
      mode: '',
      isCodeValid: false
    }
  },
  mounted: async function () {
    this.code = this.$route.query.oobCode
    this.mode = this.$route.query.mode

    if (!this.code || this.mode !== 'resetPassword') {
      this.isError = true
      this.errorMessage = 'Invalid parameters.'
      return false
    }

    try {
      this.email = await firebase.auth().verifyPasswordResetCode(this.code)
      this.isCodeValid = true
    } catch (error) {
      this.isError = true
      this.errorMessage = error.message
    }
  },
  methods: {
    signIn: function () {
      this.$router.replace('/login')
    },
    setPassword: async function () {
      try {
        if (this.$v.$invalid || this.isError) {
          return false
        }

        this.isError = false

        // call into firebase auth
        await firebase.auth().confirmPasswordReset(this.code, this.password)
        this.isSuccess = true
      } catch (e) {
        this.isError = true
        this.errorMessage = e.message
      }
    }
  }
}
</script>

<style scoped>
#parent {
  padding: 100px 0;
}
#Reset {
  max-width: 600px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.fullscreen_bg {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-size: cover;
  background-position: 50% 50%;
  background-image: url('/static/images/home/oos-1200px.jpg');
  background-repeat:repeat;
}

.vertical-center {
  min-height: 100%;  /* Fallback for browsers do NOT support vh unit */
  min-height: 100vh; /* These two lines are counted as one :-)       */

  display: flex;
  align-items: center;
}
</style>
