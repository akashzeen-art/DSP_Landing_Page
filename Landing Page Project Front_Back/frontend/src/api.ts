export type PlatformType = 'GOOGLE' | 'PROPELLER' | 'OTHER'
export type ApiProvider = 'ADPOKE' | 'ZEEN' | 'GECMP' | 'CUSTOM'
export type UiTemplate = 'GOOGLE_MOBILE' | 'PROPELLER_MOVSTREAM'

export interface Operator {
  id?: number
  name: string
  code: string
  adid: string
  cmpid: string
  priceLabel?: string
  unsubKeyword?: string
  unsubShortcode?: string
  portalUrlOverride?: string
  sortOrder?: number
  active?: boolean
}

export interface LandingPage {
  id?: number
  name: string
  slug: string
  /** Live host e.g. ge-playcontent.com */
  publicDomain?: string
  /** URL path under domain (empty → slug, or root if serveAtRoot) */
  urlPath?: string
  /** Absolute server path e.g. /var/www/.../ge-audiobooks */
  deployPath?: string
  serveAtRoot?: boolean
  lastDeployedAt?: string
  lastDeployMessage?: string
  platform: PlatformType
  uiTemplate: UiTemplate
  apiProvider: ApiProvider
  countryCode: string
  dialPrefix: string
  msisdnRegex: string
  msisdnLength: number
  pinLength: number
  serviceName: string
  pageTitle: string
  disclaimerEn?: string
  disclaimerAr?: string
  pricePointEn?: string
  pricePointAr?: string
  apiBaseUrl: string
  sendPinPath: string
  verifyPinPath: string
  statusPath: string
  portalPath: string
  pinParamName: string
  googleHeadScript?: string
  googleBodyScript?: string
  propellerAid?: string
  propellerPid?: string
  propellerTid?: string
  propellerPayout?: string
  propellerPostbackUrl?: string
  trackingParams?: string
  requireOperator: boolean
  enableArabic: boolean
  published: boolean
  operators: Operator[]
  createdAt?: string
  updatedAt?: string
}

export interface DeployResult {
  success: boolean
  message: string
  deployPath?: string
  liveBase?: string
  campaignUrl?: string
  nginxSnippet?: string
  filesUploaded?: number
  urls?: Record<string, string>
}

export interface MetaResponse {
  platforms: string[]
  apiProviders: string[]
  uiTemplates: string[]
  presets: Array<Record<string, string>>
}

export function emptyLandingPage(): LandingPage {
  return {
    name: '',
    slug: '',
    publicDomain: '',
    urlPath: '',
    deployPath: '',
    serveAtRoot: false,
    platform: 'GOOGLE',
    uiTemplate: 'GOOGLE_MOBILE',
    apiProvider: 'ADPOKE',
    countryCode: '970',
    dialPrefix: '+970',
    msisdnRegex: '^5[0-9]{8}$',
    msisdnLength: 9,
    pinLength: 4,
    serviceName: 'Gamers Paradise',
    pageTitle: 'Get Access On Your Mobile',
    disclaimerEn: '',
    apiBaseUrl: 'http://64.225.87.221/adpoke/cnt/inapp',
    sendPinPath: 'sendotp',
    verifyPinPath: 'validateotp',
    statusPath: 'statuscheck',
    portalPath: 'portal',
    pinParamName: 'param1',
    googleHeadScript: '',
    googleBodyScript: '',
    propellerAid: '',
    propellerPid: '',
    propellerTid: '',
    propellerPayout: '1',
    propellerPostbackUrl: 'https://ad.propellerads.com/conversion.php',
    trackingParams: 'clickid,click_id,gclid,token',
    requireOperator: true,
    enableArabic: true,
    published: false,
    operators: [],
  }
}

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  if (!res.ok) {
    let msg = res.statusText
    try {
      const body = await res.json()
      msg = body.error || JSON.stringify(body)
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  meta: () => request<MetaResponse>('/meta'),
  list: () => request<LandingPage[]>('/landing-pages'),
  get: (id: number) => request<LandingPage>(`/landing-pages/${id}`),
  create: (body: LandingPage) =>
    request<LandingPage>('/landing-pages', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: LandingPage) =>
    request<LandingPage>(`/landing-pages/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) =>
    request<void>(`/landing-pages/${id}`, { method: 'DELETE' }),
  exportUrl: (id: number) => `${BASE}/landing-pages/${id}/export.zip`,
  previewUrl: (id: number) => `${BASE}/landing-pages/${id}/preview`,
  deployPreview: (id: number) => request<DeployResult>(`/landing-pages/${id}/deploy-preview`),
  deploy: (id: number) =>
    request<DeployResult>(`/landing-pages/${id}/deploy`, { method: 'POST' }),
  updateUiTemplate: (id: number, uiTemplate: UiTemplate) =>
    request<LandingPage>(`/landing-pages/${id}/ui-template`, {
      method: 'PATCH',
      body: JSON.stringify({ uiTemplate }),
    }),
}
