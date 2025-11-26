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
    isRoot: true,
    visible: true
  })

  const angleStep = (Math.PI * 2) / Math.max(props.tracks.length, 1)
  const radiusStart = 160
  const radiusStep = 140

  props.tracks.forEach((track, idx) => {
    const modules = props.tutorials.filter(t => t.trackId === track.id)
    const angle = angleStep * idx - Math.PI / 2
    
    modules.forEach((module, modIdx) => {
      const radius = radiusStart + radiusStep * (modIdx + 1)
      const x = center.x + Math.cos(angle) * radius
      const y = center.y + Math.sin(angle) * radius
      
      const isVisible = props.filteredTutorials.some(t => t.id === module.id)
      
      result.push({
        ...module,
        x,
        y,
        trackTitle: track.title,
        isRoot: false,
        visible: isVisible
      })
    })
  })
  return result
})

const connectors = computed(() => {
  const result = []
  const angleStep = (Math.PI * 2) / Math.max(props.tracks.length, 1)
  const radiusStart = 160
  const radiusStep = 140

  props.tracks.forEach((track, idx) => {
    const modules = props.tutorials.filter(t => t.trackId === track.id)
    const angle = angleStep * idx - Math.PI / 2
    
    if (!modules.length) return

    modules.forEach((module, modIdx) => {
      const radius = radiusStart + radiusStep * (modIdx + 1)
      const x = center.x + Math.cos(angle) * radius
      const y = center.y + Math.sin(angle) * radius
      
      const prevRadius = modIdx === 0 ? 0 : radiusStart + radiusStep * modIdx
      const prevX = modIdx === 0 ? center.x : center.x + Math.cos(angle) * prevRadius
      const prevY = modIdx === 0 ? center.y : center.y + Math.sin(angle) * prevRadius
      
      result.push({
        x1: prevX,
        y1: prevY,
        x2: x,
        y2: y,
        color: track.color || '#ffb347'
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
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  
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
        stroke-linecap="round"
        opacity="0.35"
      />
    </svg>
    
    <div id="treeNodes" :style="{ width: `${width}px`, height: `${height}px`, ...transformStyle }">
      <div 
        v-for="node in nodes" 
        :key="node.id"
        class="tree-node"
        :class="{ 'root-node': node.isRoot, 'dimmed': !node.visible }"
        :style="{ left: `${node.x}px`, top: `${node.y}px` }"
        @click="(e) => onNodeClick(node, e)"
      >
        <strong>{{ node.title }}</strong>
        <span>{{ node.isRoot ? node.subtitle : node.trackTitle }}</span>
      </div>
    </div>
  </div>
</template>
