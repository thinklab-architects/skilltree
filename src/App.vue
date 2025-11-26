<script setup>
import { ref, onMounted, computed } from 'vue'
import TheHeader from './components/TheHeader.vue'
import TheMap from './components/TheMap.vue'
import TheSidebar from './components/TheSidebar.vue'

import { fetchAirtableData, isAirtableConfigured } from './services/airtable'

const data = ref({ tracks: [], tutorials: [] })
const filters = ref({ search: '', track: 'all' })
const sidebarId = ref(null)
const isSidebarOpen = ref(false)

const loadData = async () => {
  try {
    if (isAirtableConfigured()) {
      console.log('Fetching from Airtable...')
      data.value = await fetchAirtableData()
    } else {
      console.log('Fetching from local JSON...')
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
    return trackOk && searchOk
  })
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
    <TheHeader />
    
    <main id="mapView">
      <section class="tree-stage">
        <div class="tree-toolbar">
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
        <p class="eyebrow">Deploy</p>
        <p>GitHub Pages: serve the docs folder (includes data/trails.json). Data is managed via Airtable.</p>
      </div>
      <div>
        <p class="eyebrow">Usage</p>
        <p>Team views the live trail.</p>
      </div>
    </footer>
  </div>
</template>

<style>
/* Global styles will be imported in main.js */
</style>
