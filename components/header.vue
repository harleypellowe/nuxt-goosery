<template>
  <header class="hero">
    <div class="hero-head">
      <nav class="navbar" role="navigation" aria-label="main navigation">
        <div class="container">
          <div class="navbar-brand">
            <NuxtLink to="/" class="navbar-item">
              <h1 class="title has-text-primary">The Goosery</h1>
            </NuxtLink>
            <span class="navbar-burger" data-target="navbar-menu">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
          <div id="navbar-menu" class="navbar-menu">
            <div class="navbar-end">
              <NuxtLink to="/about" class="navbar-item">About</NuxtLink>
              <NuxtLink to="/games" class="navbar-item">Games</NuxtLink>
              <NuxtLink to="/contact" class="navbar-item">Contact</NuxtLink>
            </div>
          </div>
        </div>
      </nav>
    </div>
    <div class="hero-body"></div>
  </header>
</template>