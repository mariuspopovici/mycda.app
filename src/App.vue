<template>
  <div id="app" v-bind:style="themeStyle">
    <div class="wrapper">
      <b-navbar id="nav" toggleable="md" :type="theme" :variant="theme" :fixed="'top'" :sticky="false">
        <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>

        <b-navbar-brand href="#/">
          <img class="d-inline-block align-top logo" alt="MyCdA.App Beta" src="./assets/logo.svg">&nbsp;MyCdA.App Beta
        </b-navbar-brand>

        <b-collapse is-nav id="nav_collapse" v-model="menuCollapsed">
          <b-navbar-nav v-if="menuCollapsed">
            <b-nav-item href="#/home">
              <font-awesome-icon icon="home"/>&nbsp;Home
            </b-nav-item>
          </b-navbar-nav>

          <b-navbar-nav>
            <b-nav-item href="#/home">&nbsp;Home</b-nav-item>
          </b-navbar-nav>

          <b-navbar-nav>
            <b-nav-item href="#/about">
              <font-awesome-icon icon="info-circle"/>&nbsp;About
            </b-nav-item>
          </b-navbar-nav>

          <!-- Right aligned nav items -->
          <b-navbar-nav class="ml-auto">
            <b-nav-form>
              <b-navbar-nav>
                <b-nav-item-dropdown v-if="user" id="navUserOptionsDD"
                  text="<i class='fa fa-user'></i>"
                  extra-toggle-classes="nav-link-custom" right>
                  <b-dropdown-header>{{user.displayName ? user.displayName : 'User Options'}}</b-dropdown-header>
                  <b-dropdown-item :to="{name: 'user.profile'}" >My Profile</b-dropdown-item>
                  <b-dropdown-item v-on:click="signOut"><font-awesome-icon icon="sign-out-alt"/>&nbsp;Sign Out</b-dropdown-item>
                </b-nav-item-dropdown>
              </b-navbar-nav>
            </b-nav-form>
            <b-nav-form>
              <b-navbar-nav>
                <b-nav-item href="#" v-on:click="toggleTheme()" id="themeSwitcher">
                  <font-awesome-icon :icon="themeIcon"/>
                  <span v-if="menuCollapsed">&nbsp;{{themeCaption}}</span>
                </b-nav-item>
                <b-tooltip v-if="!menuCollapsed" target="themeSwitcher" title="Toggle dark theme"></b-tooltip>
              </b-navbar-nav>
            </b-nav-form>
          </b-navbar-nav>
        </b-collapse>
      </b-navbar>
      <div id="component">
        <breadcrumbs :theme="theme" :crumbs="breadcrumbs"/>
        <router-view :theme="theme"/>
      </div>
    </div>
    <!-- Footer -->
    <footer class="footer">
      <div class="container-fluid">
        <div class="row">
          <div class="col-lg-6 h-100 text-center text-lg-left my-auto">
            <ul class="list-inline mb-2">
              <li class="list-inline-item">
                <a href="#/about">About</a>
              </li>
              <li class="list-inline-item">&sdot;</li>
              <li class="list-inline-item">
                <a href="#">Contact</a>
              </li>
              <!--
              <li class="list-inline-item">&sdot;</li>
              <li class="list-inline-item">
                <a href="#">Terms of Use</a>
              </li>
              <li class="list-inline-item">&sdot;</li>
              <li class="list-inline-item">
                <a href="#">Privacy Policy</a>
              </li> -->
            </ul>
            <p class="text-muted small mb-4 mb-lg-0">&copy; MyCDA 2019. All Rights Reserved. Build {{appVersion}}</p>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import firebase from 'firebase/app'
import 'firebase/auth'
import breadcrumbs from '@/components/Breadcrumbs'
import { version } from '../package.json'

export default {
  name: 'App',
  created: function () {
    this.setUser()
  },
  metaInfo: {
    title:
      'MyCdA.app Field testing estimate of CdA (Coefficient of Drag x Frontal Area)',
    // all titles will be injected into this template
    titleTemplate: '%s | MyCdA.app',
    meta: [
      { 'http-equiv': 'Content-Type', content: 'text/html; charset=utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        name: 'description',
        content:
          'MyCdA.app is a field testing data analysis tool used to assist in estimating cycling CdA ((Coefficient of Drag x Frontal Area)) based on power, velocity and air density data'
      },
      {
        name: 'author',
        content: 'Marius Popovici'
      },
      {
        name: 'keywords',
        content:
          'coefficient of drag, virtual elevation, field testing, air, density, calculator, rho, chung, virtual, elevation, weather, cycling'
      }
    ]
  },
  data () {
    return {
      menuCollapsed: false,
      theme: 'dark',
      themeIcon: 'sun',
      themeCaption: 'Go Light',
      themeStyle: {
        backgroundColor: '#313131'
      },
      breadcrumbs: null,
      appVersion: version
    }
  },
  watch: {
    '$route' () {
      this.breadcrumbs = this.$route.meta.breadcrumbs
    }
  },
  computed: {
    user () {
      return this.$store.getters.getUser
    }
  },
  methods: {
    setUser: function () {
      this.$store.dispatch('setUser')
    },
    async signOut () {
      await firebase.auth().signOut()
      this.setUser()
      this.$router.replace('/login')
    },
    toggleTheme () {
      if (this.theme === 'dark') {
        this.theme = 'light'
        this.themeIcon = 'moon'
        this.color = '#000000'
        this.themeCaption = 'Go Dark'
        this.themeStyle = {
          color: '#3b3b3b',
          backgroundColor: '#FFFFFF'
        }
      } else {
        this.theme = 'dark'
        this.color = '#b1aeae'
        this.themeIcon = 'sun'
        this.themeCaption = 'Go Light'
        this.themeStyle = {
          color: '#b1aeae',
          backgroundColor: '#313131'
        }
      }
    }
  },
  components: {
    breadcrumbs
  }
}
</script>

<style>
@import url("https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css");
@import url('https://fonts.googleapis.com/css?family=Roboto');
#app .logo {
  height: 32px;
  max-width: 64px;
}

#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #b1aeae;
  background-color: #313131;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  overflow-x: hidden;
}

#component {
  margin-top: 70px;
  margin-bottom: 20px;
}
</style>

<style lang="scss">
@import './assets/scss/bootstrap-custom.scss';
</style>
