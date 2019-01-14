<template>
  <div id="parent">
    <div class="container" id="Login">
      <h2>Sign In</h2>
      <b-alert
        variant="danger"
        dismissible
        :show="loginError"
        @dismissed="loginError=false"
      >{{loginMessage}}</b-alert>
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

      <b-button size="lg" variant="primary" @click="login">Login</b-button>

      <br>
      <br>
      <p>You don't have an account? You can
        <router-link to="/signup">create one</router-link>.
      </p>
    </div>
  </div>
</template>

<script>
import firebase from "firebase";

export default {
  name: "login",
  data() {
    return {
      email: "",
      password: "",
      loginError: false,
      loginMessage: ""
    };
  },
  methods: {
    login: async function() {
      try {
        this.loginError = false;
        await firebase
          .auth()
          .signInWithEmailAndPassword(this.email, this.password);
        this.$router.replace("home");
      } catch (e) {
        this.loginError = true;
        this.loginMessage = e.message;
      }
    }
  }
};
</script>

<style scoped>
#parent {
  padding: 100px 0;
}
</style>
