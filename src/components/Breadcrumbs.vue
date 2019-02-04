<template>
  <div v-if="items.length > 0" class="container-fluid">
    <b-breadcrumb id="breadcrumb" :items="items">
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
    background-color: transparent;
  }
</style>
