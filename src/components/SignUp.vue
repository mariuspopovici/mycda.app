<template>
  <div id="parent">
    <div class="container" id="signUp">
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
      <b-form-group horizontal :label-cols="2" label-size="lg" label="Email" label-for="email">
        <b-form-input id="email" size="lg" v-model="email"></b-form-input>
      </b-form-group>
      <b-form-group
        horizontal
        :label-cols="2"
        label-size="lg"
        label="Password"
        label-for="password"
      >
        <b-form-input id="password" type="password" size="lg" v-model="password"></b-form-input>
      </b-form-group>

      <b-button size="lg" variant="primary" @click="signUp">Sign Up</b-button>
      <span>or go back to
        <router-link to="/login">login</router-link>.
      </span>
    </div>
  </div>
</template>

<script>
import firebase from 'firebase/app'
import 'firebase/auth'

export default {
  name: 'signUp',
  metaInfo: {
    title: 'Sign Up'
  },
  data () {
    return {
      email: '',
      password: '',
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
        // clear the form
        this.email = ''
        this.password = ''
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
#signUp {
  max-width: 700px;
}
</style>
