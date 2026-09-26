import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

/**
 * Open a URL outside the portal.
 *
 * In the native app the WebView must not navigate away from the bundled
 * portal (there is no back-out), so the system browser sheet is used.
 * On the web a plain new tab is fine.
 */
export async function openExternal(url: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
        await Browser.open({ url, presentationStyle: 'popover' })
        return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
}

export const ELAB_WEBSITE_URL = 'https://elabsolution.org'
export const ELAB_CONTACT_URL = 'https://elabsolution.org/contact'
