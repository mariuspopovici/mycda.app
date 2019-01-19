import Vue from 'vue'
import Router from 'vue-router'
import RhoCalculator from '@/components/RhoCalculator'
import Upload from '@/components/Upload'
import About from '@/components/About'
import Login from '@/components/Login'
import SignUp from '@/components/SignUp'
import Home from '@/components/Home'
import Landing from '@/components/Landing'
import Activity from '@/components/Activity'

import firebase from 'firebase/app'
import 'firebase/auth'

Vue.config.productionTip = false

Vue.use(Router)

const router = new Router({
  routes: [
    {
      path: '*',
      redirect: '/login'
    },
    {
      path: '/',
      redirect: '/landing'
    },
    {
      path: '/landing',
      name: 'Landing',
      component: Landing,
      meta: {
        requiresAuth: false
      }
    },
    {
      path: '/home',
      name: 'Home',
      component: Home,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/upload',
      name: 'Upload',
      component: Upload,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/activity/:id',
      name: 'Activity',
      component: Activity,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/about',
      name: 'About',
      component: About
    },
    {
      path: '/rho',
      name: 'Rho Calculator',
      component: RhoCalculator
    },
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    {
      path: '/signup',
      name: 'SignUp',
      component: SignUp
    }
  ]
})

router.beforeEach((to, from, next) => {
  const currentUser = firebase.auth().currentUser
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !currentUser) {
    next('login')
  } else {
    next()
  }
})

export default router
