/**
 * Implements a fixed size buffer. Items are removed from the buffer in a FIFO manner when capacity is filled.
 */
export default class Buffer {
  /**
   * Initializes a new buffer with specified capacity
   * @param {Number} capacity
   */
  constructor (capacity = 5) {
    this.capacity = capacity
    this.items = []
  }

  /**
   * Adds a new item to the buffer
   * @param {Number} item
   */
  add (item) {
    if (this.items.length === this.capacity) {
      this.items.shift()
    }
    this.items.push(item)
  }

  average () {
    return this.items.reduce((p, c) => { return p + c }) / this.items.length
  }
}
