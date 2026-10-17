/* eslint-disable @typescript-eslint/no-explicit-any */
// Untyped legacy Vue-app services, imported only by the parity tests.
declare module '*/src/services/ve.js' {
  const VirtualElevation: any
  export default VirtualElevation
}
declare module '*/src/services/windmodel.js' {
  const WindModel: any
  export default WindModel
}
declare module '*/src/services/loopdetect.js' {
  const LoopFinder: any
  export default LoopFinder
}
declare module '*/src/services/buffer.js' {
  const Buffer: any
  export default Buffer
}
declare module '*/src/services/utils.js' {
  const Utils: any
  export default Utils
}
