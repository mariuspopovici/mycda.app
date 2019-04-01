<template>
  <b-container fluid id="parent">
    <div id="fullscreen_bg" class="fullscreen_bg"/>
    <div class="container" id="Login">
      <b-row align-v="center">
        <b-col align-self="center" cols="12">
          <b-alert
            variant="danger"
            dismissible
            :show="loginError"
            @dismissed="loginError=false"
          >{{loginMessage}}
          </b-alert>
          <b-card :bg-variant="theme">
            <h2>Sign In</h2>
            <b-form-group label-cols-sm="4" label-size="lg" label="Email:" label-for="email">
              <b-form-input id="email" size="lg" v-model="email"></b-form-input>
            </b-form-group>
            <b-form-group
              label-cols-sm="4"
              label-size="lg"
              label="Password:"
              label-for="password"
            >
              <b-form-input id="password" type="password" @keyup.native.enter="login" size="lg" v-model="password"></b-form-input>
            </b-form-group>
            <div>
              <b-row>
                <b-col>Not registered? <router-link to="/signup">Sign up</router-link> now.<p><router-link to="/reset">Trouble signing in?</router-link></p></b-col>
                <b-col>
                  <div align='right'>
                    <b-button align='right' size="lg" variant="primary" @click="login">
                      <b-spinner v-if="waiting" small></b-spinner> Login
                    </b-button>
                  </div>
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
  name: 'login',
  metaInfo: {
    title: 'Login'
  },
  props: ['theme'],
  data () {
    return {
      waiting: false,
      email: '',
      password: '',
      loginError: false,
      loginMessage: ''
    }
  },
  methods: {
    login: async function () {
      try {
        this.waiting = true
        this.loginError = false
        await firebase
          .auth()
          .signInWithEmailAndPassword(this.email, this.password)
        this.waiting = false
        this.$router.replace('home')
      } catch (e) {
        this.waiting = false
        this.loginError = true
        this.loginMessage = e.message
      }
    }
  }
}
</script>

<style scoped>
#parent {
  padding: 100px 0;
}
#Login {
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
