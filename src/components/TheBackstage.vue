<script setup>
defineProps({
  data: Object
})
const emit = defineEmits(['refresh'])

const backToTree = () => {
  window.location.href = '/'
}
</script>

<template>
  <section id="backstageView">
    <header class="backstage-header">
      <div>
        <p class="eyebrow">Backstage</p>
        <h2>Editor for practice leads</h2>
        <p class="lede">Manage tutorials and tracks here.</p>
      </div>
      <button class="pill ghost" @click="backToTree">Back to tree</button>
    </header>
    <section class="admin">
      <div class="admin-grid">
        <div class="panel">
          <p>Admin functionality is currently being migrated. Please use the legacy version for editing.</p>
        </div>
      </div>
    </section>
  </section>
</template>
