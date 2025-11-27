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

// Heptagon (7-sided) for hover state
const heptagon = 'M0,-25 L18,-15 L24,0 L18,18 L0,25 L-18,18 L-24,0 L-18,-15 Z'

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
  const rootNode = { id: 'root', type: 'root', title: 'THINKLAB', r: 60, fx: 0, fy: 0 }
  nodes.push(rootNode)

  // 2. Track Nodes
  props.tracks.forEach((track, i) => {
    const trackNode = { 
      id: `track-${track.id}`, 
      type: 'track', 
      title: track.title, 
      color: track.color, 
      r: 40,
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
        r: 30,
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
    .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.type === 'root-track' ? 100 : 80))
    .force('charge', d3.forceManyBody().strength(-2000))
    .force('collide', d3.forceCollide().radius(d => d.r + 40))
    .force('x', d3.forceX())
    .force('y', d3.forceY())

  // Render Links
  const link = g.append('g')
    .selectAll('path')
    .data(links)
    .join('path')
    .attr('class', d => `link track-${d.color ? d.color.replace('#', '') : 'default'}`)
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
        .attr('transform', 'scale(1.8)') // Larger center node
        .attr('fill', '#ff7a18')
        .style('filter', 'drop-shadow(0 0 15px rgba(255, 122, 24, 0.6))')
      
      el.append('text')
        .text('THINKLAB')
        .attr('text-anchor', 'middle')
        .attr('dy', 4)
        .attr('fill', 'white')
        .style('font-weight', 'bold')
        .style('font-size', '14px') // Larger font

        
    } else if (d.type === 'track') {
      // Track Node: Just Text (No Shape)
      // We keep the collision radius but don't render the shard
      
      el.append('text')
        .text(d.title)
        .attr('text-anchor', 'middle')
        .attr('dy', 5) // Centered
        .attr('fill', d.color)
        .style('font-weight', '800')
        .style('font-size', '16px')
        .style('text-transform', 'uppercase')
        .style('text-shadow', '0 0 10px rgba(255,255,255,0.8)')
        .style('pointer-events', 'none') // Let clicks pass through if needed, or keep it interactive

    } else {
      // Tutorial Node
      el.append('path')
        .attr('d', getShardPath(d.id))
        .attr('transform', 'scale(2.2)')
        .attr('fill', '#fff')
        .attr('stroke', d.color)
        .attr('stroke-width', 2)
        .attr('class', 'shard-shape')
        .style('opacity', d.visible ? 1 : 0.3)
        .style('filter', d.visible ? `drop-shadow(0 0 5px ${d.color})` : 'none') // Glow effect
        .style('transition', 'all 0.3s ease')

      if (d.visible) {
        const text = el.append('text')
          .attr('text-anchor', 'middle')
          .attr('fill', '#444')
          .style('font-size', '13px')
          .style('font-weight', 'bold')
          .style('pointer-events', 'none')
          .style('text-shadow', '0 0 4px white')
        
        // Simple wrapping logic
        // Check if title contains hyphen and split on it
        if (d.title.includes('-')) {
          const parts = d.title.split('-').map(p => p.trim())
          text.text('')
          parts.forEach((part, idx) => {
            text.append('tspan')
              .attr('x', 0)
              .attr('dy', idx === 0 ? '-0.3em' : '1.1em')
              .text(idx === parts.length - 1 ? part : part + ' -')
          })
        } else {
          // Original wrapping logic for non-hyphenated titles
          const words = d.title.split(/\s+/)
          
          // If single long word, just show it (maybe truncated)
          if (words.length === 1) {
               text.text(d.title.length > 8 ? d.title.slice(0, 8) + '..' : d.title)
                   .attr('dy', '0.35em')
          } else {
              // Multi-word wrapping
              let tspan = text.append('tspan').attr('x', 0).attr('dy', 0)
              
              // Very basic split for 2-3 lines max
              if (d.title.length > 20) {
                   // Force split
                   const mid = Math.floor(d.title.length / 2)
                   const splitIdx = d.title.indexOf(' ', mid) > -1 ? d.title.indexOf(' ', mid) : mid
                   const l1 = d.title.slice(0, splitIdx)
                   const l2 = d.title.slice(splitIdx).trim()
                   
                   text.append('tspan').attr('x', 0).attr('dy', '-0.2em').text(l1)
                   text.append('tspan').attr('x', 0).attr('dy', '1.1em').text(l2.length > 10 ? l2.slice(0,9)+'..' : l2)
              } else {
                   text.text(d.title).attr('dy', '0.35em')
                   // If text is too long for one line, split it
                   if (d.title.length > 10) {
                       const parts = d.title.split(' ')
                       if (parts.length >= 2) {
                           text.text('')
                           const half = Math.ceil(parts.length / 2)
                           const l1 = parts.slice(0, half).join(' ')
                           const l2 = parts.slice(half).join(' ')
                           text.append('tspan').attr('x', 0).attr('dy', '-0.2em').text(l1)
                           text.append('tspan').attr('x', 0).attr('dy', '1.1em').text(l2)
                       }
                   }
              }
          }
        }
      }
    }
  })

  // Hover effects
  node.on('mouseenter', function(event, d) {
    if (d.type === 'tutorial') {
      const nodeGroup = d3.select(this)
      
      // Highlight the node - morph to heptagon
      nodeGroup.select('path')
        .attr('d', heptagon)
        .attr('fill', 'rgba(0, 0, 0, 0.7)') // Dark semi-transparent background
        .attr('transform', 'scale(3)')
        .style('filter', `drop-shadow(0 0 15px ${d.color})`)
        
      nodeGroup.select('text')
        .attr('fill', 'white') // Text turns white
        .style('font-weight', 'bold')
        .style('font-size', '15px') // Larger text on hover
      
      // Add level above title
      if (d.data && d.data.level) {
        nodeGroup.append('text')
          .attr('class', 'hover-level')
          .attr('text-anchor', 'middle')
          .attr('dy', '-3em')
          .attr('fill', 'white')
          .style('font-size', '9px')
          .style('font-weight', '600')
          .style('opacity', 0.8)
          .text(d.data.level)
      }
      
      // Add tags below title (max 3)
      if (d.data && d.data.tags && d.data.tags.length > 0) {
        const tagsToShow = d.data.tags.slice(0, 3)
        const tagsText = tagsToShow.join(' · ')
        
        nodeGroup.append('text')
          .attr('class', 'hover-tags')
          .attr('text-anchor', 'middle')
          .attr('dy', '3.2em')
          .attr('fill', 'white')
          .style('font-size', '8px')
          .style('font-weight', '400')
          .style('opacity', 0.7)
          .text(tagsText)
          .each(function() {
            const self = d3.select(this)
            if (self.text().length > 30) {
              self.text(self.text().slice(0, 30) + '...')
            }
          })
      }
      
      // Highlight all links in the same track
      const trackClass = `track-${d.color.replace('#', '')}`
      g.selectAll(`.${trackClass}`)
        .attr('stroke-width', 5)
        .attr('opacity', 1)
        .style('filter', `drop-shadow(0 0 8px ${d.color})`)
    }
  })
  .on('mouseleave', function(event, d) {
    if (d.type === 'tutorial') {
      const nodeGroup = d3.select(this)
      
      // Reset the node - back to pentagon
      nodeGroup.select('path')
        .attr('d', getShardPath(d.id))
        .attr('fill', '#fff')
        .attr('transform', 'scale(2.2)')
        .style('filter', `drop-shadow(0 0 5px ${d.color})`)
        
      nodeGroup.select('text')
        .attr('fill', '#444') // Revert to dark gray
        .style('font-weight', 'bold') // Keep bold as default
        .style('font-size', '13px') // Back to normal size
      
      // Remove hover-added elements
      nodeGroup.selectAll('.hover-level').remove()
      nodeGroup.selectAll('.hover-tags').remove()
      
      // Reset all links in the same track
      const trackClass = `track-${d.color.replace('#', '')}`
      g.selectAll(`.${trackClass}`)
        .attr('stroke-width', 2)
        .attr('opacity', 0.5)
        .style('filter', 'none')
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
