<script setup>
import { computed } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  tutorialId: String,
  tutorials: Array
})

const emit = defineEmits(['close'])

const tutorial = computed(() => {
  return props.tutorials.find(t => t.id === props.tutorialId)
})
</script>

<template>
  <aside 
    class="node-sidebar" 
    :class="{ open: isOpen }" 
    :aria-hidden="!isOpen"
  >
    <header class="sidebar-header" v-if="tutorial">
      <div>
        <p class="eyebrow">{{ tutorial.level || 'Tutorial' }}</p>
        <h2>{{ tutorial.title }}</h2>
      </div>
      <button class="sidebar-close" @click="emit('close')">&times;</button>
    </header>
    
    <div class="sidebar-content" v-if="tutorial">
      <p class="lede">{{ tutorial.summary }}</p>
      
      <div class="tag-row" style="margin: 16px 0;">
        <span v-for="tag in tutorial.tags" :key="tag" class="pill-sm">{{ tag }}</span>
        <span class="pill-sm">{{ tutorial.duration || 'Self-paced' }}</span>
      </div>
      
      <div style="margin-top: 20px;" v-if="tutorial.links && tutorial.links.length">
        <a 
          v-for="(link, idx) in tutorial.links" 
          :key="idx"
          :href="link.url" 
          target="_blank" 
          class="resource-link"
        >
          🔗 {{ link.label || 'Link' }}
        </a>
      </div>
      
      <div v-if="tutorial.highlight" style="margin-top: 20px; padding: 12px; background: #fffdf8; border: 1px solid #eee; border-radius: 8px;">
        <p><strong>Highlight:</strong> {{ tutorial.highlight }}</p>
      </div>
    </div>
  </aside>
</template>
