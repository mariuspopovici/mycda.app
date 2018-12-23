'use strict'
const merge = require('webpack-merge')
const prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  OW_API_KEY:'"c991696525830c2eebad6b8a47e204eb"'
})
