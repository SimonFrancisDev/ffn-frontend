import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from '../ui'
import './OverlayProvider.css'

const OverlayContext = createContext(null)

const OVERLAY_ROOT_ID = 'ffn-overlay-root'

function getOverlayRoot() {
  if (typeof document === 'undefined') return null
  let root = document.getElementById(OVERLAY_ROOT_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = OVERLAY_ROOT_ID
    document.body.appendChild(root)
  }
  return root
}

function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return undefined

    const previousOverflow = document.body.style.overflow
    const previousTouchAction = document.body.style.touchAction
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.classList.add('ffn-no-scroll')
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      document.body.classList.remove('ffn-no-scroll')
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouchAction
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [locked])
}

function FocusTrap({ children, active, onEscape }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined

    const node = ref.current
    const previousActive = document.activeElement
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    const focusFirst = () => {
      const first = node?.querySelector(focusableSelector)
      if (first && typeof first.focus === 'function') first.focus()
      else node?.focus?.()
    }

    const frame = window.requestAnimationFrame(focusFirst)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onEscape?.()
        return
      }

      if (event.key !== 'Tab' || !node) return
      const focusable = Array.from(node.querySelectorAll(focusableSelector))
      if (!focusable.length) {
        event.preventDefault()
        node.focus?.()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      if (previousActive && typeof previousActive.focus === 'function') {
        previousActive.focus()
      }
    }
  }, [active, onEscape])

  return (
    <div ref={ref} tabIndex={-1}>
      {children}
    </div>
  )
}

function OverlayFrame({ item, onClose }) {
  const {
    id,
    kind = 'modal',
    title,
    description,
    content,
    closeOnBackdrop = true,
    labelledById = `ffn-overlay-title-${id}`,
    describedById = `ffn-overlay-desc-${id}`,
  } = item

  const isDrawer = kind === 'drawer'
  const isSheet = kind === 'sheet'
  const panelClass = [
    'ffn-overlay__panel',
    `ffn-overlay__panel--${kind}`,
    item.className || '',
  ].filter(Boolean).join(' ')

  const handleBackdropClick = () => {
    if (closeOnBackdrop) onClose(id, 'backdrop')
  }

  return (
    <div className={`ffn-overlay ffn-overlay--${kind}`} role="presentation">
      <div className="ffn-overlay__backdrop" onMouseDown={handleBackdropClick} />
      <FocusTrap active onEscape={() => onClose(id, 'escape')}>
        <section
          className={panelClass}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? labelledById : undefined}
          aria-describedby={description ? describedById : undefined}
          data-side={isDrawer ? item.side || 'start' : undefined}
        >
          {(title || item.showClose !== false) ? (
            <header className="ffn-overlay__header">
              <div className="ffn-stack" style={{ '--ffn-stack-gap': '4px' }}>
                {title ? <h2 id={labelledById}>{title}</h2> : null}
                {description ? <p id={describedById}>{description}</p> : null}
              </div>
              {item.showClose !== false ? (
                <IconButton label={item.closeLabel || 'Close'} icon={X} size={34} onClick={() => onClose(id, 'close-button')} />
              ) : null}
            </header>
          ) : null}
          <div className={`ffn-overlay__body ${isSheet ? 'ffn-overlay__body--sheet' : ''}`}>
            {typeof content === 'function' ? content({ close: () => onClose(id) }) : content}
          </div>
        </section>
      </FocusTrap>
    </div>
  )
}

export function OverlayProvider({ children }) {
  const [items, setItems] = useState([])
  const root = typeof document !== 'undefined' ? getOverlayRoot() : null

  useBodyScrollLock(items.length > 0)

  const closeOverlay = useCallback((id, reason = 'api', options = {}) => {
    let closedItem = null
    setItems((current) => {
      closedItem = current.find((item) => item.id === id) || null
      return current.filter((item) => item.id !== id)
    })

    if (options.notify !== false) {
      closedItem?.onClose?.(reason)
    }
  }, [])

  const closeAllOverlays = useCallback(() => {
    setItems([])
  }, [])

  const openOverlay = useCallback((config) => {
    const id = config.id || `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setItems((current) => [...current.filter((item) => item.id !== id), { ...config, id }])
    return id
  }, [])

  const openModal = useCallback((config) => openOverlay({ ...config, kind: 'modal' }), [openOverlay])
  const openDrawer = useCallback((config) => openOverlay({ ...config, kind: 'drawer' }), [openOverlay])
  const openSheet = useCallback((config) => openOverlay({ ...config, kind: 'sheet' }), [openOverlay])
  const openDropdown = useCallback((config) => openOverlay({ ...config, kind: 'dropdown' }), [openOverlay])

  const value = useMemo(() => ({
    overlays: items,
    openOverlay,
    openModal,
    openDrawer,
    openSheet,
    openDropdown,
    closeOverlay,
    closeAllOverlays,
  }), [closeAllOverlays, closeOverlay, items, openDrawer, openDropdown, openModal, openOverlay, openSheet])

  return (
    <OverlayContext.Provider value={value}>
      {children}
      {root ? createPortal(
        items.map((item) => <OverlayFrame key={item.id} item={item} onClose={closeOverlay} />),
        root
      ) : null}
    </OverlayContext.Provider>
  )
}

export function useOverlay() {
  const context = useContext(OverlayContext)
  if (!context) throw new Error('useOverlay must be used inside OverlayProvider')
  return context
}
