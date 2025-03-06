import { defineContentConfig, defineCollection } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      // source: '**/*.md'
      source: {
        include: '**/*.md',
        exclude: ['games/**/*.md']
      }
    }),
    games: defineCollection({
      type: 'page',
      source: 'games/**/*.md'
    })
  }
})
