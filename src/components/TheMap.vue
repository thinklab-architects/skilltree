<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const props = defineProps({
  tracks: Array,
  tutorials: Array,
  filteredTutorials: Array
})

const emit = defineEmits(['node-click'])

const viewport = ref(null)
const width = 2000
const height = 2000
const center = { x: width / 2, y: height / 2 }

const panState = ref({ x: 0, y: 0, scale: 1, isDragging: false, startX: 0, startY: 0 })

// Calculate node positions
const nodes = computed(() => {
  const result = []
  // Root node
  result.push({ 
    id: 'root', 
    title: 'THINKLAB SKILLTREE', 
    subtitle: 'Start here', 
    x: center.x, 
    y: center.y, 
    type: 'root',
    visible: true
  })

  const angleStep = (Math.PI * 2) / Math.max(props.tracks.length, 1)
  const trackRadius = 250 // Distance of Track nodes from center
  const tutorialStartRadius = 400 // Distance of first tutorial from center
  const tutorialStep = 180 // Distance between tutorials

  props.tracks.forEach((track, idx) => {
    const angle = angleStep * idx - Math.PI / 2
    
    // Track Node
    const trackX = center.x + Math.cos(angle) * trackRadius
    const trackY = center.y + Math.sin(angle) * trackRadius
    
    result.push({
      id: `track-${track.id}`,
      title: track.title,
      x: trackX,
      y: trackY,
      type: 'track',
      color: track.color,
      visible: true,
      isRoot: false // It's not THE root, but it's a hub
    })

    // Tutorial Nodes
    const modules = props.tutorials.filter(t => t.trackId === track.id)
    modules.forEach((module, modIdx) => {
      const radius = tutorialStartRadius + tutorialStep * modIdx
      const x = center.x + Math.cos(angle) * radius
      const y = center.y + Math.sin(angle) * radius
      
      const isVisible = props.filteredTutorials.some(t => t.id === module.id)
      
      result.push({
        ...module,
        x,
        y,
        type: 'tutorial',
        visible: isVisible
      })
    })
  })
  return result
})

const connectors = computed(() => {
  const result = []
  const angleStep = (Math.PI * 2) / Math.max(props.tracks.length, 1)
  const trackRadius = 250
  const tutorialStartRadius = 400
  const tutorialStep = 180

  props.tracks.forEach((track, idx) => {
    const angle = angleStep * idx - Math.PI / 2
    
    // 1. Root to Track
    const trackX = center.x + Math.cos(angle) * trackRadius
    const trackY = center.y + Math.sin(angle) * trackRadius
    
    result.push({
      x1: center.x,
      y1: center.y,
      x2: trackX,
      y2: trackY,
      color: track.color || '#ccc',
      type: 'root-track'
    })

    // 2. Track to Tutorials
    const modules = props.tutorials.filter(t => t.trackId === track.id)
    if (!modules.length) return

    modules.forEach((module, modIdx) => {
      const radius = tutorialStartRadius + tutorialStep * modIdx
      const x = center.x + Math.cos(angle) * radius
      const y = center.y + Math.sin(angle) * radius
      
      let prevX, prevY
      if (modIdx === 0) {
        // Connect to Track Node
        prevX = trackX
        prevY = trackY
      } else {
        // Connect to previous tutorial
        const prevRadius = tutorialStartRadius + tutorialStep * (modIdx - 1)
        prevX = center.x + Math.cos(angle) * prevRadius
        prevY = center.y + Math.sin(angle) * prevRadius
      }
      
      result.push({
        x1: prevX,
        y1: prevY,
        x2: x,
        y2: y,
        color: track.color || '#ffb347',
        type: 'tutorial-link'
      })
    })
  })
  return result
})

const transformStyle = computed(() => {
  return {
    transform: `translate(${panState.value.x}px, ${panState.value.y}px) scale(${panState.value.scale})`
  }
})

const lineStyle = computed(() => {
  return {
    ...transformStyle.value,
    strokeWidth: `${2 / panState.value.scale}px`
  }
})

const handleWheel = (e) => {
  e.preventDefault()
  const zoomSpeed = 0.001
  const newScale = Math.min(Math.max(0.2, panState.value.scale - e.deltaY * zoomSpeed), 3)
  
  const rect = viewport.value.getBoundingClientRect()
  // Zoom towards center of viewport, not mouse position
  const mouseX = rect.width / 2
  const mouseY = rect.height / 2
  
  const scaleRatio = newScale / panState.value.scale
  
  panState.value.x = mouseX - (mouseX - panState.value.x) * scaleRatio
  panState.value.y = mouseY - (mouseY - panState.value.y) * scaleRatio
  panState.value.scale = newScale
}

const startPan = (e) => {
  if (e.target.closest('.tree-node')) return
  panState.value.isDragging = true
  panState.value.startX = e.clientX - panState.value.x
  panState.value.startY = e.clientY - panState.value.y
  viewport.value.setPointerCapture(e.pointerId)
}

const doPan = (e) => {
  if (!panState.value.isDragging) return
  panState.value.x = e.clientX - panState.value.startX
  panState.value.y = e.clientY - panState.value.startY
}

const endPan = (e) => {
  panState.value.isDragging = false
  try { viewport.value.releasePointerCapture(e.pointerId) } catch {}
}

const centerMap = () => {
  if (viewport.value) {
    const viewportW = viewport.value.clientWidth
    const viewportH = viewport.value.clientHeight
    panState.value.x = (viewportW - width) / 2
    panState.value.y = (viewportH - height) / 2
  }
}

onMounted(() => {
  centerMap()
})

const onNodeClick = (node, e) => {
  e.stopPropagation()
  if (!node.isRoot && node.visible) {
    emit('node-click', node.id)
  }
}
</script>

<template>
  <div 
    class="tree-viewport" 
    ref="viewport"
    @wheel="handleWheel"
    @pointerdown="startPan"
    @pointermove="doPan"
    @pointerup="endPan"
    @pointerleave="endPan"
    :style="{ cursor: panState.isDragging ? 'grabbing' : 'grab' }"
  >
    <svg id="treeLines" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" :style="lineStyle">
      <path 
        v-for="(conn, idx) in connectors" 
        :key="idx"
        :d="`M ${conn.x1} ${conn.y1} L ${conn.x2} ${conn.y2}`"
        fill="none"
        :stroke="conn.color"
        stroke-width="2"
        stroke-dasharray="6,6"
        stroke-linecap="round"
        opacity="0.6"
      />
    </svg>
    
    <div id="treeNodes" :style="{ width: `${width}px`, height: `${height}px`, ...transformStyle }">
      <div 
        v-for="node in nodes" 
        :key="node.id"
        class="tree-node"
        :class="{ 
          'root-node': node.type === 'root', 
          'track-node': node.type === 'track',
          'dimmed': !node.visible 
        }"
        :style="{ 
          left: `${node.x}px`, 
          top: `${node.y}px`,
          borderColor: node.type === 'track' ? node.color : undefined 
        }"
        @click="(e) => onNodeClick(node, e)"
      >
        <template v-if="node.type === 'root'">
          <div class="root-circle">
            <span>THINKLAB</span>
          </div>
        </template>
        <template v-else-if="node.type === 'track'">
          <div class="track-label" :style="{ color: node.color }">
            {{ node.title }}
          </div>
        </template>
        <template v-else>
          <strong>{{ node.title }}</strong>
          <!-- Removed track title as requested -->
        </template>
      </div>
    </div>
  </div>
</template>
