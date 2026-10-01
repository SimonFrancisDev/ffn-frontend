import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { getApiUrl } from '../../Services/apiConfig'
import './OfficialVideoSection.css'

export default function OfficialVideoSection() {
  const [video, setVideo] = useState(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    let active = true
    fetch(getApiUrl('/api/community/official-video'))
      .then(async (response) => {
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.message || `Request failed: ${response.status}`)
        if (active) setVideo(payload?.data || null)
      })
      .catch((error) => console.error('Official video load failed:', error))
    return () => { active = false }
  }, [])

  if (!video) return null

  return (
    <section className="official-video-section" aria-labelledby="official-video-title">
      <div className="official-video-section__copy">
        <span><Play size={17} /> Official channel</span>
        <h2 id="official-video-title">{video.title}</h2>
        {video.description ? <p>{video.description}</p> : null}
        <a href={video.youtubeUrl} target="_blank" rel="noreferrer">Watch on YouTube</a>
      </div>
      <div className="official-video-section__media">
        {playing ? (
          <iframe
            src={`${video.embedUrl}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} aria-label={`Play ${video.title}`}>
            <img src={video.thumbnailUrl} alt="" />
            <span><Play size={26} fill="currentColor" /></span>
          </button>
        )}
      </div>
    </section>
  )
}