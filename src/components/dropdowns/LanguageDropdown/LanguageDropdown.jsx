import './LanguageDropdown.css'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  const dialogRef = useRef(null)
  const [desktopPosition, setDesktopPosition] = useState({
    top: 76,
    left: null,
    right: 20,
  })

  const activeLanguage =
    languages.find((language) => language.code === currentLanguage) || languages[0]

  const handleSelect = (language) => {
    onSelectLanguage?.(language)
    onClose?.()
  }

  // NEW: Body scroll lock - exactly like NotificationDropdown
  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const previousTouchAction = document.body.style.touchAction

    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouchAction
    }
  }, [isOpen])

  // NEW: Desktop positioning logic - exactly like NotificationDropdown
  const updateDesktopPosition = () => {
    if (typeof window === 'undefined') return
    if (window.innerWidth < 768) return

    const anchorEl = anchorRef?.current
    const dialogEl = dialogRef.current

    if (!anchorEl || !dialogEl) {
      setDesktopPosition({ top: 76, left: null, right: 20 })
      return
    }

    const rect = anchorEl.getBoundingClientRect()
    const dialogWidth = dialogEl.offsetWidth || 320
    const viewportWidth = window.innerWidth
    const gap = 12
    const minMargin = 12

    // Align dropdown right edge with anchor right edge
    let left = rect.right - dialogWidth
    left = Math.max(minMargin, left)
    left = Math.min(left, viewportWidth - dialogWidth - minMargin)

    const top = rect.bottom + gap

    setDesktopPosition({
      top,
      left,
      right: 'auto',
    })
  }

  // NEW: Position update on open/resize/scroll - exactly like NotificationDropdown
  useEffect(() => {
    if (!isOpen) return undefined

    updateDesktopPosition()

    const handleResize = () => updateDesktopPosition()
    const handleScroll = () => updateDesktopPosition()

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, anchorRef])

  if (!isOpen) return null

  return (
    <ModalPortal>
      <div className="language-modal" role="presentation">
        {/* NEW: Backdrop for click-outside - exactly like NotificationDropdown */}
        <div
          className="language-modal__backdrop"
          onClick={onClose}
        />

        <div
          ref={dialogRef}
          className="language-modal__dialog glass-panel theme-transition"
          role="dialog"
          aria-label="Language selector"
          onClick={(event) => event.stopPropagation()}
          style={
            typeof desktopPosition.left === 'number'
              ? {
                  top: `${desktopPosition.top}px`,
                  left: `${desktopPosition.left}px`,
                  right: desktopPosition.right,
                }
              : undefined
          }
        >
          <div className="language-dropdown__header">
            <div className="language-dropdown__title-group">
              <h3 className="language-dropdown__title">Language</h3>
              <p className="language-dropdown__subtitle soft-text">
                Choose your preferred language
              </p>
            </div>

            <button
              type="button"
              className="language-dropdown__close"
              onClick={onClose}
              aria-label="Close language menu"
            >
              ✕
            </button>
          </div>

          <div className="language-dropdown__current">
            <span className="language-dropdown__current-label soft-text">
              Current
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

          <div className="language-dropdown__list" role="listbox" aria-label="Available languages">
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

// const LanguageDropdown = ({
//   isOpen = false,
//   languages = [],
//   currentLanguage = 'en',
//   onSelectLanguage,
//   onClose,
// }) => {
//   if (!isOpen) return null

//   const activeLanguage =
//     languages.find((language) => language.code === currentLanguage) || languages[0]

//   const handleSelect = (language) => {
//     onSelectLanguage?.(language)
//     onClose?.()
//   }

//   return (
//     <div
//       className="language-dropdown glass-panel theme-transition"
//       role="dialog"
//       aria-label="Language selector"
//     >
//       <div className="language-dropdown__header">
//         <div className="language-dropdown__title-group">
//           <h3 className="language-dropdown__title">Language</h3>
//           <p className="language-dropdown__subtitle soft-text">
//             Choose your preferred language
//           </p>
//         </div>

//         <button
//           type="button"
//           className="language-dropdown__close"
//           onClick={onClose}
//           aria-label="Close language menu"
//         >
//           ✕
//         </button>
//       </div>

//       <div className="language-dropdown__current">
//         <span className="language-dropdown__current-label soft-text">
//           Current
//         </span>
//         <div className="language-dropdown__current-value">
//           <span className="language-dropdown__flag" aria-hidden="true">
//             {activeLanguage?.flag}
//           </span>
//           <span className="language-dropdown__label-group">
//             <span className="language-dropdown__label">
//               {activeLanguage?.label}
//             </span>
//             <span className="language-dropdown__code soft-text">
//               {activeLanguage?.code?.toUpperCase()}
//             </span>
//           </span>
//         </div>
//       </div>

//       <div className="language-dropdown__list" role="listbox" aria-label="Available languages">
//         {languages.map((language) => {
//           const isActive = language.code === currentLanguage

//           return (
//             <button
//               key={language.code}
//               type="button"
//               className={`language-dropdown__item ${isActive ? 'is-active' : ''}`}
//               onClick={() => handleSelect(language)}
//               role="option"
//               aria-selected={isActive}
//             >
//               <span className="language-dropdown__item-left">
//                 <span className="language-dropdown__flag" aria-hidden="true">
//                   {language.flag}
//                 </span>

//                 <span className="language-dropdown__label-group">
//                   <span className="language-dropdown__label">
//                     {language.label}
//                   </span>
//                   <span className="language-dropdown__code soft-text">
//                     {language.code.toUpperCase()}
//                   </span>
//                 </span>
//               </span>

//               {isActive ? (
//                 <span className="language-dropdown__check" aria-hidden="true">
//                   ✓
//                 </span>
//               ) : null}
//             </button>
//           )
//         })}
//       </div>
//     </div>
//   )
// }

// export default LanguageDropdown
