import Vue from 'vue'
import Router from 'vue-router'
import Upload from '@/components/Upload'
import About from '@/components/About'
import Login from '@/components/Login'
import SignUp from '@/components/SignUp'
import Landing from '@/components/Landing'
import Activity from '@/components/Activity'
import CdA from '@/components/CdA'
import Profile from '@/components/Profile'
import RhoCalculator from '@/components/RhoCalculator'
import ResetPassword from '@/components/ResetPassword'
import SetPassword from '@/components/SetPassword'
import Privacy from '@/components/Privacy'
import Terms from '@/components/Terms'
import Faq from '@/components/Faq'

import { store } from '../store/store'

Vue.config.productionTip = false

Vue.use(Router)

const router = new Router({
  scrollBehavior (to, from, savedPosition) {
    return { x: 0, y: 0 }
  },
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
      path: '/faq',
      name: 'faq',
      component: Faq,
      meta: {
        requiresAuth: false,
        breadcrumbs: []
      }
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: Privacy,
      meta: {
        requiresAuth: false,
        breadcrumbs: []
      }
    },
    {
      path: '/terms',
      name: 'terms',
      component: Terms,
      meta: {
        requiresAuth: false,
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
      path: '/reset',
      name: 'reset.password',
      component: ResetPassword,
      meta: {
        breadcrumbs: []
      }
    },
    {
      path: '/auth/action',
      name: 'set.password',
      component: SetPassword,
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
  const currentUser = store.getters.getUser
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !currentUser) {
    next('login')
  } else {
    next()
  }
})

export default router
