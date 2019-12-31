import LZString from 'lz-string'

export default class Cache {
  constructor (id, capacity = 10) {
    this._id = id
    this._indexKey = `${this._id}Index`
    this._capacity = capacity
    this._init()
  }

  _init () {
    const cacheIndex = localStorage.getItem(this._indexKey)
    if (cacheIndex) {
      this._cacheIndex = JSON.parse(cacheIndex)
      // enforce capacity
      while (this._cacheIndex.length > this._capacity) {
        const item = this._cacheIndex.shift() // remove the oldest item in cache
        console.debug(`Cache (${this._id}) - removing cached item`, item)
        localStorage.removeItem(item)
      }
    } else {
      this._cacheIndex = []
    }

    localStorage.setItem(this._indexKey, JSON.stringify(this._cacheIndex))
  }

  _clear () {
    while (this._cacheIndex.length > 0) {
      const item = this._cacheIndex.shift() // remove the oldest item in cache
      localStorage.removeItem(item)
    }
    localStorage.setItem(this._indexKey, JSON.stringify(this._cacheIndex))
  }

  add (key, item) {
    if (this._cacheIndex.length === this._capacity) {
      const item = this._cacheIndex.shift() // remove the oldest item in cache
      console.debug(`Cache (${this._id}) - removing cached item`, item)
      localStorage.removeItem(item)
    }

    try {
      localStorage.setItem(key, LZString.compress(JSON.stringify(item)))
      console.debug(`Cache (${this._id}) - adding item to cache`, key)
      this._cacheIndex.push(key)
      localStorage.setItem(this._indexKey, JSON.stringify(this._cacheIndex))
    } catch (e) {
      // probably at quota - let's clear the cache
      this._clear()
    }
  }

  get (key) {
    if (this._cacheIndex.includes(key)) {
      console.debug(`Cache (${this._id}) - retrieving cached item`, key)
      return JSON.parse(LZString.decompress(localStorage.getItem(key)))
    }
  }

  contains (key) {
    return this._cacheIndex.includes(key)
  }
}
