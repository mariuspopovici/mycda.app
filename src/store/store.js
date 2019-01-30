import Vue from 'vue'
import Vuex from 'vuex'
import firebase from 'firebase/app'
import 'firebase/auth'
import { db } from '../main'

Vue.use(Vuex)

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
    setUser: async state => {
      state.user = firebase.auth().currentUser
      if (state.user) {
        let prefsDocRef = db.collection('userprefs').doc(state.user.uid)
        let doc = await prefsDocRef.get()
        if (doc.exists) {
          state.userPrefs = doc.data()
        }
      }
    }
  },
  actions: {
    setUser: context => {
      context.commit('setUser')
    }
  }
})
