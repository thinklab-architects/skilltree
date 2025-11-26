<script setup>
import { ref, onMounted, computed } from 'vue'
import TheHeader from './components/TheHeader.vue'
import TheMap from './components/TheMap.vue'
import TheSidebar from './components/TheSidebar.vue'

import { fetchAirtableData, isAirtableConfigured } from './services/airtable'

const data = ref({ tracks: [], tutorials: [] })
const filters = ref({ 
  search: '', 
  track: 'all',
  selectedLevels: [],
  selectedTags: []
})
const sidebarId = ref(null)
const isSidebarOpen = ref(false)
const isFilterPanelOpen = ref(false)
const dataSource = ref('Loading...')
const viewMode = ref('map') // 'map' or 'list'

const loadData = async () => {
  try {
    if (isAirtableConfigured()) {
      console.log('Fetching from Airtable...')
      dataSource.value = 'Source: Airtable'
      data.value = await fetchAirtableData()
    } else {
      console.log('Fetching from local JSON...')
      dataSource.value = 'Source: Local JSON'
      const dataUrl = window.location.protocol === 'file:' || window.location.hostname.includes('github.io')
        ? 'data/trails.json'
        : '/api/trails'
      const res = await fetch(dataUrl)
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      data.value = await res.json()
    }
  } catch (err) {
    console.error('Failed to load trails data', err)
  }
}

const filteredTutorials = computed(() => {
  const term = filters.value.search.toLowerCase()
  return data.value.tutorials.filter(t => {
    const trackOk = filters.value.track === 'all' || t.trackId === filters.value.track
    const text = `${t.title} ${t.summary} ${(t.tags || []).join(' ')} ${t.owner || ''}`.toLowerCase()
    const searchOk = !term || text.includes(term)
    
    // Level filter
    const levelOk = filters.value.selectedLevels.length === 0 || 
                    filters.value.selectedLevels.includes(t.level)
    
    // Tags filter
    const tagsOk = filters.value.selectedTags.length === 0 || 
                   (t.tags && t.tags.some(tag => filters.value.selectedTags.includes(tag)))
    
    return trackOk && searchOk && levelOk && tagsOk
  })
})

// Get unique levels and tags
const availableLevels = computed(() => {
  const levels = new Set()
  data.value.tutorials.forEach(t => {
    if (t.level) levels.add(t.level)
  })
  return Array.from(levels).sort()
})

const availableTags = computed(() => {
  const tags = new Set()
  data.value.tutorials.forEach(t => {
    if (t.tags) t.tags.forEach(tag => tags.add(tag))
  })
  return Array.from(tags).sort()
})

const openSidebar = (id) => {
  sidebarId.value = id
  isSidebarOpen.value = true
}

const closeSidebar = () => {
  isSidebarOpen.value = false
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="tree-app">
    <TheHeader>
      <template #actions>
        <div class="header-search" v-if="viewMode === 'map'">
          <input type="search" v-model="filters.search" placeholder="Search...">
        </div>
        <button 
          v-if="viewMode === 'map'" 
          class="pill ghost filter-toggle-btn"
          @click="isFilterPanelOpen = !isFilterPanelOpen"
        >
          <span>🔍 Filters</span>
          <span v-if="filters.selectedLevels.length + filters.selectedTags.length > 0" class="filter-badge">
            {{ filters.selectedLevels.length + filters.selectedTags.length }}
          </span>
        </button>
        <div class="view-toggle">
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'map' }"
            @click="viewMode = 'map'; filters.track = 'all'"
          >Map View</button>
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
          >List View</button>
        </div>
      </template>
    </TheHeader>
    
    <!-- Filter Panel -->
    <div v-if="isFilterPanelOpen && viewMode === 'map'" class="filter-panel-overlay" @click="isFilterPanelOpen = false">
      <div class="filter-panel" @click.stop>
        <div class="filter-panel-header">
          <h3>Filters</h3>
          <button class="close-btn" @click="isFilterPanelOpen = false">✕</button>
        </div>
        
        <div class="filter-section">
          <h4>Level</h4>
          <div class="filter-options">
            <label v-for="level in availableLevels" :key="level" class="filter-checkbox">
              <input 
                type="checkbox" 
                :value="level" 
                v-model="filters.selectedLevels"
              >
              <span>{{ level }}</span>
            </label>
          </div>
        </div>
        
        <div class="filter-section">
          <h4>Tags</h4>
          <div class="filter-options">
            <label v-for="tag in availableTags" :key="tag" class="filter-checkbox">
              <input 
                type="checkbox" 
                :value="tag" 
                v-model="filters.selectedTags"
              >
              <span>{{ tag }}</span>
            </label>
          </div>
        </div>
        
        <div class="filter-panel-footer">
          <button 
            class="pill ghost" 
            @click="filters.selectedLevels = []; filters.selectedTags = []"
          >Clear All</button>
        </div>
      </div>
    </div>
    
    <main id="main-view" :class="{ 'full-screen': viewMode === 'map' }">
      <section v-if="viewMode === 'map'" class="tree-stage">
        <div class="tree-toolbar">
          <!-- Toolbar content if needed -->
        </div>
        
        <TheMap 
          :tracks="data.tracks" 
          :tutorials="data.tutorials" 
          :filtered-tutorials="filteredTutorials"
          @node-click="openSidebar"
        />
      </section>

      <section class="filters">
        <div class="filter-row">
          <div class="filter-group">
            <label class="hint">Search</label>
            <input type="search" v-model="filters.search" placeholder="Search tutorials, tags, or owners">
          </div>

          <div class="filter-group">
            <label class="hint">Tracks</label>
            <div class="chip-row">
              <button 
                class="chip" 
                :class="{ active: filters.track === 'all' }" 
                @click="filters.track = 'all'"
              >All tracks</button>
              <button 
                v-for="track in data.tracks" 
                :key="track.id"
                class="chip"
                :class="{ active: filters.track === track.id }"
                :style="filters.track === track.id ? { borderColor: track.color, color: track.color } : {}"
                @click="filters.track = track.id"
              >
                {{ track.title }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="viewMode === 'list'" class="list-view">
        <div class="container">
          <h2>All Tutorials</h2>
          <div class="tutorial-grid">
            <div 
              v-for="tutorial in filteredTutorials" 
              :key="tutorial.id" 
              class="tutorial-card"
              @click="openSidebar(tutorial.id)"
            >
              <h3>{{ tutorial.title }}</h3>
              <p class="meta">{{ tutorial.level }} · {{ tutorial.duration }}</p>
              <p class="summary">{{ tutorial.summary }}</p>
              <div class="tags">
                <span v-for="tag in tutorial.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>


      
      <section class="track-grid">
        <!-- Track grid content if needed, currently empty in original app.js logic for viewer -->
      </section>
    </main>

    <TheSidebar 
      :is-open="isSidebarOpen" 
      :tutorial-id="sidebarId" 
      :tutorials="data.tutorials"
      @close="closeSidebar"
    />
    
    <footer class="footer">
      <div>
        <a href="https://www.tlabarc.com/" target="_blank" rel="noopener noreferrer">THINKLAB ARCHITECT 之物建築</a>
        <span style="font-size: 0.8em; opacity: 0.5; margin-left: 10px;">
          ({{ dataSource }})
        </span>
      </div>
    </footer>
  </div>
</template>

<style>
/* Global styles will be imported in main.js */
</style>
