import { Modal } from 'react-bootstrap'
import { X, ExternalLink, Calendar, Megaphone, Bell } from 'lucide-react'
import './NotificationModal.css'

const NotificationModal = ({ notification, onClose }) => {
  if (!notification) return null
  
  const getIcon = () => {
    switch (notification.type) {
      case 'announcement':
        return Megaphone
      case 'event':
        return Calendar
      default:
        return Bell
    }
  }
  
  const getIconColor = () => {
    switch (notification.type) {
      case 'announcement':
        return '#1de9b6'
      case 'event':
        return '#f59e0b'
      default:
        return 'var(--glow-blue)'
    }
  }
  
  const IconComponent = getIcon()
  const iconColor = getIconColor()

  return (
    <Modal show={true} onHide={onClose} centered size="lg" className="notification-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          <span className="notification-modal__icon">
            <IconComponent size={20} style={{ color: iconColor }} />
          </span>
          {notification.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="notification-modal__time">{notification.time}</p>
        <div className="notification-modal__content">
          {notification.fullContent || notification.message}
        </div>
        {notification.ctaUrl && (
          <div className="notification-modal__cta">
            <a 
              href={notification.ctaUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {notification.ctaLabel || 'Learn More'} <ExternalLink size={14} />
            </a>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button className="notification-modal__close-btn" onClick={onClose}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  )
}

export default NotificationModal