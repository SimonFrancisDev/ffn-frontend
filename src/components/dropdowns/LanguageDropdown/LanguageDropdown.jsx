import './LanguageDropdown.css'

const LanguageDropdown = ({
  isOpen = false,
  languages = [],
  currentLanguage = 'en',
  onSelectLanguage,
  onClose,
}) => {
  if (!isOpen) return null

  const activeLanguage =
    languages.find((language) => language.code === currentLanguage) || languages[0]

  const handleSelect = (language) => {
    onSelectLanguage?.(language)
    onClose?.()
  }

  return (
    <div
      className="language-dropdown glass-panel theme-transition"
      role="dialog"
      aria-label="Language selector"
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
  )
}

export default LanguageDropdown














// import './LanguageDropdown.css'

// const LanguageDropdown = ({
//   isOpen = false,
//   languages = [],
//   currentLanguage = 'English',
//   onSelectLanguage,
//   onClose,
// }) => {
//   if (!isOpen) return null

//   const handleSelect = (language) => {
//     onSelectLanguage?.(language)
//     onClose?.()
//   }

//   return (
//     <div className="language-dropdown glass-panel theme-transition">
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

//       <div className="language-dropdown__list">
//         {languages.map((language) => {
//           const isActive = language.label === currentLanguage

//           return (
//             <button
//               key={language.code}
//               type="button"
//               className={`language-dropdown__item ${isActive ? 'is-active' : ''}`}
//               onClick={() => handleSelect(language)}
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