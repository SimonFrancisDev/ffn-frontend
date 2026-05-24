let lockCount = 0
let previousOverflow = ''
let previousPaddingRight = ''

export function lockBodyScroll() {
  if (typeof document === 'undefined') return () => {}

  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow
    previousPaddingRight = document.body.style.paddingRight

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.classList.add('ffn-scroll-locked')
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
  }

  lockCount += 1
  let released = false

  return () => {
    if (released) return
    released = true

    lockCount = Math.max(0, lockCount - 1)
    if (lockCount > 0) return

    document.body.classList.remove('ffn-scroll-locked')
    document.body.style.overflow = previousOverflow
    document.body.style.paddingRight = previousPaddingRight
  }
}
