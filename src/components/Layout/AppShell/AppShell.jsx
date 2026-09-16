import './AppShell.css'

const AppShell = ({
  children,
  navbar = null,
  footer = null,
  contentClassName = '',
  fullWidth = false,
}) => {
  return (
    <div className={`app-shell ${fullWidth ? 'app-shell--full' : ''}`}>
      {navbar ? <div className="app-shell__navbar">{navbar}</div> : null}

      <main
        className={[
          'app-shell__content',
          contentClassName,
          fullWidth ? 'app-shell__content--full' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </main>

      {footer ? <div className="app-shell__footer">{footer}</div> : null}
    </div>
  )
}

export default AppShell