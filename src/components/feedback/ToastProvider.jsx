import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import './ToastProvider.css'

const ToastContext = createContext(null)

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
}

function getToastRoot() {
  if (typeof document === 'undefined') return null
  let root = document.getElementById('ffn-toast-root')
  if (!root) {
    root = document.createElement('div')
    root.id = 'ffn-toast-root'
    document.body.appendChild(root)
  }
  return root
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const root = typeof document !== 'undefined' ? getToastRoot() : null

  const dismissToast = useCallback((id, reason = 'manual') => {
    setToasts((current) => {
      const dismissedToast = current.find((toast) => toast.id === id)
      dismissedToast?.onDismiss?.(reason)
      return current.filter((toast) => toast.id !== id)
    })
  }, [])

  const pushToast = useCallback((toast) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const next = {
      tone: 'info',
      timeoutMs: 5200,
      ...toast,
      id,
    }

    setToasts((current) => {
      const deduped = next.dedupeKey
        ? current.filter((item) => item.dedupeKey !== next.dedupeKey)
        : current
      return [...deduped, next].slice(-5)
    })

    if (next.timeoutMs) {
      window.setTimeout(() => dismissToast(id, 'timeout'), next.timeoutMs)
    }

    return id
  }, [dismissToast])

  const value = useMemo(() => ({
    toasts,
    pushToast,
    dismissToast,
    info: (message, options = {}) => pushToast({ ...options, message, tone: 'info' }),
    success: (message, options = {}) => pushToast({ ...options, message, tone: 'success' }),
    warning: (message, options = {}) => pushToast({ ...options, message, tone: 'warning' }),
    danger: (message, options = {}) => pushToast({ ...options, message, tone: 'danger' }),
  }), [dismissToast, pushToast, toasts])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {root ? createPortal(
        <div className="ffn-toast-viewport" role="region" aria-label="Notifications">
          {toasts.map((toast) => {
            const Icon = ICONS[toast.tone] || Info
            return (
              <article key={toast.id} className={`ffn-toast ffn-toast--${toast.tone} ${toast.variant ? `ffn-toast--${toast.variant}` : ''}`} role={toast.tone === 'danger' ? 'alert' : 'status'}>
                {toast.emoji ? (
                  <span className="ffn-toast__emoji" aria-hidden="true">{toast.emoji}</span>
                ) : (
                  <Icon size={18} aria-hidden="true" />
                )}
                <div className="ffn-toast__body">
                  {toast.title ? <strong>{toast.title}</strong> : null}
                  <p>{toast.message}</p>
                  {toast.action ? <div className="ffn-toast__action">{toast.action}</div> : null}
                </div>
                <button type="button" className="ffn-toast__close" onClick={() => dismissToast(toast.id, 'manual')} aria-label="Dismiss">
                  <X size={14} />
                </button>
              </article>
            )
          })}
        </div>,
        root
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
