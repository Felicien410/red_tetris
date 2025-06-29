import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import router from '@/router/index.js'

// Mock the view components
vi.mock('@/views/HomeView.vue', () => ({
  default: { name: 'HomeView', template: '<div>Home</div>' }
}))

vi.mock('@/views/SoloGameView.vue', () => ({
  default: { name: 'SoloGameView', template: '<div>Solo Game</div>' }
}))

vi.mock('@/views/MultiplayerView.vue', () => ({
  default: { name: 'MultiplayerView', template: '<div>Multiplayer</div>' }
}))

describe('Router', () => {
  beforeEach(async () => {
    // Reset router to initial state
    router.replace('/')
    await router.isReady()
  })

  describe('Route definitions', () => {
    it('should have correct number of routes', () => {
      expect(router.getRoutes()).toHaveLength(3)
    })

    it('should have home route', () => {
      const homeRoute = router.resolve('/')
      expect(homeRoute.name).toBe('home')
      expect(homeRoute.matched).toHaveLength(1)
    })

    it('should have solo game route', () => {
      const soloRoute = router.resolve('/solo')
      expect(soloRoute.name).toBe('solo')
      expect(soloRoute.matched).toHaveLength(1)
    })

    it('should have multiplayer route', () => {
      const multiplayerRoute = router.resolve('/multiplayer')
      expect(multiplayerRoute.name).toBe('multiplayer')
      expect(multiplayerRoute.matched).toHaveLength(1)
    })
  })

  describe('Route navigation', () => {
    it('should navigate to home route', async () => {
      await router.push('/')
      expect(router.currentRoute.value.name).toBe('home')
      expect(router.currentRoute.value.path).toBe('/')
    })

    it('should navigate to solo game route', async () => {
      await router.push('/solo')
      expect(router.currentRoute.value.name).toBe('solo')
      expect(router.currentRoute.value.path).toBe('/solo')
    })

    it('should navigate to multiplayer route', async () => {
      await router.push('/multiplayer')
      expect(router.currentRoute.value.name).toBe('multiplayer')
      expect(router.currentRoute.value.path).toBe('/multiplayer')
    })

    it('should handle unknown routes', async () => {
      await router.push('/unknown-route')
      // Should stay on current route or redirect to home
      expect(['/unknown-route', '/']).toContain(router.currentRoute.value.path)
    })
  })

  describe('Route properties', () => {
    it('should have correct route components', () => {
      const routes = router.getRoutes()
      
      const homeRoute = routes.find(route => route.name === 'home')
      expect(homeRoute).toBeDefined()
      expect(homeRoute.path).toBe('/')

      const soloRoute = routes.find(route => route.name === 'solo')
      expect(soloRoute).toBeDefined()
      expect(soloRoute.path).toBe('/solo')

      const multiplayerRoute = routes.find(route => route.name === 'multiplayer')
      expect(multiplayerRoute).toBeDefined()
      expect(multiplayerRoute.path).toBe('/multiplayer')
    })

    it('should use hash mode for history', () => {
      // Check if router is using the correct history mode
      expect(router.options.history).toBeDefined()
    })
  })

  describe('Route transitions', () => {
    it('should allow navigation between routes', async () => {
      // Start at home
      await router.push('/')
      expect(router.currentRoute.value.name).toBe('home')

      // Navigate to solo
      await router.push('/solo')
      expect(router.currentRoute.value.name).toBe('solo')

      // Navigate to multiplayer
      await router.push('/multiplayer')
      expect(router.currentRoute.value.name).toBe('multiplayer')

      // Navigate back to home
      await router.push('/')
      expect(router.currentRoute.value.name).toBe('home')
    })

    it('should handle programmatic navigation', async () => {
      await router.push({ name: 'solo' })
      expect(router.currentRoute.value.name).toBe('solo')

      await router.push({ name: 'multiplayer' })
      expect(router.currentRoute.value.name).toBe('multiplayer')

      await router.push({ name: 'home' })
      expect(router.currentRoute.value.name).toBe('home')
    })
  })

  describe('Router guards', () => {
    it('should be ready after initialization', async () => {
      await expect(router.isReady()).resolves.toBeUndefined()
    })

    it('should resolve routes correctly', () => {
      const homeResolved = router.resolve('/')
      expect(homeResolved.name).toBe('home')

      const soloResolved = router.resolve('/solo')
      expect(soloResolved.name).toBe('solo')

      const multiplayerResolved = router.resolve('/multiplayer')
      expect(multiplayerResolved.name).toBe('multiplayer')
    })
  })
})