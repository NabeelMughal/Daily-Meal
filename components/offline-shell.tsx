'use client'

import { useEffect, useState } from 'react'
import { Download, WifiOff, X } from 'lucide-react'

export function OfflineShell() {
  const [offline, setOffline] = useState(false)
  const [installEvent, setInstallEvent] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update(); window.addEventListener('online', update); window.addEventListener('offline', update)
    const onInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event) }
    window.addEventListener('beforeinstallprompt', onInstall)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('beforeinstallprompt', onInstall) }
  }, [])
  async function install() { if (!installEvent) return; await installEvent.prompt(); setInstallEvent(null) }
  return <>
    {offline && <div role="status" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-foreground px-4 py-2 text-center text-sm text-background"><WifiOff size={15} /> You&apos;re offline. Your saved favorites are still available.</div>}
    {installEvent && !dismissed && !offline && <div className="fixed bottom-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl"><div className="flex-1"><p className="font-medium">Keep crumb. close</p><p className="text-sm text-muted-foreground">Install it for a faster, offline-friendly kitchen.</p></div><button onClick={install} className="flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm text-primary-foreground"><Download size={15} /> Install</button><button aria-label="Dismiss install prompt" onClick={() => setDismissed(true)} className="rounded-full p-2 hover:bg-muted"><X size={16} /></button></div>}
  </>
}

export function ServiceWorkerRegistration() { useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {}) }, []); return null }
