import './AppShell.css'

const AppShell = ({
  children,
  topbar = null,
  navbar = null,
  footer = null,
  contentClassName = '',
  fullWidth = false, // 👈 NEW
}) => {
  return (
    <div className={`app-shell ${fullWidth ? 'app-shell--full' : ''}`}>
      {topbar ? <div className="app-shell__topbar">{topbar}</div> : null}

      {navbar ? <div className="app-shell__navbar">{navbar}</div> : null}

      <main
        className={`app-shell__content ${contentClassName} ${
          fullWidth ? 'app-shell__content--full' : ''
        }`.trim()}
      >
        {children}
      </main>

      {footer ? <div className="app-shell__footer">{footer}</div> : null}
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
//     <div className="app-shell">
//       {topbar ? <div className="app-shell__topbar">{topbar}</div> : null}

//       {navbar ? <div className="app-shell__navbar">{navbar}</div> : null}

//       <main className={`app-shell__content ${contentClassName}`.trim()}>
//         {children}
//       </main>

//       {footer ? <div className="app-shell__footer">{footer}</div> : null}
//     </div>
//   )
// }

// export default AppShell