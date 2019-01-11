import Vue from "vue";
import Router from "vue-router";
import RhoCalculator from "@/components/RhoCalculator";
import Upload from "@/components/Upload";
import About from "@/components/About";

Vue.config.productionTip = false;

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/",
      name: "Upload",
      component: Upload
    },
    {
      path: "/upload",
      name: "Upload",
      component: Upload
    },
    {
      path: "/about",
      name: "About",
      component: About
    },
    {
      path: "/rho",
      name: "Rho Calculator",
      component: RhoCalculator
    }
  ]
});
