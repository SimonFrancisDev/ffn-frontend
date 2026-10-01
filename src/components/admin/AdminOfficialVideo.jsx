import { useEffect, useState } from 'react'
import { Eye, EyeOff, Play, Save, Video } from 'lucide-react'
import './AdminOfficialVideo.css'

const EMPTY = { youtubeUrl: '', title: '', description: '', isPublished: false }

export default function AdminOfficialVideo({ adminApi, toast }) {
  const [form, setForm] = useState(EMPTY)
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    adminApi('/api/admin/community/official-video')
      .then((response) => {
        if (!active || !response.data) return
        setVideo(response.data)
        setForm({
          youtubeUrl: response.data.youtubeUrl || '',
          title: response.data.title || '',
          description: response.data.description || '',
          isPublished: Boolean(response.data.isPublished),
        })
      })
      .catch((error) => toast.danger(error.message || 'Unable to load official video.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [adminApi, toast])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      const response = await adminApi('/api/admin/community/official-video', {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      setVideo(response.data)
      setForm((current) => ({ ...current, youtubeUrl: response.data.youtubeUrl }))
      toast.success(response.data.isPublished ? 'Official video published.' : 'Official video saved as unpublished.')
    } catch (error) {
      toast.danger(error.message || 'Unable to save official video.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-official-video">
      <header>
        <span><Video size={19} /></span>
        <div>
          <h2>Official YouTube video</h2>
          <p>Manage the single featured video shown on the Community page.</p>
        </div>
        <span className={`admin-official-video__status ${form.isPublished ? 'is-live' : ''}`}>
          {form.isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
          {form.isPublished ? 'Published' : 'Unpublished'}
        </span>
      </header>

      {loading ? <p className="admin-official-video__loading">Loading video configuration...</p> : (
        <div className="admin-official-video__layout">
          <div className="admin-official-video__form">
            <label>YouTube URL<input value={form.youtubeUrl} onChange={(event) => update('youtubeUrl', event.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label>
            <label>Title<input maxLength={140} value={form.title} onChange={(event) => update('title', event.target.value)} /></label>
            <label>Description<textarea rows={4} maxLength={1200} value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
            <label className="admin-official-video__toggle">
              <input type="checkbox" checked={form.isPublished} onChange={(event) => update('isPublished', event.target.checked)} />
              <span>Publish on Community page</span>
            </label>
            <button type="button" onClick={save} disabled={saving || !form.youtubeUrl.trim() || !form.title.trim()}><Save size={16} />{saving ? 'Saving...' : 'Save video'}</button>
          </div>

          <article className="admin-official-video__preview">
            {video?.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" /> : <div className="admin-official-video__placeholder"><Play size={30} /></div>}
            <div><small>Public preview</small><h3>{form.title || 'Official video title'}</h3><p>{form.description || 'The video description will appear here.'}</p></div>
          </article>
        </div>
      )}
    </section>
  )
}