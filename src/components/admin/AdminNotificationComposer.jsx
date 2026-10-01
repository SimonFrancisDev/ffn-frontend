import { useMemo, useState } from 'react'
import { BellRing, ImagePlus, Send, Users, Wallet, X } from 'lucide-react'
import './AdminNotificationComposer.css'

const EMPTY_FORM = {
  deliveryMode: 'wallet',
  walletAddress: '',
  title: '',
  message: '',
  detail: '',
  severity: 'info',
  route: 'notifications',
}

export default function AdminNotificationComposer({ adminApi, toast }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [image, setImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const canSend = useMemo(() => (
    form.title.trim()
    && form.message.trim()
    && (form.deliveryMode === 'broadcast' || form.walletAddress.trim())
  ), [form])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const selectImage = (event) => {
    const file = event.target.files?.[0] || null
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.danger('Choose a JPEG, PNG, or WebP image.')
      event.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.danger('Notification images must be 5 MB or smaller.')
      event.target.value = ''
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const removeImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImage(null)
    setPreviewUrl('')
  }

  const send = async () => {
    if (!canSend || submitting) return
    if (
      form.deliveryMode === 'broadcast'
      && !window.confirm('Send this notification to every indexed registered user?')
    ) return

    setSubmitting(true)
    setResult(null)
    try {
      let imageId = ''
      if (image) {
        const upload = await adminApi('/api/admin/notifications/media', {
          method: 'POST',
          headers: {
            'Content-Type': image.type,
            'X-File-Name': image.name,
          },
          body: image,
        })
        imageId = upload.image?.id || ''
      }

      const response = await adminApi('/api/admin/notifications/messages', {
        method: 'POST',
        body: JSON.stringify({ ...form, imageId }),
      })
      setResult(response)
      toast.success(`Notification delivered to ${response.delivered} recipient(s).`)
      setForm(EMPTY_FORM)
      removeImage()
    } catch (error) {
      toast.danger(error.message || 'Unable to send notification.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="admin-message-composer">
      <header className="admin-message-composer__header">
        <span><BellRing size={18} /></span>
        <div>
          <h2>User notifications</h2>
          <p>Send an inbox message to one wallet or all indexed registered users.</p>
        </div>
      </header>

      <div className="admin-message-composer__layout">
        <div className="admin-message-composer__form">
          <div className="admin-message-composer__mode" role="group" aria-label="Recipient mode">
            <button className={form.deliveryMode === 'wallet' ? 'is-active' : ''} onClick={() => update('deliveryMode', 'wallet')}>
              <Wallet size={16} /> One wallet
            </button>
            <button className={form.deliveryMode === 'broadcast' ? 'is-active' : ''} onClick={() => update('deliveryMode', 'broadcast')}>
              <Users size={16} /> All registered users
            </button>
          </div>

          {form.deliveryMode === 'wallet' ? (
            <label>
              Recipient wallet
              <input value={form.walletAddress} onChange={(event) => update('walletAddress', event.target.value)} placeholder="0x..." />
            </label>
          ) : (
            <div className="admin-message-composer__warning">
              Broadcast recipients are deduplicated from indexed F-Freedom and Freedom-Plus registrations.
            </div>
          )}

          <label>
            Title
            <input maxLength={120} value={form.title} onChange={(event) => update('title', event.target.value)} />
          </label>
          <label>
            Message
            <textarea maxLength={2000} rows={5} value={form.message} onChange={(event) => update('message', event.target.value)} />
          </label>
          <label>
            Additional details <small>Optional</small>
            <textarea maxLength={2000} rows={3} value={form.detail} onChange={(event) => update('detail', event.target.value)} />
          </label>

          <div className="admin-message-composer__row">
            <label>
              Severity
              <select value={form.severity} onChange={(event) => update('severity', event.target.value)}>
                <option value="info">Information</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="danger">Important</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label>
              Destination
              <select value={form.route} onChange={(event) => update('route', event.target.value)}>
                <option value="notifications">Notifications</option>
                <option value="dashboard">Dashboard</option>
                <option value="activity">Activity</option>
                <option value="account">Account</option>
                <option value="activation">Activation</option>
                <option value="freedom-nft">Freedom NFT</option>
                <option value="support">Support</option>
              </select>
            </label>
          </div>

          <label className="admin-message-composer__upload">
            <ImagePlus size={18} />
            <span>{image ? image.name : 'Add image (JPEG, PNG, or WebP, max 5 MB)'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} />
          </label>

          <button className="admin-message-composer__send" disabled={!canSend || submitting} onClick={send}>
            <Send size={17} /> {submitting ? 'Sending...' : 'Send notification'}
          </button>

          {result ? (
            <div className="admin-message-composer__result">
              Delivered {result.delivered} of {result.requested}; failed {result.failed}.
            </div>
          ) : null}
        </div>

        <article className={`admin-message-preview admin-message-preview--${form.severity}`}>
          <span className="admin-message-preview__eyebrow">User preview</span>
          {previewUrl ? (
            <div className="admin-message-preview__media">
              <img src={previewUrl} alt="" />
              <button onClick={removeImage} title="Remove image"><X size={15} /></button>
            </div>
          ) : null}
          <h3>{form.title || 'Notification title'}</h3>
          <p>{form.message || 'Your message will appear here.'}</p>
          {form.detail ? <small>{form.detail}</small> : null}
          <footer>{form.deliveryMode === 'broadcast' ? 'All registered users' : form.walletAddress || 'Recipient wallet'}</footer>
        </article>
      </div>
    </section>
  )
}