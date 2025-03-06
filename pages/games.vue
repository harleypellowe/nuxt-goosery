<script setup lang="ts">
const { data: games } = await useAsyncData('games', () => queryCollection('games').all())
</script>

<template>
  <section class="section">
    <div v-if="$route.path.endsWith('/games')">
      <h1 class="title">Games</h1>

      <ul>
        <li v-for="game in games" :key="game.id">
          <NuxtLink :to="game.path">{{ game.title }}</NuxtLink>
        </li>
      </ul>
    </div>

    <div v-else>
      <NuxtPage />
    </div>
  </section>
</template>