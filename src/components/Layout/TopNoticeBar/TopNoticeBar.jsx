import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  dedupeNotices,
  dismissNoticeById,
  getActiveNotice,
  getRotatingNotices,
} from '../../../utils/noticeHelpers'
import { Info, CheckCircle, AlertTriangle, AlertOctagon, X } from 'lucide-react'
import './TopNoticeBar.css'

const NOTICE_ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertOctagon,
}

const NOTICE_COLORS = {
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
}

const TopNoticeBar = ({ notices = [] }) => {
  const { t } = useTranslation()
  const normalizedNotices = useMemo(() => dedupeNotices(notices), [notices])
  const [visibleNotices, setVisibleNotices] = useState(normalizedNotices)
  const [rotationIndex, setRotationIndex] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    setVisibleNotices(normalizedNotices)
  }, [normalizedNotices])

  const activeStickyNotice = useMemo(() => {
    const sticky = visibleNotices.filter((notice) => notice.sticky)
    return getActiveNotice(sticky)
  }, [visibleNotices])

  const rotatingNotices = useMemo(() => getRotatingNotices(visibleNotices), [visibleNotices])

  const activeNotice = useMemo(() => {
    if (activeStickyNotice) return activeStickyNotice
    if (!rotatingNotices.length) return null
    return rotatingNotices[rotationIndex % rotatingNotices.length]
  }, [activeStickyNotice, rotatingNotices, rotationIndex])

  useEffect(() => {
    if (!activeNotice) return undefined
    if (activeNotice.sticky) return undefined
    if (!rotatingNotices.length || rotatingNotices.length <= 1) return undefined
    if (!activeNotice.autoHideMs) return undefined

    timerRef.current = window.setTimeout(() => {
      setRotationIndex((current) => current + 1)
    }, activeNotice.autoHideMs)

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [activeNotice, rotatingNotices])

  const handleDismiss = (id) => {
    setVisibleNotices((current) => dismissNoticeById(current, id))
  }

  if (!activeNotice) return null

  const IconComponent = NOTICE_ICONS[activeNotice.type] || NOTICE_ICONS.info
  const iconColor = NOTICE_COLORS[activeNotice.type] || NOTICE_COLORS.info
  const showProgress = !activeNotice.sticky && !!activeNotice.autoHideMs

  return (
    <div className={`top-notice top-notice--${activeNotice.type} theme-transition`}>
      <div className="app-container">
        <div className="top-notice__inner">
          <div className="top-notice__left">
            <span className="top-notice__icon" aria-hidden="true">
              <IconComponent size={14} style={{ color: iconColor }} />
            </span>

            <div className="top-notice__text-group">
              {activeNotice.label ? (
                <span className="top-notice__label">{activeNotice.label}</span>
              ) : null}

              <p className="top-notice__message">{activeNotice.message}</p>
            </div>
          </div>

          <div className="top-notice__right">
            {activeNotice.actionLabel && activeNotice.onAction ? (
              <button
                type="button"
                className="top-notice__action"
                onClick={activeNotice.onAction}
              >
                {activeNotice.actionLabel}
              </button>
            ) : null}

            {activeNotice.dismissible ? (
              <button
                type="button"
                className="top-notice__dismiss"
                onClick={() => handleDismiss(activeNotice.id)}
                aria-label={t('topNotice.dismissAriaLabel', 'Dismiss notice')}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>

        {showProgress ? (
          <div
            key={activeNotice.id}
            className="top-notice__progress"
            style={{ animationDuration: `${activeNotice.autoHideMs}ms` }}
          />
        ) : null}
      </div>
    </div>
  )
}

export default TopNoticeBar


















// import { useEffect, useMemo, useRef, useState } from 'react'
// import {
//   dedupeNotices,
//   dismissNoticeById,
//   getActiveNotice,
//   getRotatingNotices,
// } from '../../../utils/noticeHelpers'
// import './TopNoticeBar.css'

// const NOTICE_ICONS = {
//   info: 'ℹ',
//   success: '✓',
//   warning: '⚠',
//   danger: '⛔',
// }

// const TopNoticeBar = ({ notices = [] }) => {
//   const normalizedNotices = useMemo(() => dedupeNotices(notices), [notices])
//   const [visibleNotices, setVisibleNotices] = useState(normalizedNotices)
//   const [rotationIndex, setRotationIndex] = useState(0)
//   const timerRef = useRef(null)

//   useEffect(() => {
//     setVisibleNotices(normalizedNotices)
//   }, [normalizedNotices])

//   const activeStickyNotice = useMemo(() => {
//     const sticky = visibleNotices.filter((notice) => notice.sticky)
//     return getActiveNotice(sticky)
//   }, [visibleNotices])

//   const rotatingNotices = useMemo(() => getRotatingNotices(visibleNotices), [visibleNotices])

//   const activeNotice = useMemo(() => {
//     if (activeStickyNotice) return activeStickyNotice
//     if (!rotatingNotices.length) return null
//     return rotatingNotices[rotationIndex % rotatingNotices.length]
//   }, [activeStickyNotice, rotatingNotices, rotationIndex])

//   useEffect(() => {
//     if (!activeNotice) return undefined
//     if (activeNotice.sticky) return undefined
//     if (!rotatingNotices.length || rotatingNotices.length <= 1) return undefined
//     if (!activeNotice.autoHideMs) return undefined

//     timerRef.current = window.setTimeout(() => {
//       setRotationIndex((current) => current + 1)
//     }, activeNotice.autoHideMs)

//     return () => {
//       if (timerRef.current) {
//         window.clearTimeout(timerRef.current)
//       }
//     }
//   }, [activeNotice, rotatingNotices])

//   const handleDismiss = (id) => {
//     setVisibleNotices((current) => dismissNoticeById(current, id))
//   }

//   if (!activeNotice) return null

//   const icon = NOTICE_ICONS[activeNotice.type] || NOTICE_ICONS.info
//   const showProgress = !activeNotice.sticky && !!activeNotice.autoHideMs

//   return (
//     <div className={`top-notice top-notice--${activeNotice.type} theme-transition`}>
//       <div className="app-container">
//         <div className="top-notice__inner">
//           <div className="top-notice__left">
//             <span className="top-notice__icon" aria-hidden="true">
//               {icon}
//             </span>

//             <div className="top-notice__text-group">
//               {activeNotice.label ? (
//                 <span className="top-notice__label">{activeNotice.label}</span>
//               ) : null}

//               <p className="top-notice__message">{activeNotice.message}</p>
//             </div>
//           </div>

//           <div className="top-notice__right">
//             {activeNotice.actionLabel && activeNotice.onAction ? (
//               <button
//                 type="button"
//                 className="top-notice__action"
//                 onClick={activeNotice.onAction}
//               >
//                 {activeNotice.actionLabel}
//               </button>
//             ) : null}

//             {activeNotice.dismissible ? (
//               <button
//                 type="button"
//                 className="top-notice__dismiss"
//                 onClick={() => handleDismiss(activeNotice.id)}
//                 aria-label="Dismiss notice"
//               >
//                 ✕
//               </button>
//             ) : null}
//           </div>
//         </div>

//         {showProgress ? (
//           <div
//             key={activeNotice.id}
//             className="top-notice__progress"
//             style={{ animationDuration: `${activeNotice.autoHideMs}ms` }}
//           />
//         ) : null}
//       </div>
//     </div>
//   )
// }

// export default TopNoticeBar
