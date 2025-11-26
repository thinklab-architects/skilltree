<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as d3 from 'd3'

const props = defineProps({
  tracks: Array,
  tutorials: Array,
  filteredTutorials: Array
})

const emit = defineEmits(['node-click'])

const container = ref(null)
const svgRef = ref(null)
let simulation = null

// Irregular Pentagon shapes
const shards = [
  'M0,-22 L20,-8 L14,20 L-14,20 L-20,-8 Z',
  'M0,-24 L22,-6 L12,22 L-12,22 L-22,-6 Z',
  'M5,-22 L22,-5 L10,24 L-15,20 L-18,-10 Z',
  'M-5,-22 L18,-10 L15,20 L-10,24 L-22,-5 Z'
]

const getShardPath = (id) => {
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % shards.length
  return shards[index]
}

const initMap = () => {
  if (!container.value || !props.tracks.length) return

  console.log('Map Init - Tracks:', props.tracks)
  console.log('Map Init - Tutorials:', props.tutorials)

  const width = container.value.clientWidth
  const height = container.value.clientHeight

  // Prepare Data
  const nodes = []
  const links = []

  // 1. Root Node
  const rootNode = { id: 'root', type: 'root', title: 'THINKLAB', r: 40, fx: 0, fy: 0 }
  nodes.push(rootNode)

  // 2. Track Nodes
  props.tracks.forEach((track, i) => {
    const trackNode = { 
      id: `track-${track.id}`, 
      type: 'track', 
      title: track.title, 
      color: track.color, 
      r: 30,
      trackId: track.id
    }
    nodes.push(trackNode)
    links.push({ source: 'root', target: trackNode.id, type: 'root-track', color: track.color })

    // 3. Tutorial Nodes (Chained)
    const trackTutorials = props.tutorials.filter(t => t.trackId === track.id)
    console.log(`Track ${track.title} (${track.id}) has ${trackTutorials.length} tutorials`)
    
    let prevNodeId = trackNode.id

    trackTutorials.forEach((tut, j) => {
      const isVisible = props.filteredTutorials.some(t => t.id === tut.id)
      const tutNode = {
        id: tut.id,
        type: 'tutorial',
        title: tut.title,
        trackId: track.id,
        color: track.color,
        r: 20,
        visible: isVisible,
        data: tut
      }
      nodes.push(tutNode)
      
      // Link to previous node (Track or previous Tutorial)
      links.push({ 
        source: prevNodeId, 
        target: tutNode.id, 
        type: 'tutorial-link', 
        color: track.color 
      })
      
      prevNodeId = tutNode.id
    })
  })

  // Clear existing SVG
  d3.select(svgRef.value).selectAll('*').remove()

  const svg = d3.select(svgRef.value)
    .attr('viewBox', [-width / 2, -height / 2, width, height])
    .style('cursor', 'grab')

  // Zoom Behavior
  const g = svg.append('g')
  
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  svg.call(zoom)

  // Simulation
  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.type === 'root-track' ? 220 : 100))
    .force('charge', d3.forceManyBody().strength(-1000))
    .force('collide', d3.forceCollide().radius(d => d.r + 30))
    .force('x', d3.forceX())
    .force('y', d3.forceY())

  // Render Links
  const link = g.append('g')
    .selectAll('path')
    .data(links)
    .join('path')
    .attr('stroke', d => d.color || '#ccc')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '6,4')
    .attr('fill', 'none')
    .attr('opacity', 0.5)

  // Render Nodes
  const node = g.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node-group')
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      event.stopPropagation()
      if (d.type === 'tutorial' && d.visible) {
        emit('node-click', d.id)
      }
    })
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))

  // Regular Pentagon for Root
  const regularPentagon = 'M0,-20 L19,-6 L12,16 L-12,16 L-19,-6 Z'

  // Node Shapes
  node.each(function(d) {
    const el = d3.select(this)
    
    if (d.type === 'root') {
      el.append('path')
        .attr('d', regularPentagon)
        .attr('transform', 'scale(1.5)') // Resulting size approx r=30 (smaller than previous r=40)
        .attr('fill', '#ff7a18')
        .style('filter', 'drop-shadow(0 0 15px rgba(255, 122, 24, 0.6))')
      
      el.append('text')
        .text('THINKLAB')
        .attr('text-anchor', 'middle')
        .attr('dy', 4)
        .attr('fill', 'white')
        .style('font-weight', 'bold')
        .style('font-size', '10px') // Slightly smaller font to fit

        
    } else if (d.type === 'track') {
      // Track Node: Just Text (No Shape)
      // We keep the collision radius but don't render the shard
      
      el.append('text')
        .text(d.title)
        .attr('text-anchor', 'middle')
        .attr('dy', 5) // Centered
        .attr('fill', d.color)
        .style('font-weight', '800')
        .style('font-size', '14px')
        .style('text-transform', 'uppercase')
        .style('text-shadow', '0 0 10px rgba(255,255,255,0.8)')
        .style('pointer-events', 'none') // Let clicks pass through if needed, or keep it interactive

    } else {
      // Tutorial Node
      el.append('path')
        .attr('d', getShardPath(d.id))
        .attr('transform', 'scale(1.8)')
        .attr('fill', '#fff')
        .attr('stroke', d.color)
        .attr('stroke-width', 2)
        .attr('class', 'shard-shape')
        .style('opacity', d.visible ? 1 : 0.3)
        .style('filter', d.visible ? `drop-shadow(0 0 5px ${d.color})` : 'none') // Glow effect
        .style('transition', 'all 0.3s ease')

      if (d.visible) {
        el.append('text')
          .text(d.title)
          .attr('text-anchor', 'middle')
          .attr('dy', 40)
          .attr('fill', '#444')
          .style('font-size', '11px')
          .style('pointer-events', 'none')
          .style('text-shadow', '0 0 4px white')
          .each(function(d) {
            const self = d3.select(this)
            if (self.text().length > 18) {
              self.text(self.text().slice(0, 18) + '...')
            }
          })
      }
    }
  })

  // Hover effects
  node.on('mouseenter', function(event, d) {
    if (d.type === 'tutorial') {
      d3.select(this).select('path')
        .attr('fill', d.color)
        .attr('transform', 'scale(2.2)')
        .style('filter', `drop-shadow(0 0 15px ${d.color})`)
        
      d3.select(this).select('text')
        .style('font-weight', 'bold')
        .attr('dy', 45)
    }
  })
  .on('mouseleave', function(event, d) {
    if (d.type === 'tutorial') {
      d3.select(this).select('path')
        .attr('fill', '#fff')
        .attr('transform', 'scale(1.8)')
        .style('filter', `drop-shadow(0 0 5px ${d.color})`)
        
      d3.select(this).select('text')
        .style('font-weight', 'normal')
        .attr('dy', 40)
    }
  })

  simulation.on('tick', () => {
    link.attr('d', d => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`)
    node.attr('transform', d => `translate(${d.x},${d.y})`)
  })

  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    event.subject.fx = event.subject.x
    event.subject.fy = event.subject.y
    svg.style('cursor', 'grabbing')
  }

  function dragged(event) {
    event.subject.fx = event.x
    event.subject.fy = event.y
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0)
    event.subject.fx = null
    event.subject.fy = null
    svg.style('cursor', 'grab')
  }
}

onMounted(() => {
  // Wait for data to be ready
  const checkData = setInterval(() => {
    if (props.tracks.length > 0) {
      clearInterval(checkData)
      initMap()
    }
  }, 100)
})

watch(() => props.filteredTutorials, () => {
  // Ideally update visibility without full re-render, 
  // but for now re-init is safer to ensure consistency
  initMap()
}, { deep: true })

</script>

<template>
  <div class="tree-viewport" ref="container">
    <svg ref="svgRef" style="width: 100%; height: 100%;"></svg>
  </div>
</template>

<style scoped>
.tree-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}
</style>
