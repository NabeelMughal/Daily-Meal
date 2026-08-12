'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Check, LogOut, Save, Trash2 } from 'lucide-react'
import { clearOfflineData } from '@/lib/offline-db'

export function AccountForm({ email, initialName, userId }: { email: string; initialName: string; userId: string }) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').upsert({ id: user.id, full_name: name.trim() || null })
    setBusy(false); setSaved(true); setTimeout(() => setSaved(false), 1800)
  }
  async function clearData() { if (window.confirm('Remove saved offline favorites from this device?')) await clearOfflineData(userId) }
  async function signOut() { await clearOfflineData(userId); await createClient().auth.signOut(); router.push('/') ; router.refresh() }
  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground sm:px-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-12">
        <button onClick={() => router.push('/')} className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft size={16} /> Back to recipes</button>
        <section className="flex flex-col gap-8">
          <div><p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Your kitchen</p><h1 className="mt-3 font-serif text-5xl tracking-tight">Account settings</h1></div>
          <div className="flex flex-col gap-6 border-t border-border pt-8">
            <label className="flex flex-col gap-2 text-sm"><span className="font-medium">Name</span><input value={name} onChange={e => setName(e.target.value)} className="max-w-md rounded-xl border border-input bg-card px-4 py-3 outline-none ring-primary transition focus:ring-2" placeholder="How should we call you?" /></label>
            <label className="flex flex-col gap-2 text-sm"><span className="font-medium">Email</span><input value={email} readOnly className="max-w-md rounded-xl border border-input bg-muted px-4 py-3 text-muted-foreground" /></label>
            <button onClick={save} disabled={busy} className="flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60">{saved ? <Check size={16} /> : <Save size={16} />}{saved ? 'Saved' : busy ? 'Saving...' : 'Save changes'}</button>
          </div>
          <div className="border-t border-border pt-8"><div className="flex flex-wrap gap-4"><button onClick={clearData} className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><Trash2 size={16} /> Clear offline data</button><button onClick={signOut} className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-destructive"><LogOut size={16} /> Sign out</button></div><p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">Favorites are stored privately on this device so you can still cook without a connection.</p></div>
        </section>
      </div>
    </main>
  )
}
