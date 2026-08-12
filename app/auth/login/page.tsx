'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if ((event.nativeEvent as SubmitEvent).isComposing || (event as any).keyCode === 229) return
    setBusy(true); setMessage('')
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) { setMessage(error.message.toLowerCase().includes('invalid') ? 'Invalid email or password.' : 'Something went wrong. Please try again.'); return }
    router.push('/')
    router.refresh()
  }
  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-foreground"><section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10"><Link href="/" className="font-serif text-2xl">crumb<span className="text-primary">.</span></Link><p className="eyebrow mt-12">Welcome back</p><h1 className="mt-3 font-serif text-4xl tracking-tight">Your kitchen is waiting.</h1><p className="mt-4 leading-7 text-muted-foreground">Sign in to keep your recipes private, organized, and close at hand.</p><form onSubmit={submit} className="mt-8 flex flex-col gap-4"><label className="field-label">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input mt-2" /></label><label className="field-label">Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field-input mt-2" /></label>{message && <p role="alert" className="text-sm text-destructive">{message}</p>}<button disabled={busy} className="rounded-full bg-primary px-5 py-3.5 font-medium text-primary-foreground disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button></form><p className="mt-6 text-center text-sm text-muted-foreground">New to crumb.? <Link href="/auth/sign-up" className="text-primary hover:underline">Create an account</Link></p></section></main>
}
