<script setup>
import { onMounted } from 'vue'
import { mountSquiffyIframe } from '#imports'


onMounted(() => {
  mountSquiffyIframe()
})
</script>

<template>
  <iframe id="squiffy-iframe" src="/squiffy/mystery-1/index.html" width="100%" height="100%" />
</template>