/**
 * Implements a GPS track loop detection algorithm.
 */
export default class Buffer {
  /**
     * Initializes a new instance.
     * @param {Array} coordinates
     */
  constructor (coordinates) {
    this.coords = coordinates
  }

  /**
     * Extracts loops.
     * @param {Number} precision (3 - neighborhood, street, 4 - individual street, land parcel,  5 - individual trees, door entrance)
     * @param {Number} minLoopDuration in recording rate x # of intervals (seconds).
     * @returns {Object []} an array of loops {coordinates, startIndex in coordinate array, endIndex in coordinate array, distance in coordinate array}.
     */
  findLoops (precision = 4, minLoopDuration = 50) {
    let coordHash = {}
    let loops = []

    this.coords.forEach((element, index) => {
      element.lat = parseFloat(element.lat).toFixed(precision) // trim coordinates in order to make sure that start and end of loop can be identified
      element.lng = parseFloat(element.lng).toFixed(precision) // even if coordinates are a little further apart because of GPS innaccuracy.

      let key = element.lat + element.lng

      if (coordHash[key]) {
        if (coordHash[key].count > 0 && (index - coordHash[key].index > minLoopDuration)) {
          coordHash[key].count++
          loops.push({
            coords: element,
            startIndex: coordHash[key].index,
            endIndex: index,
            distance: index - coordHash[key].index
          })
          // whever we find a loop we reset the coordinates hash
          coordHash = {}
        }
      } else {
        coordHash[key] = {
          count: 1,
          index: index
        }
      }
    })
  }
}
