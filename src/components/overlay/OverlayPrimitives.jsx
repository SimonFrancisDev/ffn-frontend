import { useEffect, useMemo } from 'react'
import { useOverlay } from './OverlayProvider'

function DeclarativeOverlay({ open, kind, children, onClose, id, title, description, closeOnBackdrop, className, side, showClose, closeLabel }) {
  const { openOverlay, closeOverlay } = useOverlay()
  const content = useMemo(() => (
    typeof children === 'function'
      ? children
      : () => children || null
  ), [children])

  useEffect(() => {
    if (!open) return undefined

    const overlayId = openOverlay({
      id,
      kind,
      title,
      description,
      closeOnBackdrop,
      className,
      side,
      showClose,
      closeLabel,
      content,
      onClose,
    })

    return () => {
      closeOverlay(overlayId, 'unmount', { notify: false })
    }
  }, [className, closeLabel, closeOnBackdrop, closeOverlay, content, description, id, kind, onClose, open, openOverlay, showClose, side, title])

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
