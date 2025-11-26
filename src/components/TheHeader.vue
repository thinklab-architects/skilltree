<script setup>
const login = () => {
  // Simple prompt for now, or redirect to admin mode
  const token = prompt('Enter admin token:')
  if (token === '1234') {
    window.location.href = '?mode=admin'
  } else if (token) {
    alert('Incorrect token')
  }
}
</script>

<template>
  <header class="tree-header">
    <div class="brand">
      <div class="dot"></div>
      <div>
        <p class="eyebrow">Architect Skill Trails</p>
        <h1>THINKLAB SKILLTREE</h1>
      </div>
    </div>
    <div class="header-actions">
      <button class="pill" @click="login">Login</button>
    </div>
  </header>
</template>
