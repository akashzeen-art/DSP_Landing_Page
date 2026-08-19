import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api, type LandingPage, type UiTemplate } from '../api'
import { campaignUrl, liveBase } from '../campaignUrls'
import UiTemplatePicker, { uiTemplateLabel } from '../components/UiTemplatePicker'
import LpUiPreview from '../components/LpUiPreview'

export default function Dashboard() {
  const [pages, setPages] = useState<LandingPage[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [flash, setFlash] = useState('')
  const [previewId, setPreviewId] = useState<number | null>(null)
  const [previewKey, setPreviewKey] = useState(0)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setPages(await api.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function onDelete(id?: number) {
    if (!id || !confirm('Delete this landing page?')) return
    await api.remove(id)
    if (previewId === id) setPreviewId(null)
    load()
  }

  async function onDeploy(p: LandingPage) {
    if (!p.id) return
    if (!p.publicDomain || !p.deployPath) {
      setError('Set Public domain + Server deploy path on Edit before Deploy.')
      return
    }
    if (!confirm(`Deploy “${p.name}” to ${p.deployPath}?`)) return
    setBusyId(p.id)
    setError('')
    setFlash('')
    try {
      const r = await api.deploy(p.id)
      setFlash(`${r.message}\n${r.campaignUrl || ''}`)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deploy failed')
    } finally {
      setBusyId(null)
    }
  }

  async function onUiChange(p: LandingPage, next: UiTemplate) {
    if (!p.id) return
    setBusyId(p.id)
    setError('')
    try {
      const saved = await api.updateUiTemplate(p.id, next)
      setPages((list) => list.map((row) => (row.id === p.id ? { ...row, ...saved } : row)))
      setPreviewId(p.id)
      setPreviewKey((k) => k + 1)
      setFlash(`UI updated → ${uiTemplateLabel(next)}. Redeploy / export to push to server.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'UI update failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page wide">
      <header className="topbar">
        <h1>LP Studio</h1>
        <Link className="btn primary" to="/new">
          New LP
        </Link>
      </header>

      {error && <div className="banner error">{error}</div>}
      {flash && (
        <pre className="banner" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
          {flash}
        </pre>
      )}

      {loading && <p className="muted">Loading…</p>}

      {!loading && pages.length === 0 && (
        <div className="empty">No landing pages yet. Click “New LP”.</div>
      )}

      {!loading && pages.length > 0 && (
        <div className="dash-list">
          {pages.map((p) => {
            const live = liveBase({
              publicDomain: p.publicDomain,
              urlPath: p.urlPath,
              slug: p.slug,
              serveAtRoot: p.serveAtRoot,
            })
            const camp = campaignUrl({
              publicDomain: p.publicDomain,
              urlPath: p.urlPath,
              slug: p.slug,
              serveAtRoot: p.serveAtRoot,
              platform: p.platform,
            })
            const open = previewId === p.id
            return (
              <article key={p.id} className="dash-card">
                <div className="dash-card-main">
                  <div>
                    <h2>{p.name}</h2>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                      /{p.slug} · {p.platform} · {p.apiProvider}
                      {p.deployPath ? ` · ${p.deployPath}` : ''}
                    </p>
                    {live && (
                      <p style={{ margin: '8px 0 0', fontSize: '0.82rem', wordBreak: 'break-all' }}>
                        Live:{' '}
                        <a href={live} target="_blank" rel="noreferrer">
                          {live}
                        </a>
                      </p>
                    )}
                    {camp && (
                      <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                        Campaign: {camp}
                      </p>
                    )}
                  </div>
                  <div className="actions">
                    <Link className="btn linkish" to={`/edit/${p.id}`}>
                      Edit
                    </Link>
                    <button
                      className="btn linkish"
                      type="button"
                      onClick={() => setPreviewId(open ? null : p.id!)}
                    >
                      {open ? 'Hide UI' : 'Show UI'}
                    </button>
                    <button
                      className="btn linkish"
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => onDeploy(p)}
                    >
                      {busyId === p.id ? '…' : 'Deploy'}
                    </button>
                    <a className="btn linkish" href={api.exportUrl(p.id!)}>
                      Export
                    </a>
                    <button
                      className="btn linkish danger"
                      type="button"
                      onClick={() => onDelete(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="dash-ui-block">
                  <div className="muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>
                    UI template — change here updates dashboard + export layout
                  </div>
                  <UiTemplatePicker
                    value={p.uiTemplate}
                    disabled={busyId === p.id}
                    onChange={(next) => onUiChange(p, next)}
                  />
                  {open && (
                    <LpUiPreview
                      id={p.id}
                      refreshKey={`${p.uiTemplate}-${previewKey}`}
                      title={`${uiTemplateLabel(p.uiTemplate)} preview`}
                    />
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
