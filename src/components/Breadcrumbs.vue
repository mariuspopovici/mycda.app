<template>
  <div class="container">
    <b-breadcrumb v-if="items.length > 0" id="breadcrumb" :items="items">
    </b-breadcrumb>
  </div>
</template>

<script>
export default {
  name: 'Breadcrumb',
  data () {
    return {
      items: []
    }
  },
  props: {
    theme: { type: String },
    crumbs: { type: Array }
  },
  watch: {
    'crumbs' () {
      this.formatItems()
    }
  },
  mounted () { this.formatItems() },
  methods: {
    formatItems: function () {
      let breadCrumbItems = []
      if (this.crumbs) {
        this.crumbs.forEach((crumb) => {
          breadCrumbItems.push({
            text: crumb.name,
            to: crumb.link ? { name: crumb.link } : undefined,
            active: crumb.link === undefined
          })
        })
      }
      this.items = breadCrumbItems
    }
  }
}
</script>

<style scoped>
  #breadcrumb  {
    background-color: #495057;
  }
</style>
