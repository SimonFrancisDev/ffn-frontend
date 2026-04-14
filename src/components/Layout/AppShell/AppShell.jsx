import './AppShell.css'

const AppShell = ({
  children,
  topbar = null,
  navbar = null,
  footer = null,
  contentClassName = '',
}) => {
  return (
    <div className="app-shell theme-transition">
      <div className="app-shell__bg app-shell__bg--one" />
      <div className="app-shell__bg app-shell__bg--two" />
      <div className="app-shell__bg app-shell__bg--three" />

      {topbar ? (
        <div className="app-shell__topbar">
          {topbar}
        </div>
      ) : null}

      {navbar ? (
        <div className="app-shell__navbar">
          {navbar}
        </div>
      ) : null}

      <main className={`app-shell__content ${contentClassName}`.trim()}>
        {children}
      </main>

      {footer ? (
        <div className="app-shell__footer">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

export default AppShell










// import './AppShell.css'

// const AppShell = ({
//   children,
//   topbar = null,
//   navbar = null,
//   footer = null,
//   contentClassName = '',
// }) => {
//   return (
//     <div className="app-shell theme-transition">
//       <div className="app-shell__bg app-shell__bg--one" />
//       <div className="app-shell__bg app-shell__bg--two" />
//       <div className="app-shell__bg app-shell__bg--three" />

//       {topbar ? (
//         <div className="app-shell__topbar">
//           {topbar}
//         </div>
//       ) : null}

//       {navbar ? (
//         <div className="app-shell__navbar">
//           {navbar}
//         </div>
//       ) : null}

//       <main className={`app-shell__content app-container ${contentClassName}`.trim()}>
//         {children}
//       </main>

//       {footer ? (
//         <div className="app-shell__footer">
//           {footer}
//         </div>
//       ) : null}
//     </div>
//   )
// }

// export default AppShell