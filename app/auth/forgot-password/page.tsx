'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    
    const supabase = createClient()
    const redirectToUrl = `${window.location.origin}/auth/reset-password`
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectToUrl,
      })

      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      console.error(err)
      setMessage(err.message ?? 'Failed to send recovery email. Please check your email and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:py-10 text-foreground overflow-x-hidden">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm transition-all duration-300">
        <Link href="/auth/login" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
        
        <Link href="/" className="font-serif text-2xl tracking-tight">
          crumb<span className="text-primary">.</span>
        </Link>
        
        {success ? (
          <div className="mt-8 flex flex-col items-center text-center animate-in fade-in duration-300">
            <div className="flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary mb-4">
              <MailCheck size={24} />
            </div>
            <h1 className="font-serif text-2xl tracking-tight text-foreground">Check your inbox.</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground font-light max-w-sm">
              We have sent a secure password reset link to <strong className="text-foreground">{email}</strong>. Follow the link to choose a new password.
            </p>
          </div>
        ) : (
          <>
            <p className="eyebrow mt-8 sm:mt-10">Recover Access</p>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight leading-tight text-balance">
              Reset your password.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground font-light">
              Enter the email address associated with your cookbook, and we will email you a password reset link.
            </p>
            
            <form onSubmit={submit} className="mt-6 sm:mt-8 flex flex-col gap-4">
              <label className="field-label">
                Email Address
                <input 
                  required 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="field-input mt-1.5" 
                  placeholder="name@example.com"
                />
              </label>
              
              {message && (
                <p role="alert" className="text-xs text-destructive font-medium border border-destructive/10 bg-destructive/5 p-3 rounded-xl">
                  {message}
                </p>
              )}
              
              <button 
                disabled={busy} 
                className="rounded-full bg-primary hover:bg-primary/95 hover:shadow-sm px-5 py-3.5 font-medium text-primary-foreground disabled:opacity-60 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending link…
                  </>
                ) : (
                  'Send recovery link'
                )}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
