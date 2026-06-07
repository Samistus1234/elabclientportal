const DEFAULT_COMMAND_CENTER_API_URL = 'https://fwmhfwprvqaovidykaqt.supabase.co/functions/v1'

export const COMMAND_CENTER_API_URL = (
  import.meta.env.VITE_COMMAND_CENTER_API_URL || DEFAULT_COMMAND_CENTER_API_URL
).replace(/\/+$/, '')

export const COMMAND_CENTER_API_KEY = (import.meta.env.VITE_COMMAND_CENTER_API_KEY || '').trim()

export function buildCommandCenterUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${COMMAND_CENTER_API_URL}${normalizedPath}`
}

export function commandCenterHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    'x-api-key': COMMAND_CENTER_API_KEY,
    ...extraHeaders,
  }
}
