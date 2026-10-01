import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { NotificationCenter } from '../../components/notifications'
import './NotificationsPage.css'

export default function NotificationsPage() {
  const navigate = useNavigate()

  const openRoute = (route) => {
    if (!route || route === 'notifications') return
    navigate(route.startsWith('/') ? route : `/${route}`)
  }

  return (
    <main className="notifications-page">
      <header className="notifications-page__header">
        <span className="notifications-page__icon"><Bell size={22} aria-hidden="true" /></span>
        <div>
          <p>Message center</p>
          <h1>Notifications</h1>
        </div>
      </header>
      <NotificationCenter onOpenRoute={openRoute} />
    </main>
  )
}