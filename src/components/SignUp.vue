<template>
  <b-container fluid id="parent">
    <div id="fullscreen_bg" class="fullscreen_bg"/>
    <div class="container" id="signup">
      <b-card :bg-variant="theme">
        <h2>Sign Up</h2>
        <b-alert
          variant="danger"
          dismissible
          :show="signUpError"
          @dismissed="signUpError=false"
        >{{signUpMessage}}</b-alert>
        <b-alert
          variant="success"
          dismissible
          :show="signUpSuccess"
          @dismissed="signUpSuccess=false"
        >{{signUpMessage}}</b-alert>
        <b-form-group horizontal :label-cols="4" label-size="lg" label="Email:" label-for="email">
          <b-form-input v-on:input="$v.email.$touch()" id="email" size="lg" v-model="email"></b-form-input>
          <div v-if="$v.email.$dirty && $v.email.$invalid">
          <br><b-alert show variant="danger">Email is required and must be a valid email address.</b-alert>
          </div>
        </b-form-group>
        <b-form-group
          horizontal
          :label-cols="4"
          label-size="lg"
          label="Password:"
          label-for="password"
        >
          <b-form-input id="password" v-on:input="$v.password.$touch()" type="password" size="lg" v-model="password"></b-form-input>
          <div v-if="$v.password.$dirty && $v.password.$invalid">
          <br><b-alert show variant="danger">Password is required and must be between 6 and 25 characters.</b-alert>
          </div>
        </b-form-group>
        <b-form-group
          horizontal
          :label-cols="4"
          label-size="lg"
          label="Repeat Password:"
          label-for="password2"
        >
          <b-form-input id="password2" v-on:input="$v.password2.$touch()" type="password" size="lg" v-model="password2"></b-form-input>
          <div v-if="$v.password2.$dirty && $v.password2.$invalid">
            <br><b-alert show variant="danger">Repeat Password is required and must match Password.</b-alert>
          </div>
        </b-form-group>
        <div align="left">
          <b-button size="lg" :disabled="$v.$invalid" variant="success" @click="signUp">Sign Up</b-button>
          <span>or go back to
            <router-link to="/login">Login</router-link>.
          </span>
        </div>
      </b-card>
    </div>
  </b-container>
</template>

<script>
import firebase from 'firebase/app'
import 'firebase/auth'
import { required, email, minLength, maxLength, sameAs } from 'vuelidate/lib/validators'
export default {
  name: 'signUp',
  metaInfo: {
    title: 'Sign Up'
  },
  props: ['theme'],
  validations: {
    password: { required, minLength: minLength(6), maxLength: maxLength(25) },
    password2: { minLength: minLength(6), maxLength: maxLength(25), sameAs: sameAs('password') },
    email: { email, required }
  },
  data () {
    return {
      email: '',
      password: '',
      password2: '',
      signUpError: false,
      signUpMessage: '',
      signUpSuccess: false
    }
  },
  methods: {
    signUp: async function () {
      try {
        await firebase
          .auth()
          .createUserWithEmailAndPassword(this.email, this.password)
        this.signUpMessage = 'Your account has been created.'
        this.signUpError = false
        this.signUpSuccess = true
        this.$router.replace('profile')
      } catch (e) {
        this.signUpMessage = e.message
        this.signUpError = true
      }
    }
  }
}
</script>

<style scoped>
#parent {
  padding: 100px 0;
}
#signup {
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
  background-image: url('/static/images/home/tt-1200px.jpg');
  background-repeat:repeat;
}

.vertical-center {
  min-height: 100%;  /* Fallback for browsers do NOT support vh unit */
  min-height: 100vh; /* These two lines are counted as one :-)       */

  display: flex;
  align-items: center;
}
</style>
