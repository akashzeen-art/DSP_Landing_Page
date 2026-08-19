import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, emptyLandingPage, type LandingPage, type Operator, type UiTemplate } from '../api'
import { campaignUrl, liveBase } from '../campaignUrls'
import UiTemplatePicker from '../components/UiTemplatePicker'
import LpUiPreview from '../components/LpUiPreview'

function buildMsisdnRegex(startsWith: string, length: number): string {
  const digits = startsWith.replace(/[^0-9]/g, '')
  const unique = [...new Set(digits.split(''))].join('')
  const len = Math.max(1, Number(length) || 1)
  const rest = Math.max(0, len - 1)
  if (!unique) return `^[0-9]{${len}}$`
  if (unique.length === 1) return `^${unique}[0-9]{${rest}}$`
  return `^[${unique}][0-9]{${rest}}$`
}

function parseStartsWith(regex: string): string {
  if (!regex) return '5'
  const multi = regex.match(/^\^\[([0-9]+)\]/)
  if (multi) return multi[1].split('').join(',')
  const single = regex.match(/^\^([0-9])/)
  if (single) return single[1]
  return '5'
}

const PROPELLER_DEFAULTS = {
  propellerAid: '3898869',
  propellerTid: '154120',
  propellerPid: '',
  propellerPayout: '1',
  propellerPostbackUrl: 'https://ad.propellerads.com/conversion.php',
}

