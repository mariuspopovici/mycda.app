import Vue from 'vue'
import Router from 'vue-router'
import RhoCalculator from '@/components/RhoCalculator'
import About from '@/components/About'

Vue.config.productionTip = false

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Calculator',
      component: RhoCalculator
    },
    {
      path: '/about',
      name: 'About',
      component: About
    }
  ]
})
