<template>
  <div class="layout">
    <header class="navbar">
      <div class="navbar-content">
        <div class="brand">
          <span class="brand-badge">TC</span>
          <div>
            <h1>TurnoCloud</h1>
            <p>Sistema de Gestión de Turnos</p>
          </div>
        </div>

        <nav class="nav-links">
          <NuxtLink to="/" class="nav-link">Solicitar Turno</NuxtLink>
          <NuxtLink to="/monitor" class="nav-link">Monitor Público</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="main-container">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f1f5f9;
  color: #0f172a;
  line-height: 1.5;
}

.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background-color: #0f172a;
  color: #ffffff;
  padding: 1rem 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.navbar-content {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-badge {
  background-color: #2563eb;
  color: #ffffff;
  font-weight: 800;
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  font-size: 1.1rem;
}

.brand h1 {
  font-size: 1.25rem;
  font-weight: 700;
}

.brand p {
  font-size: 0.8rem;
  color: #94a3b8;
}

.nav-links {
  display: flex;
  gap: 0.75rem;
}

.nav-link {
  color: #cbd5e1;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: background-color 0.2s, color 0.2s;
}

.nav-link:hover,
.nav-link.router-link-active {
  background-color: #2563eb;
  color: #ffffff;
}

.main-container {
  max-width: 1100px;
  width: 100%;
  margin: 2rem auto;
  padding: 0 1.5rem;
  flex: 1;
}
</style>