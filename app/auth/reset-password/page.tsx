'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long.')
      setBusy(false)
      return
    }

    if (password !== confirmPassword) {
      setMessage('New passwords do not match.')
      setBusy(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error
      setSuccess(true)
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 2000)
    } catch (err: any) {
      console.error(err)
      setMessage(err.message ?? 'Failed to update your password. Please try again.')
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:py-10 text-foreground overflow-x-hidden">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm transition-all duration-300">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          crumb<span className="text-primary">.</span>
        </Link>

        {success ? (
          <div className="mt-8 flex flex-col items-center text-center animate-in fade-in duration-300">
            <div className="flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary mb-4 animate-bounce">
              <Check size={24} />
            </div>
            <h1 className="font-serif text-2xl tracking-tight text-foreground">Password updated!</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground font-light">
              Your password has been successfully reset. Redirecting you to your cookbook…
            </p>
          </div>
        ) : (
          <>
            <p className="eyebrow mt-8 sm:mt-10">Choose New Password</p>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight leading-tight text-balance">
              Set new password.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground font-light">
              Enter your new credentials below to regain access to your cookbook account.
            </p>

            <form onSubmit={submit} className="mt-6 sm:mt-8 flex flex-col gap-4">
              <label className="field-label">
                New Password
                <input 
                  required 
                  type="password" 
                  minLength={6}
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="field-input mt-1.5" 
                  placeholder="At least 6 characters"
                />
              </label>

              <label className="field-label">
                Confirm New Password
                <input 
                  required 
                  type="password" 
                  minLength={6}
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="field-input mt-1.5" 
                  placeholder="Re-enter new password"
                />
              </label>

              {message && (
                <p role="alert" className="text-xs text-destructive font-medium border border-destructive/10 bg-destructive/5 p-3 rounded-xl">
                  {message}
                </p>
              )}

              <button 
                disabled={busy} 
                className="rounded-full bg-primary hover:bg-primary/95 hover:shadow-sm px-5 py-3.5 font-medium text-primary-foreground disabled:opacity-60 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer animate-in fade-in"
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Updating password…
                  </>
                ) : (
                  'Update password'
                )}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
