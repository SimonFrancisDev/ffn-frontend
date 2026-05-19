export const ANIMATION_PRESETS = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  rise: {
    initial: { opacity: 0, transform: 'translateY(8px)' },
    animate: { opacity: 1, transform: 'translateY(0)' },
  },
}

export function shouldReduceMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function getImageLoadingProps({ priority = false, width, height } = {}) {
  return {
    loading: priority ? 'eager' : 'lazy',
    decoding: priority ? 'sync' : 'async',
    fetchPriority: priority ? 'high' : 'auto',
    width,
    height,
  }
}

export function scheduleIdleWork(callback, timeout = 1200) {
  if (typeof window === 'undefined') return null
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout })
  }
  return window.setTimeout(callback, Math.min(timeout, 250))
}

export function cancelIdleWork(handle) {
  if (typeof window === 'undefined' || handle == null) return
  if ('cancelIdleCallback' in window) window.cancelIdleCallback(handle)
  else window.clearTimeout(handle)
}
