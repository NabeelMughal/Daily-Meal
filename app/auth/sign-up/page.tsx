'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const router = useRouter(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(''); const { error } = await createClient().auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback` } }); setBusy(false); if (error) { setMessage(error.message.toLowerCase().includes('already') ? 'An account with that email already exists.' : 'Unable to create your account. Please check your details.'); return } router.push('/auth/sign-up-success') }
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:py-10 text-foreground overflow-x-hidden">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm transition-all duration-300">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          crumb<span className="text-primary">.</span>
        </Link>
        <p className="eyebrow mt-8 sm:mt-12">Join the table</p>
        <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight leading-tight text-balance">
          Make your cookbook yours.
        </h1>
        <form onSubmit={submit} className="mt-6 sm:mt-8 flex flex-col gap-3.5">
          <label className="field-label">
            Your name
            <input required value={name} onChange={(e) => setName(e.target.value)} className="field-input mt-1.5" />
          </label>
          <label className="field-label">
            Email
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input mt-1.5" />
          </label>
          <label className="field-label">
            Password
            <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field-input mt-1.5" />
          </label>
          {message && <p role="alert" className="text-sm text-destructive font-medium">{message}</p>}
          <button disabled={busy} className="rounded-full bg-primary hover:bg-primary/95 hover:shadow-sm px-5 py-3.5 font-medium text-primary-foreground disabled:opacity-60 active:scale-98 transition-all flex items-center justify-center gap-2">
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs sm:text-sm text-muted-foreground">
          Already have an account? <Link href="/auth/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
