import './LanguageDropdown.css'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

const LanguageDropdown = ({
  isOpen = false,
  languages = [],
  currentLanguage = 'en',
  onSelectLanguage,
  onClose,
  anchorRef = null, // NEW: Accept anchor ref for positioning
}) => {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const [desktopPosition, setDesktopPosition] = useState({
    top: 76,
    left: null,
    right: 20,
  })
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false,
  )

  const activeLanguage =
    languages.find((language) => language.code === currentLanguage) || languages[0]

  const handleSelect = (language) => {
    onSelectLanguage?.(language)
    onClose?.()
  }

  // Body scroll lock - only on mobile
  useEffect(() => {
    if (!isOpen) return undefined
    if (typeof window === 'undefined') return undefined

    // Desktop dropdowns should not lock the page like a modal.
    if (window.innerWidth >= 768) return undefined

    const previousOverflow = document.body.style.overflow
    const previousTouchAction = document.body.style.touchAction

    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouchAction
    }
  }, [isOpen])

  // Desktop detection effect
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const updateMode = () => {
      setIsDesktop(window.innerWidth >= 768)
    }

    updateMode()

    window.addEventListener('resize', updateMode)

    return () => {
      window.removeEventListener('resize', updateMode)
    }
  }, [])

  // Desktop positioning logic
  const updateDesktopPosition = () => {
    if (typeof window === 'undefined') return
    if (window.innerWidth < 768) return

    const anchorEl = anchorRef?.current
    const dialogEl = dialogRef.current

    if (!dialogEl) return

    const dialogWidth = dialogEl.offsetWidth || 320
    const viewportWidth = window.innerWidth
    const gap = 12
    const minMargin = 12

    if (!anchorEl) {
      setDesktopPosition({
        top: 82,
        left: Math.max(minMargin, viewportWidth - dialogWidth - 20),
        right: 'auto',
      })
      return
    }

    const rect = anchorEl.getBoundingClientRect()

    let left = rect.right - dialogWidth
    left = Math.max(minMargin, left)
    left = Math.min(left, viewportWidth - dialogWidth - minMargin)

    setDesktopPosition({
      top: rect.bottom + gap,
      left,
      right: 'auto',
    })
  }

  // Position update on open/resize/scroll
  useEffect(() => {
    if (!isOpen) return undefined

    const frame = window.requestAnimationFrame(updateDesktopPosition)

    const handleResize = () => updateDesktopPosition()
    const handleScroll = () => updateDesktopPosition()

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, anchorRef])

  // Laptop-only outside click handling
  useEffect(() => {
    if (!isOpen || !isDesktop) return undefined

    const handlePointerDown = (event) => {
      const dialogEl = dialogRef.current
      const anchorEl = anchorRef?.current

      if (dialogEl?.contains(event.target)) return
      if (anchorEl?.contains(event.target)) return

      onClose?.()
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isOpen, isDesktop, anchorRef, onClose])

  if (!isOpen) return null

  return (
    <ModalPortal>
      <div
        className={`language-modal ${
          isDesktop ? 'language-modal--desktop' : 'language-modal--mobile'
        }`}
        role="presentation"
      >
        {/* Backdrop for click-outside — mobile only */}
        {!isDesktop && (
          <div
            className="language-modal__backdrop"
            onClick={onClose}
          />
        )}

        <div
          ref={dialogRef}
          className={`language-modal__dialog ${
            isDesktop ? 'language-modal__dialog--desktop' : 'language-modal__dialog--mobile'
          } glass-panel theme-transition`}
          role="dialog"
          aria-label={t('languageDropdown.selectorAriaLabel', 'Language selector')}
          onClick={(event) => event.stopPropagation()}
          style={
            isDesktop
              ? {
                  position: 'fixed',
                  top: `${desktopPosition.top}px`,
                  left:
                    typeof desktopPosition.left === 'number'
                      ? `${desktopPosition.left}px`
                      : 'auto',
                  right:
                    typeof desktopPosition.right === 'number'
                      ? `${desktopPosition.right}px`
                      : desktopPosition.right || 'auto',
                  width: '320px',
                  minWidth: '320px',
                  maxWidth: '320px',
                }
              : undefined
          }
        >
          <div className="language-dropdown__header">
            <div className="language-dropdown__title-group">
              <h3 className="language-dropdown__title">
                {t('languageDropdown.title', 'Language')}
              </h3>
              <p className="language-dropdown__subtitle soft-text">
                {t('languageDropdown.subtitle', 'Choose your preferred language')}
              </p>
            </div>

            <button
              type="button"
              className="language-dropdown__close"
              onClick={onClose}
              aria-label={t('languageDropdown.closeAriaLabel', 'Close language menu')}
            >
              ✕
            </button>
          </div>

          <div className="language-dropdown__current">
            <span className="language-dropdown__current-label soft-text">
              {t('languageDropdown.current', 'Current')}
            </span>
            <div className="language-dropdown__current-value">
              <span className="language-dropdown__flag" aria-hidden="true">
                {activeLanguage?.flag}
              </span>
              <span className="language-dropdown__label-group">
                <span className="language-dropdown__label">
                  {activeLanguage?.label}
                </span>
                <span className="language-dropdown__code soft-text">
                  {activeLanguage?.code?.toUpperCase()}
                </span>
              </span>
            </div>
          </div>

          <div
            className="language-dropdown__list"
            role="listbox"
            aria-label={t('languageDropdown.listAriaLabel', 'Available languages')}
          >
            {languages.map((language) => {
              const isActive = language.code === currentLanguage

              return (
                <button
                  key={language.code}
                  type="button"
                  className={`language-dropdown__item ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleSelect(language)}
                  role="option"
                  aria-selected={isActive}
                >
                  <span className="language-dropdown__item-left">
                    <span className="language-dropdown__flag" aria-hidden="true">
                      {language.flag}
                    </span>

                    <span className="language-dropdown__label-group">
                      <span className="language-dropdown__label">
                        {language.label}
                      </span>
                      <span className="language-dropdown__code soft-text">
                        {language.code.toUpperCase()}
                      </span>
                    </span>
                  </span>

                  {isActive ? (
                    <span className="language-dropdown__check" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default LanguageDropdown

















// import './LanguageDropdown.css'
// import { useEffect, useRef, useState } from 'react'
// import { createPortal } from 'react-dom'

// function ModalPortal({ children }) {
//   if (typeof document === 'undefined') return null
//   return createPortal(children, document.body)
// }

// const LanguageDropdown = ({
//   isOpen = false,
//   languages = [],
//   currentLanguage = 'en',
//   onSelectLanguage,
//   onClose,
//   anchorRef = null, // NEW: Accept anchor ref for positioning
// }) => {
//   const dialogRef = useRef(null)
//   const [desktopPosition, setDesktopPosition] = useState({
//     top: 76,
//     left: null,
//     right: 20,
//   })

//   const activeLanguage =
//     languages.find((language) => language.code === currentLanguage) || languages[0]

//   const handleSelect = (language) => {
//     onSelectLanguage?.(language)
//     onClose?.()
//   }

//   // NEW: Body scroll lock - exactly like NotificationDropdown
//   useEffect(() => {
//     if (!isOpen) return undefined

//     const previousOverflow = document.body.style.overflow
//     const previousTouchAction = document.body.style.touchAction

//     document.body.style.overflow = 'hidden'
//     document.body.style.touchAction = 'none'

//     return () => {
//       document.body.style.overflow = previousOverflow
//       document.body.style.touchAction = previousTouchAction
//     }
//   }, [isOpen])

//   // NEW: Desktop positioning logic - exactly like NotificationDropdown
//   const updateDesktopPosition = () => {
//     if (typeof window === 'undefined') return
//     if (window.innerWidth < 768) return

//     const anchorEl = anchorRef?.current
//     const dialogEl = dialogRef.current

//     if (!anchorEl || !dialogEl) {
//       setDesktopPosition({ top: 76, left: null, right: 20 })
//       return
//     }

//     const rect = anchorEl.getBoundingClientRect()
//     const dialogWidth = dialogEl.offsetWidth || 320
//     const viewportWidth = window.innerWidth
//     const gap = 12
//     const minMargin = 12

//     // Align dropdown right edge with anchor right edge
//     let left = rect.right - dialogWidth
//     left = Math.max(minMargin, left)
//     left = Math.min(left, viewportWidth - dialogWidth - minMargin)

//     const top = rect.bottom + gap

//     setDesktopPosition({
//       top,
//       left,
//       right: 'auto',
//     })
//   }

//   // NEW: Position update on open/resize/scroll - exactly like NotificationDropdown
//   useEffect(() => {
//     if (!isOpen) return undefined

//     updateDesktopPosition()

//     const handleResize = () => updateDesktopPosition()
//     const handleScroll = () => updateDesktopPosition()

//     window.addEventListener('resize', handleResize)
//     window.addEventListener('scroll', handleScroll, true)

//     return () => {
//       window.removeEventListener('resize', handleResize)
//       window.removeEventListener('scroll', handleScroll, true)
//     }
//   }, [isOpen, anchorRef])

//   if (!isOpen) return null

//   return (
//     <ModalPortal>
//       <div className="language-modal" role="presentation">
//         {/* NEW: Backdrop for click-outside - exactly like NotificationDropdown */}
//         <div
//           className="language-modal__backdrop"
//           onClick={onClose}
//         />

//         <div
//           ref={dialogRef}
//           className="language-modal__dialog glass-panel theme-transition"
//           role="dialog"
//           aria-label="Language selector"
//           onClick={(event) => event.stopPropagation()}
//           style={
//             typeof desktopPosition.left === 'number'
//               ? {
//                   top: `${desktopPosition.top}px`,
//                   left: `${desktopPosition.left}px`,
//                   right: desktopPosition.right,
//                 }
//               : undefined
//           }
//         >
//           <div className="language-dropdown__header">
//             <div className="language-dropdown__title-group">
//               <h3 className="language-dropdown__title">Language</h3>
//               <p className="language-dropdown__subtitle soft-text">
//                 Choose your preferred language
//               </p>
//             </div>

//             <button
//               type="button"
//               className="language-dropdown__close"
//               onClick={onClose}
//               aria-label="Close language menu"
//             >
//               ✕
//             </button>
//           </div>

//           <div className="language-dropdown__current">
//             <span className="language-dropdown__current-label soft-text">
//               Current
//             </span>
//             <div className="language-dropdown__current-value">
//               <span className="language-dropdown__flag" aria-hidden="true">
//                 {activeLanguage?.flag}
//               </span>
//               <span className="language-dropdown__label-group">
//                 <span className="language-dropdown__label">
//                   {activeLanguage?.label}
//                 </span>
//                 <span className="language-dropdown__code soft-text">
//                   {activeLanguage?.code?.toUpperCase()}
//                 </span>
//               </span>
//             </div>
//           </div>

//           <div className="language-dropdown__list" role="listbox" aria-label="Available languages">
//             {languages.map((language) => {
//               const isActive = language.code === currentLanguage

//               return (
//                 <button
//                   key={language.code}
//                   type="button"
//                   className={`language-dropdown__item ${isActive ? 'is-active' : ''}`}
//                   onClick={() => handleSelect(language)}
//                   role="option"
//                   aria-selected={isActive}
//                 >
//                   <span className="language-dropdown__item-left">
//                     <span className="language-dropdown__flag" aria-hidden="true">
//                       {language.flag}
//                     </span>

//                     <span className="language-dropdown__label-group">
//                       <span className="language-dropdown__label">
//                         {language.label}
//                       </span>
//                       <span className="language-dropdown__code soft-text">
//                         {language.code.toUpperCase()}
//                       </span>
//                     </span>
//                   </span>

//                   {isActive ? (
//                     <span className="language-dropdown__check" aria-hidden="true">
//                       ✓
//                     </span>
//                   ) : null}
//                 </button>
//               )
//             })}
//           </div>
//         </div>
//       </div>
//     </ModalPortal>
//   )
// }

// export default LanguageDropdown;
