import { useEffect, useState } from 'react'
import { api } from '../api'

type Props = {
  id?: number
  /** bump to force reload after UI/template save */
  refreshKey?: string | number
  title?: string
}

export default function LpUiPreview({ id, refreshKey, title = 'Live UI preview' }: Props) {
  const [tick, setTick] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    setTick((t) => t + 1)
    setError('')
  }, [id, refreshKey])

  if (!id) {
    return (
      <div className="lp-preview empty-preview">
        <p className="muted">Save the LP once to see a live preview of the selected UI.</p>
      </div>
    )
  }

  const src = `${api.previewUrl(id)}?t=${tick}`

  return (
    <div className="lp-preview">
      <div className="lp-preview-head">
        <strong>{title}</strong>
        <button type="button" className="btn linkish" onClick={() => setTick((t) => t + 1)}>
          Refresh
        </button>
      </div>
      {error && <div className="banner error">{error}</div>}
      <iframe
        className="lp-preview-frame"
        title={title}
        src={src}
        onError={() => setError('Preview failed to load')}
      />
    </div>
  )
}
