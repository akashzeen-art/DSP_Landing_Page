/** Build live + campaign URLs from domain / path / platform */

export type PlatformType = 'GOOGLE' | 'PROPELLER' | 'OTHER'

export function normalizeHost(domain?: string): string {
  if (!domain) return ''
  let d = domain.trim().toLowerCase().replace(/^https?:\/\//, '')
  const slash = d.indexOf('/')
  if (slash >= 0) d = d.slice(0, slash)
  return d.replace(/\/+$/, '')
}

export function normalizeUrlPath(urlPath: string | undefined, slug: string, serveAtRoot?: boolean): string {
  if (serveAtRoot) return ''
  let p = (urlPath && urlPath.trim()) || slug || ''
  return p.replace(/^\/+/, '').replace(/\/+$/, '')
}

export function liveBase(opts: {
  publicDomain?: string
  urlPath?: string
  slug: string
  serveAtRoot?: boolean
}): string {
  const host = normalizeHost(opts.publicDomain)
  if (!host) return ''
  const path = normalizeUrlPath(opts.urlPath, opts.slug, opts.serveAtRoot)
  return path ? `https://${host}/${path}` : `https://${host}`
}

export function campaignUrl(
  opts: {
    publicDomain?: string
    urlPath?: string
    slug: string
    serveAtRoot?: boolean
    platform: PlatformType
  },
): string {
  const base = liveBase(opts)
  if (!base) return ''
  if (opts.platform === 'PROPELLER') return `${base}?clickid=\${SUBID}&zoneid={zone_id}`
  if (opts.platform === 'OTHER') return `${base}?clickid={clickid}`
  return `${base}?clickid={gclid}`
}
