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
import CdA from '@/components/CdA'
import Profile from '@/components/Profile'
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
      name: 'landing',
      component: Landing,
      meta: {
        requiresAuth: false,
        breadcrumbs: []
      }
    },
    {
      path: '/home',
      name: 'home',
      component: Home,
      meta: {
        requiresAuth: true,
        breadcrumbs: [
          { name: 'Home' }
        ]
      }
    },
    {
      path: '/activities',
      name: 'activity.list',
      component: Upload,
      meta: {
        requiresAuth: true,
        breadcrumbs: [
          { name: 'Home', link: 'home' },
          { name: 'Activities' }
        ]
      }
    },
    {
      path: '/activity/:id',
      name: 'activity.details',
      props: true,
      component: Activity,
      meta: {
        requiresAuth: true,
        breadcrumbs: [
          { name: 'Activities', link: 'activity.list' },
          { name: 'Details' }
        ]
      }
    },
    {
      path: '/activity/:id/cda',
      name: 'activity.cda',
      component: CdA,
      props: true,
      meta: {
        requiresAuth: true,
        breadcrumbs: [
          { name: 'Activity', link: 'activity.details' },
          { name: 'Analysis' }
        ]
      }
    },
    {
      path: '/about',
      name: 'About',
      component: About,
      meta: {
        breadcrumbs: [
          { name: 'About' }
        ]
      }
    },
    {
      path: '/rho',
      name: 'Rho Calculator',
      component: RhoCalculator,
      meta: {
        breadcrumbs: [
          { name: 'Air Density Calculator' }
        ]
      }
    },
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: {
        breadcrumbs: [
          { name: 'Log In' }
        ]
      }
    },
    {
      path: '/signup',
      name: 'SignUp',
      component: SignUp,
      meta: {
        breadcrumbs: [
          { name: 'Sign Up' }
        ]
      }
    },
    {
      path: '/profile',
      name: 'user.profile',
      component: Profile,
      meta: {
        requiresAuth: true,
        breadcrumbs: [
          { name: 'User Profile' }
        ]
      }
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
