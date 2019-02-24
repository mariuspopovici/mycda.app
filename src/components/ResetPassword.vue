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
          >{{successMessage}}
          </b-alert>
          <b-card :bg-variant="theme">
            <h2>Reset Password</h2>
            <b-form-group label-cols-sm="4" label-size="lg" label="Email:" label-for="email">
              <b-form-input id="email" size="lg" v-model="email"></b-form-input>
            </b-form-group>
            <b-form-group v-if="emailSent"
              label-cols-sm="4"
              label-size="lg"
              label="New Password:"
              label-for="password"
            >
              <b-form-input id="password" type="password" @keyup.native.enter="reset" size="lg" v-model="password"></b-form-input>
            </b-form-group>
            <div>
              <b-row>
                <b-col>
                    <div v-if="!emailSent" align='right'><b-button align='right' size="lg" variant="primary" @click="sendEmail">Continue</b-button></div>
                    <div v-if="emailSent" align='right'><b-button align='right' size="lg" variant="primary" @click="resetPassword">Set Password</b-button></div>
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

export default {
  name: 'reset',
  metaInfo: {
    title: 'Recover Password'
  },
  props: ['theme'],
  data () {
    return {
      email: '',
      password: '',
      isError: false,
      errorMessage: '',
      isSuccess: false,
      successMessage: '',
      emailSent: false
    }
  },
  methods: {
    sendEmail: async function () {
      try {
        this.isError = false
        await firebase
          .auth()
          .sendPasswordResetEmail(this.email)
        this.successMessage = 'A password reset link was sent to the email address you provided.'
        this.isSuccess = true
      } catch (e) {
        this.isError = true
        this.errorMessage = e.message
      }
    },
    resetPassword: async function () {

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
