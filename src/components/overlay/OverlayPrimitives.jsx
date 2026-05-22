import { useEffect, useMemo, useRef } from 'react'
import { useOverlay } from './OverlayProvider'

function DeclarativeOverlay({ open, kind, children, onClose, id, title, description, closeOnBackdrop, closeOnEscape, restoreFocus, className, side, showClose, closeLabel }) {
  const { openOverlay, closeOverlay, updateOverlay } = useOverlay()
  const overlayIdRef = useRef(null)
  const content = useMemo(() => (
    typeof children === 'function'
      ? children
      : () => children || null
  ), [children])

  useEffect(() => {
    if (!open || overlayIdRef.current) return undefined
    overlayIdRef.current = openOverlay({
      id,
      kind,
    })

    return () => {
      if (overlayIdRef.current) {
        closeOverlay(overlayIdRef.current, 'unmount', { notify: false })
        overlayIdRef.current = null
      }
    }
  }, [closeOverlay, id, kind, open, openOverlay])

  useEffect(() => {
    if (!open || !overlayIdRef.current) return
    updateOverlay(overlayIdRef.current, {
      kind,
      title,
      description,
      closeOnBackdrop,
      closeOnEscape,
      restoreFocus,
      className,
      side,
      showClose,
      closeLabel,
      content,
      onClose,
    })
  }, [className, closeLabel, closeOnBackdrop, closeOnEscape, content, description, kind, onClose, open, restoreFocus, showClose, side, title, updateOverlay])

  return null
}

export function Modal({ open, children, ...props }) {
  return <DeclarativeOverlay open={open} kind="modal" {...props}>{children}</DeclarativeOverlay>
}

export function Drawer({ open, children, ...props }) {
  return <DeclarativeOverlay open={open} kind="drawer" {...props}>{children}</DeclarativeOverlay>
}

export function Sheet({ open, children, ...props }) {
  return <DeclarativeOverlay open={open} kind="sheet" {...props}>{children}</DeclarativeOverlay>
}

export function Dropdown({ open, children, ...props }) {
  return <DeclarativeOverlay open={open} kind="dropdown" {...props}>{children}</DeclarativeOverlay>
}
