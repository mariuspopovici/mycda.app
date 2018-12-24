<template>
  <div id="app" v-bind:style="themeStyle">
    <div class="wrapper">
      <b-navbar toggleable="md" :type="theme" :variant="theme" fixed="top" sticky="false">
        <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>

        <b-navbar-brand href="#/">
          <img class="d-inline-block align-top logo" alt="RhoApp" src="./assets/logo.svg">&nbsp;RhoApp
        </b-navbar-brand>

        <b-collapse is-nav id="nav_collapse" v-model="menuCollapsed">
          <b-navbar-nav v-if="menuCollapsed">
            <b-nav-item href="#/">
              <font-awesome-icon icon="home"/>&nbsp;Home
            </b-nav-item>
          </b-navbar-nav>

          <b-navbar-nav>
            <b-nav-item href="#/about">
              <font-awesome-icon icon="info-circle"/>&nbsp;About
            </b-nav-item>
          </b-navbar-nav>

          <!-- Right aligned nav items -->
          <b-navbar-nav class="ml-auto">
            <b-nav-form>
              <b-nav-item href="#" v-on:click="toggleTheme()" id="themeSwitcher">
                <font-awesome-icon :icon="themeIcon"/>
                <span v-if="menuCollapsed">&nbsp;{{themeCaption}}</span>
              </b-nav-item>
              <b-tooltip v-if="!menuCollapsed" target="themeSwitcher" title="Toggle dark theme"></b-tooltip>
            </b-nav-form>
          </b-navbar-nav>
        </b-collapse>
      </b-navbar>
      <router-view :theme="theme"/>
    </div>
  </div>
</template>

<script>
/* eslint-disable */
export default {
  name: "App",
  metaInfo: {
    title: "RhoApp Air Density Calculator ",
    // all titles will be injected into this template
    titleTemplate: "%s | RhoApp Air Density Calculator",
    meta: [
      { "http-equiv": "Content-Type", content: "text/html; charset=utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "description",
        content:
          "RhoApp is an air density calculator using air temperature, dew point and air pressure as inputs. RhoApp is location aware and supports both metric and imperial units"
      },
      {
        name: "author",
        content: "Marius Popovici"
      },
      {
        name: "keywords",
        content:
          "air, density, calculator, rho, chung, virtual, elevation, weather, cycling"
      }
    ]
  },
  data() {
    return {
      menuCollapsed: false,
      theme: "dark",
      themeIcon: "sun",
      themeCaption: "Go Light",
      themeStyle: {
        backgroundColor: "#313131"
      }
    };
  },
  methods: {
    toggleTheme() {
      if (this.theme === "dark") {
        this.theme = "light";
        this.themeIcon = "moon";
        this.color = "#000000";
        this.themeCaption = "Go Dark";
        this.themeStyle = {
          color: "#3b3b3b",
          backgroundColor: "#FFFFFF"
        };
      } else {
        this.theme = "dark";
        this.color = "#b1aeae";
        this.themeIcon = "sun";
        this.themeCaption = "Go Light";
        this.themeStyle = {
          color: "#b1aeae",
          backgroundColor: "#313131"
        };
      }
    }
  }
};
</script>

<style>
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
}
</style>

