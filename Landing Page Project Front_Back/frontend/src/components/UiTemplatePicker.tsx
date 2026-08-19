import type { UiTemplate } from '../api'

const TEMPLATES: Array<{
  id: UiTemplate
  label: string
  blurb: string
  tone: 'google' | 'propeller'
}> = [
  {
    id: 'GOOGLE_MOBILE',
    label: 'Google mobile',
    blurb: 'Dark mobile flow · MSISDN → PIN · thank you',
    tone: 'google',
  },
  {
    id: 'PROPELLER_MOVSTREAM',
    label: 'Propeller movstream',
    blurb: 'Movstream style · index + PIN page',
    tone: 'propeller',
  },
]

export function uiTemplateLabel(id?: string) {
  return TEMPLATES.find((t) => t.id === id)?.label || id || '—'
}

type Props = {
  value: UiTemplate
  onChange: (next: UiTemplate) => void
  disabled?: boolean
}

/** Visual UI template picker — used on form + dashboard */
export default function UiTemplatePicker({ value, onChange, disabled }: Props) {
  return (
    <div className="ui-picker" role="radiogroup" aria-label="UI template">
      {TEMPLATES.map((t) => {
        const active = value === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            className={`ui-card ${t.tone} ${active ? 'active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <div className="ui-card-screen" aria-hidden>
              {t.tone === 'google' ? (
                <>
                  <div className="ui-fake-title" />
                  <div className="ui-fake-field" />
                  <div className="ui-fake-btn" />
                </>
              ) : (
                <>
                  <div className="ui-fake-hero" />
                  <div className="ui-fake-field light" />
                  <div className="ui-fake-btn accent" />
                </>
              )}
            </div>
            <div className="ui-card-meta">
              <strong>{t.label}</strong>
              <span>{t.blurb}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
