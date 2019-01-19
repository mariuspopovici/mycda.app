// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import Meta from 'vue-meta'
import 'vue2-dropzone/dist/vue2Dropzone.css'
import firebase from 'firebase/app'
import 'firebase/firestore'
import 'firebase/auth'
import VueGoogleCharts from 'vue-google-charts'

import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faLocationArrow,
  faCheck,
  faWind,
  faHome,
  faSun,
  faEnvelope,
  faMoon,
  faInfoCircle,
  faLightbulb,
  faTrash,
  faSpinner,
  faSignOutAlt,
  faCloud
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import Vuelidate from 'vuelidate'

library.add(faWind)
library.add(faLocationArrow)
library.add(faHome)
library.add(faEnvelope)
library.add(faMoon)
library.add(faInfoCircle)
library.add(faLightbulb)
library.add(faCheck)
library.add(faSun)
library.add(faTrash)
library.add(faSpinner)
library.add(faSignOutAlt)
library.add(faCloud)

Vue.component('font-awesome-icon', FontAwesomeIcon)

Vue.config.productionTip = false

const firebaseConfig = {
  apiKey: process.env.FB_API_KEY,
  authDomain: process.env.FB_AUTH_DOMAIN,
  databaseURL: process.env.FB_DATABASE_URL,
  projectId: process.env.FB_PROJECT_ID,
  storageBucket: process.env.FB_STORAGE_BUCKET,
  messagingSenderId: process.envFB_MSG_SENDER_ID
}

let app = ''

firebase.initializeApp(firebaseConfig)

export const db = firebase.firestore()
const settings = { timestampsInSnapshots: true }
db.settings(settings)

firebase.auth().onAuthStateChanged(() => {
  // init app when the firebase auth object is ready
  if (!app) {
    /* eslint-disable no-new */
    app = new Vue({
      el: '#app',
      template: '<App/>',
      components: { App },
      router
    })
  }
})

Vue.use(Vuelidate)
Vue.use(BootstrapVue)
Vue.use(VueGoogleCharts)
Vue.use(Meta)
