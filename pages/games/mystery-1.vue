<script setup>
import { onMounted } from 'vue'
import { mountSquiffyIframe } from '#imports'


onMounted(() => {
  mountSquiffyIframe()
})
</script>

<template>
  <iframe id="squiffy-iframe" src="/squiffy/mystery-1/index.html" />
</template>

<style scoped>
iframe {
  width: 100%;
  border: none;
}
</style>