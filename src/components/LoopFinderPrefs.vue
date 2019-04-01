<template>
  <div id='Preferences'>
    <b-form-group label="Precision" id='precisionGroup'>
      <b-form-radio value="low" v-model="prec" name="precision">Low</b-form-radio>
      <b-form-radio value="medium" v-model="prec" name="precision">Medium</b-form-radio>
      <b-form-radio value="high" v-model="prec" name="precision">High</b-form-radio>
    </b-form-group>
    <b-form-group>
      <template slot="label">
      Min. Loop Duration: {{min}}(s)
      </template>
      <b-form-input id="range-min" v-model="min" type="range" min="30" step=5 max="3600"></b-form-input>
    </b-form-group>
    <b-form-group>
      <template slot="label">
      Max. Loop Duration: {{max}}(s)
      </template>
      <b-form-input id="range-max" v-model="max" type="range" min="30" step=5 max="3600"></b-form-input>
    </b-form-group>
    <b-form-group>
      <b-button v-on:click="onApply" variant="primary">Apply</b-button>
    </b-form-group>
  </div>
</template>

<script>
export default {
  name: 'LoopFinderPrefs',
  data () {
    return {
      min: 0,
      max: 0,
      prec: ''
    }
  },
  props: {
    theme: { type: String },
    precision: { type: String },
    minDuration: { type: Number },
    maxDuration: { type: Number }
  },
  watch: {
  },
  mounted () {
    this.min = parseInt(this.minDuration)
    this.max = parseInt(this.maxDuration)
    this.prec = this.precision
  },
  methods: {
    onApply: function () {
      this.$emit('change', {
        precision: this.prec,
        minDuration: parseInt(this.min),
        maxDuration: parseInt(this.max)
      })
    }
  }
}
</script>
