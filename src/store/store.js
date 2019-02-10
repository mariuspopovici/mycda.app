import Vue from 'vue'
import Vuex from 'vuex'

import 'firebase/auth'
import { db } from '../main'

Vue.use(Vuex)

/**
 * Singleton. Holds and manager user object and user
 * preferences and makes them available wherever needed in the application.
 */
export const store = new Vuex.Store({
  state: {
    user: null,
    userPrefs: null
  },
  getters: {
    getUser: state => {
      return state.user
    },
    getUserPrefs: state => {
      return state.userPrefs
    }
  },
  mutations: {
    setUser (state, user) {
      state.user = user
    },
    setUserPrefs (state, userPrefs) {
      state.userPrefs = userPrefs
    }
  },
  actions: {
    setUser: (context, user) => {
      context.commit('setUser', user)
      if (user) {
        let prefsDocRef = db.collection('userprefs').doc(user.uid)
        prefsDocRef.get().then((doc) => {
          if (doc.exists) {
            let userPrefs = doc.data()
            context.commit('setUserPrefs', userPrefs)
          }
        }).catch((error) => {
          console.log(error)
        })
      }
    }
  }
})