export default function LandingPageForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [form, setForm] = useState<LandingPage>(() => emptyLandingPage())
  const [startsWith, setStartsWith] = useState('5')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployMsg, setDeployMsg] = useState('')
  const [previewKey, setPreviewKey] = useState(0)

  const previewLive = liveBase({
    publicDomain: form.publicDomain,
    urlPath: form.urlPath,
    slug: form.slug,
    serveAtRoot: form.serveAtRoot,
  })
  const previewCampaign = campaignUrl({
    publicDomain: form.publicDomain,
    urlPath: form.urlPath,
    slug: form.slug,
    serveAtRoot: form.serveAtRoot,
    platform: form.platform,
  })

  useEffect(() => {
    if (!id) return
    api
      .get(Number(id))
      .then((lp) => {
        setForm(lp)
        setStartsWith(parseStartsWith(lp.msisdnRegex))
      })
      .catch((e) => setError(e.message))
  }, [id])

  function set<K extends keyof LandingPage>(key: K, value: LandingPage[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onUiTemplateChange(next: UiTemplate) {
    set('uiTemplate', next)
    if (editing && id) {
      try {
        const saved = await api.updateUiTemplate(Number(id), next)
        setForm((f) => ({ ...f, ...saved, uiTemplate: next }))
        setPreviewKey((k) => k + 1)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'UI update failed')
      }
    }
  }

  function updateNumberRule(nextStarts: string, nextLen: number) {
    setStartsWith(nextStarts)
    setForm((f) => ({
      ...f,
      msisdnLength: nextLen,
      msisdnRegex: buildMsisdnRegex(nextStarts, nextLen),
    }))
  }

  function onPlatformChange(platform: LandingPage['platform']) {
    setForm((f) => {
      const next = { ...f, platform }
      if (platform === 'GOOGLE') {
        next.uiTemplate = 'GOOGLE_MOBILE'
        next.trackingParams = 'clickid,click_id,gclid,token'
      } else if (platform === 'PROPELLER') {
        next.uiTemplate = 'PROPELLER_MOVSTREAM'
        next.trackingParams = 'clickid,click_id,token,zoneid'
        next.propellerAid = f.propellerAid || PROPELLER_DEFAULTS.propellerAid
        next.propellerTid = f.propellerTid || PROPELLER_DEFAULTS.propellerTid
        next.propellerPayout = f.propellerPayout || PROPELLER_DEFAULTS.propellerPayout
        next.propellerPostbackUrl = f.propellerPostbackUrl || PROPELLER_DEFAULTS.propellerPostbackUrl
      } else {
        // OTHER / future platforms — use same S2S postback fields
        next.trackingParams = f.trackingParams || 'clickid,click_id,token'
        next.propellerPostbackUrl = f.propellerPostbackUrl || ''
      }
      return next
    })
  }

  function onApiChange(apiProvider: LandingPage['apiProvider']) {
    setForm((f) => {
      const next = { ...f, apiProvider }
      if (apiProvider === 'ADPOKE') {
        // Gautam docs
        next.apiBaseUrl = 'http://64.225.87.221/adpoke/cnt/inapp'
        next.sendPinPath = 'sendotp'
        next.verifyPinPath = 'validateotp'
        next.statusPath = 'statuscheck'
        next.portalPath = 'portal'
        next.pinParamName = 'param1'
      } else if (apiProvider === 'ZEEN') {
        next.apiBaseUrl = 'http://64.225.85.48/adnet'
        next.sendPinPath = 'sendpin'
        next.verifyPinPath = 'verifypin'
        next.statusPath = 'checkstatus'
        next.portalPath = 'Promo/Api/CPportal'
        next.pinParamName = 'otp'
      } else if (apiProvider === 'GECMP') {
        // Sanket docs (e.g. Georgia Beeline)
        next.apiBaseUrl = 'http://159.89.163.174/prod/GEcmp'
        next.sendPinPath = 'sendPIN'
        next.verifyPinPath = 'verifyPIN'
        next.statusPath = 'status'
        next.portalPath = 'redirect'
        next.pinParamName = 'pin'
      }
      return next
    })
  }

  function updateOp(index: number, patch: Partial<Operator>) {
    setForm((f) => {
      const operators = [...f.operators]
      operators[index] = { ...operators[index], ...patch }
      return { ...f, operators }
    })
  }

  function addOperator() {
    setForm((f) => ({
      ...f,
      operators: [
        ...f.operators,
        {
          name: '',
          code: `op${f.operators.length + 1}`,
          adid: '',
          cmpid: '',
          priceLabel: '',
          unsubKeyword: '',
          unsubShortcode: '',
          sortOrder: f.operators.length,
          active: true,
        },
      ],
    }))
  }

  function removeOp(index: number) {
    setForm((f) => ({ ...f, operators: f.operators.filter((_, i) => i !== index) }))
  }

  function applyPreset(kind: string) {
    if (!kind) return
    const base = emptyLandingPage()
    if (kind === 'ps-google') {
      setStartsWith('5')
      setForm({
        ...base,
        name: 'Palestine Google',
        slug: 'psgog-new',
        platform: 'GOOGLE',
        uiTemplate: 'GOOGLE_MOBILE',
        apiProvider: 'ADPOKE',
        countryCode: '970',
        dialPrefix: '+970',
        msisdnRegex: buildMsisdnRegex('5', 9),
        msisdnLength: 9,
        requireOperator: true,
        trackingParams: 'clickid,click_id,gclid,token',
        googleHeadScript: '',
        googleBodyScript: '',
        operators: [
          { name: 'Ooredoo PS', code: 'ooredoo', adid: '232', cmpid: '469', priceLabel: 'NIS 1.5 / day', unsubKeyword: 'NS', unsubShortcode: '7902', active: true },
          { name: 'Jawwal PS', code: 'jawwal', adid: '232', cmpid: '468', priceLabel: 'NIS 1.16 / day', unsubKeyword: 'SP', unsubShortcode: '37637', active: true },
        ],
        pricePointEn: 'Ooredoo PS: NIS 1.5 / day — Jawwal PS: NIS 1.16 / day',
        disclaimerEn:
          'On subscribing to Gamers Paradise, you will be charged according to your mobile operator.\n\nOoredoo Palestine: NIS 1.5/day. Unsub NS → 7902.\nJawwal Palestine: NIS 1.16/day. Unsub SP → 37637.',
      })
    } else if (kind === 'oman-prop') {
      setStartsWith('7,9')
      setForm({
        ...base,
        ...PROPELLER_DEFAULTS,
        name: 'Oman Propeller',
        slug: 'omanprop-new',
        platform: 'PROPELLER',
        uiTemplate: 'PROPELLER_MOVSTREAM',
        apiProvider: 'ZEEN',
        countryCode: '968',
        dialPrefix: '+968',
        msisdnRegex: buildMsisdnRegex('7,9', 8),
        msisdnLength: 8,
        serviceName: 'ZD Gamez',
        pageTitle: 'ZD Gamez',
        apiBaseUrl: 'http://64.225.85.48/adnet',
        sendPinPath: 'sendpin',
        verifyPinPath: 'verifypin',
        statusPath: 'checkstatus',
        portalPath: 'Promo/Api/CPportal',
        pinParamName: 'otp',
        requireOperator: false,
        trackingParams: 'clickid,click_id,token,zoneid',
        operators: [
          {
            name: 'Omantel',
            code: 'omantel',
            adid: '2203',
            cmpid: '2203',
            priceLabel: '0.25 OMR / day',
            unsubKeyword: 'UNSUB IVID',
            unsubShortcode: '92149',
            active: true,
          },
        ],
        pricePointEn: 'Omantel: 0.25 OMR / day',
        disclaimerEn: 'ZD Gamez — Omantel: 0.25 OMR/day. Cancel: UNSUB IVID → 92149.',
      })
    } else if (kind === 'ps-prop') {
      setStartsWith('5')
      setForm({
        ...base,
        ...PROPELLER_DEFAULTS,
        name: 'Palestine Propeller',
        slug: 'palestine-prop-new',
        platform: 'PROPELLER',
        uiTemplate: 'PROPELLER_MOVSTREAM',
        apiProvider: 'ADPOKE',
        countryCode: '970',
        dialPrefix: '+970',
        msisdnRegex: buildMsisdnRegex('5', 9),
        msisdnLength: 9,
        requireOperator: true,
        trackingParams: 'clickid,click_id,token,zoneid',
        operators: [
          { name: 'Ooredoo PS', code: 'ooredoo', adid: '231', cmpid: '466', priceLabel: 'NIS 1.5 / day', unsubKeyword: 'NS', unsubShortcode: '7902', active: true },
          { name: 'Jawwal PS', code: 'jawwal', adid: '231', cmpid: '465', priceLabel: 'NIS 1.16 / day', unsubKeyword: 'SP', unsubShortcode: '37637', active: true },
        ],
        pricePointEn: 'Ooredoo PS: NIS 1.5 / day — Jawwal PS: NIS 1.16 / day',
        disclaimerEn: 'Gamers Paradise — Ooredoo NIS 1.5/day (NS→7902). Jawwal NIS 1.16/day (SP→37637).',
      })
    } else if (kind === 'ge-beeline') {
      setStartsWith('5')
      setForm({
        ...base,
        name: 'Georgia Beeline AudioBooks',
        slug: 'ge-audiobooks',
        publicDomain: 'ge-playcontent.com',
        urlPath: 'ge-audiobooks',
        deployPath: '/var/www/vaszeen/zeen_lp/georgia/ge-audiobooks',
        serveAtRoot: false,
        platform: 'GOOGLE',
        uiTemplate: 'GOOGLE_MOBILE',
        apiProvider: 'GECMP',
        countryCode: '995',
        dialPrefix: '+995',
        msisdnRegex: buildMsisdnRegex('5', 9),
        msisdnLength: 9,
        pinLength: 4,
        serviceName: 'AudioBooks',
        pageTitle: 'Get Access On Your Mobile',
        apiBaseUrl: 'http://159.89.163.174/prod/GEcmp',
        sendPinPath: 'sendPIN',
        verifyPinPath: 'verifyPIN',
        statusPath: 'status',
        portalPath: 'redirect',
        pinParamName: 'pin',
        requireOperator: false,
        trackingParams: 'clickid,click_id,gclid,token',
        googleHeadScript: '',
        googleBodyScript: '',
        operators: [
          {
            name: 'Beeline',
            code: 'beeline',
            adid: '489',
            cmpid: '489',
            priceLabel: '1 GEL / day',
            unsubKeyword: '',
            unsubShortcode: '',
            active: true,
          },
        ],
        pricePointEn: 'Beeline: 1 GEL / day',
        disclaimerEn: 'AudioBooks — Beeline Georgia: 1 GEL per day. Subscription renews until cancelled.',
      })
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    if (!form.operators.length) {
      setError('Add at least one operator.')
      setSaving(false)
      return
    }
    if (form.platform === 'GOOGLE' && !(form.googleHeadScript || '').trim()) {
      setError('Paste the Google head script for Google platform.')
      setSaving(false)
      return
    }
    if (form.platform === 'PROPELLER' && !form.propellerAid) {
      setError('Propeller AID is required for Propeller platform.')
      setSaving(false)
      return
    }
    try {
      if (editing && id) {
        await api.update(Number(id), form)
      } else {
        await api.create(form)
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onDeploy() {
    setDeploying(true)
    setDeployMsg('')
    setError('')
    try {
      if (!form.publicDomain?.trim()) throw new Error('Set Public domain first.')
      if (!form.deployPath?.trim()) throw new Error('Set Server deploy path first.')
      if (!form.operators.length) throw new Error('Add at least one operator.')

      let saved = form
      if (editing && id) {
        saved = await api.update(Number(id), form)
      } else {
        saved = await api.create(form)
        navigate(`/edit/${saved.id}`, { replace: true })
      }
      setForm(saved)
      const result = await api.deploy(saved.id!)
      setDeployMsg(
        `${result.message}\nCampaign URL: ${result.campaignUrl || previewCampaign}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deploy failed')
    } finally {
      setDeploying(false)
    }
  }

  return (
    <div className="page wide">
      <Link to="/" className="back">
        ← All landing pages
      </Link>
      <header className="topbar">
        <h1>{editing ? 'Edit LP' : 'New LP'}</h1>
      </header>

      {!editing && (
        <div className="preset-bar">
          <span className="muted">Start from</span>
          <select
            defaultValue=""
            onChange={(e) => {
              applyPreset(e.target.value)
              e.target.value = ''
            }}
          >
            <option value="" disabled>
              Choose preset…
            </option>
            <option value="ps-google">Palestine Google (Gautam · Adpoke)</option>
            <option value="oman-prop">Oman Propeller (Zeen)</option>
            <option value="ps-prop">Palestine Propeller (Gautam · Adpoke)</option>
            <option value="ge-beeline">Georgia Beeline (Sanket · GEcmp)</option>
          </select>
        </div>
      )}

      {error && <div className="banner error">{error}</div>}

      <form className="form" onSubmit={onSubmit}>
        <section className="panel">
          <h3>1. Basic</h3>
          <div className="grid2">
            <label>
              Name
              <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </label>
            <label>
              Slug (folder name)
              <input value={form.slug} onChange={(e) => set('slug', e.target.value)} required placeholder="psgog01" />
            </label>
            <label>
              Public domain
              <input
                value={form.publicDomain || ''}
                onChange={(e) => set('publicDomain', e.target.value)}
                placeholder="ge-playcontent.com"
              />
            </label>
            <label>
              URL path
              <input
                value={form.urlPath || ''}
                onChange={(e) => set('urlPath', e.target.value)}
                placeholder="ge-audiobooks (blank = slug)"
                disabled={!!form.serveAtRoot}
              />
            </label>
            <label>
              Platform
              <select value={form.platform} onChange={(e) => onPlatformChange(e.target.value as LandingPage['platform'])}>
                <option value="GOOGLE">Google</option>
                <option value="PROPELLER">Propeller</option>
                <option value="OTHER">Other (future)</option>
              </select>
            </label>
            <label>
              API doc type
              <select value={form.apiProvider} onChange={(e) => onApiChange(e.target.value as LandingPage['apiProvider'])}>
                <option value="ADPOKE">Gautam · Adpoke</option>
                <option value="GECMP">Sanket · GEcmp</option>
                <option value="ZEEN">Zeen Digital</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </label>
            <label>
              Service name
              <input value={form.serviceName} onChange={(e) => set('serviceName', e.target.value)} />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={!!form.serveAtRoot}
                onChange={(e) => set('serveAtRoot', e.target.checked)}
              />
              Serve at domain root (no /path)
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ marginBottom: 8 }}>
              UI template (same choice shows on dashboard + export)
            </div>
            <UiTemplatePicker value={form.uiTemplate} onChange={onUiTemplateChange} />
            <LpUiPreview id={form.id} refreshKey={`${form.uiTemplate}-${previewKey}`} />
          </div>

          {!!previewLive && (
            <div className="muted" style={{ marginBottom: 0, marginTop: 12 }}>
              <div>
                Live: <code>{previewLive}</code>
              </div>
              <div>
                {form.platform} campaign:{' '}
                <code>{previewCampaign}</code>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <h3>2. Mobile number</h3>
          <div className="grid2">
            <label>
              Country code
              <input value={form.countryCode} onChange={(e) => set('countryCode', e.target.value)} />
            </label>
            <label>
              Dial prefix
              <input value={form.dialPrefix} onChange={(e) => set('dialPrefix', e.target.value)} />
            </label>
            <label>
              Number starts with
              <input
                value={startsWith}
                placeholder="5 or 7,9"
                onChange={(e) => updateNumberRule(e.target.value, form.msisdnLength)}
              />
            </label>
            <label>
              Number length
              <input
                type="number"
                min={1}
                max={15}
                value={form.msisdnLength}
                onChange={(e) => updateNumberRule(startsWith, Number(e.target.value))}
              />
            </label>
            <label>
              PIN length
              <input type="number" value={form.pinLength} onChange={(e) => set('pinLength', Number(e.target.value))} />
            </label>
            <label className="check">
              <input type="checkbox" checked={form.requireOperator} onChange={(e) => set('requireOperator', e.target.checked)} />
              Show operator choice
            </label>
          </div>
        </section>

        <section className="panel">
          <h3>3. API</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            {form.apiProvider === 'ADPOKE' && 'Gautam doc: sendotp / validateotp / statuscheck / portal (adid, cmpid, token, param1)'}
            {form.apiProvider === 'GECMP' && 'Sanket doc: sendPIN / verifyPIN / status / redirect (cid, msisdn+country, ip, sessionKey, pin)'}
            {form.apiProvider === 'ZEEN' && 'Zeen doc: sendpin / verifypin / checkstatus / portal (cid, click_id, otp)'}
            {form.apiProvider === 'CUSTOM' && 'Set paths manually for a new integration doc.'}
          </p>
          <div className="grid2">
            <label className="full">
              Base URL
              <input value={form.apiBaseUrl} onChange={(e) => set('apiBaseUrl', e.target.value)} required />
            </label>
            <label>
              Send PIN path
              <input value={form.sendPinPath} onChange={(e) => set('sendPinPath', e.target.value)} />
            </label>
            <label>
              Verify PIN path
              <input value={form.verifyPinPath} onChange={(e) => set('verifyPinPath', e.target.value)} />
            </label>
            <label>
              Status path
              <input value={form.statusPath} onChange={(e) => set('statusPath', e.target.value)} />
            </label>
            <label>
              Portal / redirect path
              <input value={form.portalPath} onChange={(e) => set('portalPath', e.target.value)} />
            </label>
            <label>
              PIN field name
              <input value={form.pinParamName} onChange={(e) => set('pinParamName', e.target.value)} placeholder="param1 / otp / pin" />
            </label>
            <label className="full">
              Click ID URL keys
              <input
                value={form.trackingParams || ''}
                onChange={(e) => set('trackingParams', e.target.value)}
                placeholder="clickid,gclid,token"
              />
            </label>
          </div>
        </section>

        {/* Platform tracking — only from this form */}
        {form.platform === 'GOOGLE' && (
          <section className="panel">
            <h3>4. Google tags</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Paste full scripts once. Export adds <b>head</b> into every page &lt;head&gt; and <b>body</b> into every page &lt;body&gt; (index + thank you).
            </p>
            <div className="grid2">
              <label className="full">
                Head tag script
                <textarea
                  rows={14}
                  spellCheck={false}
                  value={form.googleHeadScript || ''}
                  onChange={(e) => set('googleHeadScript', e.target.value)}
                  placeholder="Paste full Google head tags here (gtag.js + conversions)…"
                  style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.8rem' }}
                />
              </label>
              <label className="full">
                Body tag script
                <textarea
                  rows={8}
                  spellCheck={false}
                  value={form.googleBodyScript || ''}
                  onChange={(e) => set('googleBodyScript', e.target.value)}
                  placeholder="Paste body backup script here…"
                  style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.8rem' }}
                />
              </label>
            </div>
          </section>
        )}

        {(form.platform === 'PROPELLER' || form.platform === 'OTHER') && (
          <section className="panel">
            <h3>4. {form.platform === 'PROPELLER' ? 'Propeller postback' : 'Platform postback'}</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Fired after successful PIN. <b>visitor_id</b> = same value as clickid from the LP URL.
            </p>
            <div className="grid2">
              <label className="full">
                Postback URL
                <input
                  value={form.propellerPostbackUrl || ''}
                  onChange={(e) => set('propellerPostbackUrl', e.target.value)}
                  placeholder="https://ad.propellerads.com/conversion.php"
                />
              </label>
              <label>
                AID
                <input value={form.propellerAid || ''} onChange={(e) => set('propellerAid', e.target.value)} required={form.platform === 'PROPELLER'} />
              </label>
              <label>
                TID
                <input value={form.propellerTid || ''} onChange={(e) => set('propellerTid', e.target.value)} />
              </label>
              <label>
                PID
                <input value={form.propellerPid || ''} onChange={(e) => set('propellerPid', e.target.value)} />
              </label>
              <label>
                Payout
                <input value={form.propellerPayout || ''} onChange={(e) => set('propellerPayout', e.target.value)} />
              </label>
            </div>
          </section>
        )}

        <section className="panel">
          <h3>5. Text</h3>
          <div className="grid2">
            <label className="full">
              Page title
              <input value={form.pageTitle} onChange={(e) => set('pageTitle', e.target.value)} />
            </label>
            <label className="full">
              Price line
              <input value={form.pricePointEn || ''} onChange={(e) => set('pricePointEn', e.target.value)} />
            </label>
            <label className="full">
              Disclaimer
              <textarea rows={4} value={form.disclaimerEn || ''} onChange={(e) => set('disclaimerEn', e.target.value)} />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>6. Operators</h3>
            <button type="button" className="btn" onClick={addOperator}>
              Add
            </button>
          </div>
          {form.operators.length === 0 && <p className="muted">Add at least one operator (adid/cid + cmpid).</p>}
          {form.operators.map((op, i) => (
            <div className="op-block" key={i}>
              <div className="grid2">
                <label>
                  Name
                  <input value={op.name} onChange={(e) => updateOp(i, { name: e.target.value })} required />
                </label>
                <label>
                  Code
                  <input value={op.code} onChange={(e) => updateOp(i, { code: e.target.value })} required />
                </label>
                <label>
                  {form.apiProvider === 'GECMP' || form.apiProvider === 'ZEEN' ? 'cid' : 'adid'}
                  <input value={op.adid} onChange={(e) => updateOp(i, { adid: e.target.value, ...(form.apiProvider === 'GECMP' ? { cmpid: e.target.value } : {}) })} required />
                </label>
                {form.apiProvider !== 'GECMP' && (
                  <label>
                    cmpid
                    <input value={op.cmpid} onChange={(e) => updateOp(i, { cmpid: e.target.value })} required />
                  </label>
                )}
                <label>
                  Price
                  <input value={op.priceLabel || ''} onChange={(e) => updateOp(i, { priceLabel: e.target.value })} />
                </label>
                <label>
                  Unsub keyword
                  <input value={op.unsubKeyword || ''} onChange={(e) => updateOp(i, { unsubKeyword: e.target.value })} placeholder="NS" />
                </label>
                <label>
                  Unsub shortcode
                  <input value={op.unsubShortcode || ''} onChange={(e) => updateOp(i, { unsubShortcode: e.target.value })} placeholder="7902" />
                </label>
              </div>
              <button type="button" className="btn linkish danger" onClick={() => removeOp(i)} style={{ marginTop: 8 }}>
                Remove
              </button>
            </div>
          ))}
        </section>

        <section className="panel">
          <h3>7. Deploy</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Enter domain + server path, then <b>Save &amp; Deploy</b> uploads the generated LP over SFTP
            (nginx for a <em>new</em> domain is still one-time on the server — snippet is included in export).
          </p>
          <div className="grid2">
            <label className="full">
              Server deploy path (absolute)
              <input
                value={form.deployPath || ''}
                onChange={(e) => set('deployPath', e.target.value)}
                placeholder="/var/www/vaszeen/zeen_lp/georgia/ge-audiobooks"
              />
            </label>
          </div>
          {deployMsg && (
            <pre className="banner" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
              {deployMsg}
            </pre>
          )}
          {form.lastDeployMessage && !deployMsg && (
            <p className="muted">Last deploy: {form.lastDeployMessage}</p>
          )}
        </section>

        <div className="footer-actions">
          <button className="btn primary" type="submit" disabled={saving || deploying}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn" type="button" disabled={saving || deploying} onClick={onDeploy}>
            {deploying ? 'Deploying…' : 'Save & Deploy'}
          </button>
          {(editing || form.id) && form.id && (
            <a className="btn" href={api.exportUrl(form.id)}>
              Export ZIP
            </a>
          )}
          <Link className="btn" to="/">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
