<template>
  <div id="app" v-bind:style="themeStyle">
    <div class="wrapper">
      <b-navbar toggleable="md" :type="theme" :variant="theme" fixed="top" sticky="false">

        <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>

        <b-navbar-brand href="#/">
            <img class="d-inline-block align-top logo" alt="RhoApp" src="/static/logo.svg"> RhoApp
        </b-navbar-brand>
          

        <b-collapse is-nav id="nav_collapse" v-model="menuCollapsed">
          
          <b-navbar-nav v-if="menuCollapsed">
            <b-nav-item active href="#/"><font-awesome-icon icon="home"/> Home</b-nav-item>
          </b-navbar-nav>
          
          <b-navbar-nav>
            <b-nav-item href="#/about"><font-awesome-icon icon="info-circle"/> About</b-nav-item>
          </b-navbar-nav>
          
          <!-- Right aligned nav items -->
          <b-navbar-nav class="ml-auto">

            <b-nav-form>
              <b-nav-item href="#" v-on:click="toggleTheme()">
                <font-awesome-icon :icon="themeIcon" /> {{themeCaption}}</b-nav-item>
            </b-nav-form>

          </b-navbar-nav>

        </b-collapse>
      </b-navbar>

      <router-view :theme="theme"/>
    </div>

    <footer class="footer"></footer>
    
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      menuCollapsed: false,
      theme: 'dark',
      themeIcon: 'moon',
      themeCaption: 'Go Light',
      themeStyle: {
        backgroundColor: '#313131'
      }
    };
  },
  methods: {
    toggleTheme() {
      if (this.theme === 'dark') {
        this.theme = 'light';
        this.themeIcon = 'moon'
        this.color = '#000000'
        this.themeCaption = 'Go Dark'
        this.themeStyle = {
          color: '#3b3b3b',
          backgroundColor: '#FFFFFF'
        }
      }
      else {
        this.theme = 'dark'
        this.color = '#b1aeae'
        this.themeIcon = 'lightbulb'
        this.themeCaption = 'Go Light'
        this.themeStyle = {
          color: '#b1aeae',
          backgroundColor: '#313131'
        }
      }
    }
  }
};
</script>

<style>

#app .logo {
  height: 32px;
  max-width:64px;
}

#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #b1aeae;
  background-color: #313131;
  display: flex;
  height: 100vh;
  flex-direction: column;
}

#app .wrapper {
  flex: 1 0 auto;
}

#app .footer {
  flex-shrink: 0;
}

</style>

