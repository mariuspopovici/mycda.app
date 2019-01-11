// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from "vue";
import App from "./App";
import router from "./router";
import BootstrapVue from "bootstrap-vue";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import Meta from "vue-meta";
import "vue2-dropzone/dist/vue2Dropzone.css";

import { library } from "@fortawesome/fontawesome-svg-core";
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
  faTrash
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import Vuelidate from "vuelidate";

library.add(faWind);
library.add(faLocationArrow);
library.add(faHome);
library.add(faEnvelope);
library.add(faMoon);
library.add(faInfoCircle);
library.add(faLightbulb);
library.add(faCheck);
library.add(faSun);
library.add(faTrash);

Vue.component("font-awesome-icon", FontAwesomeIcon);

Vue.config.productionTip = false;

Vue.use(Vuelidate);
Vue.use(BootstrapVue);
Vue.use(Meta);

/* eslint-disable no-new */
new Vue({
  el: "#app",
  router,
  components: { App },
  template: "<App/>"
});
