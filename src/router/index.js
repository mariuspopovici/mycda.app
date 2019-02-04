import Vue from 'vue'
import Router from 'vue-router'
import Upload from '@/components/Upload'
import About from '@/components/About'
import Login from '@/components/Login'
import SignUp from '@/components/SignUp'
// import Home from '@/components/Home'
import Landing from '@/components/Landing'
import Activity from '@/components/Activity'
import CdA from '@/components/CdA'
import Profile from '@/components/Profile'
import RhoCalculator from '@/components/RhoCalculator'
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
      component: Upload,
      meta: {
        requiresAuth: true,
        breadcrumbs: []
      }
    },
    {
      path: '/activities',
      name: 'activity.list',
      component: Upload,
      meta: {
        requiresAuth: true,
        breadcrumbs: [
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
          { name: 'Home', link: 'activity.list' },
          { name: 'Activity Details' }
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
          { name: 'Home', link: 'activity.list' },
          { name: 'Activity Details', link: 'activity.details' },
          { name: 'Analysis' }
        ]
      }
    },
    {
      path: '/activity/:id/cda/:sid',
      name: 'activity.cda.direct',
      component: CdA,
      props: true,
      meta: {
        requiresAuth: true,
        breadcrumbs: [
          { name: 'Home', link: 'activity.list' },
          { name: 'Activity Details', link: 'activity.details' },
          { name: 'Analysis' }
        ]
      }
    },
    {
      path: '/about',
      name: 'About',
      component: About,
      meta: {
        breadcrumbs: []
      }
    },
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: {
        breadcrumbs: []
      }
    },
    {
      path: '/signup',
      name: 'SignUp',
      component: SignUp,
      meta: {
        breadcrumbs: []
      }
    },
    {
      path: '/rho',
      name: 'calculator',
      component: RhoCalculator,
      meta: {
        breadcrumbs: []
      }
    },
    {
      path: '/profile',
      name: 'user.profile',
      component: Profile,
      meta: {
        requiresAuth: true,
        breadcrumbs: [
          { name: 'Home', link: 'home' },
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
