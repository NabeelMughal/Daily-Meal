'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Check, LogOut, Save, Trash2, Loader2 } from 'lucide-react'
import { clearOfflineData } from '@/lib/offline-db'

export function AccountForm({ email, initialName, userId }: { email: string; initialName: string; userId: string }) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  // Password change states
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passMessage, setPassMessage] = useState('')
  const [passSuccess, setPassSuccess] = useState(false)
  const [passBusy, setPassBusy] = useState(false)

  async function save() {
    setBusy(true)
    const supabase = createClient()
    await supabase.from('profiles').upsert({ id: userId, full_name: name.trim() || null })
    setBusy(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPassBusy(true)
    setPassMessage('')
    setPassSuccess(false)

    if (newPassword.length < 6) {
      setPassMessage('New password must be at least 6 characters.')
      setPassBusy(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setPassMessage('New passwords do not match.')
      setPassBusy(false)
      return
    }

    const supabase = createClient()
    try {
      // 1. Verify old password by attempting a silent sign-in check
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: oldPassword,
      })

      if (signInError) {
        throw new Error('Incorrect old password. Please verify and try again.')
      }

      // 2. Perform the actual password change
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      setPassSuccess(true)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error(err)
      setPassMessage(err.message ?? 'Failed to change password.')
    } finally {
      setPassBusy(false)
    }
  }

  async function clearData() { 
    if (window.confirm('Remove saved offline favorites from this device?')) {
      await clearOfflineData(userId)
      window.alert('Offline cookbook cache cleared successfully.')
    } 
  }

  async function signOut() { 
    await clearOfflineData(userId)
    await createClient().auth.signOut()
    router.push('/')
    router.refresh() 
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground sm:px-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <button 
          onClick={() => router.push('/')} 
          className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to recipes
        </button>
        
        <section className="flex flex-col gap-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Your kitchen</p>
            {/* Downscaled heading */}
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight">Account settings</h1>
          </div>
          
          {/* Profile Name/Email Edit section */}
          <div className="flex flex-col gap-6 border-t border-border pt-8">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Name</span>
              <input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="max-w-md rounded-xl border border-input bg-card px-4 py-3 outline-none ring-primary transition focus:ring-2" 
                placeholder="How should we call you?" 
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Email</span>
              <input 
                value={email} 
                readOnly 
                className="max-w-md rounded-xl border border-input bg-muted px-4 py-3 text-muted-foreground cursor-not-allowed" 
              />
            </label>
            <button 
              onClick={save} 
              disabled={busy} 
              className="flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60 cursor-pointer"
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? 'Saved' : busy ? 'Saving...' : 'Save changes'}
            </button>
          </div>

          {/* Password Change Form */}
          <div className="flex flex-col gap-6 border-t border-border pt-8">
            <div>
              <h2 className="text-lg font-serif font-semibold text-foreground">Change Password</h2>
              <p className="text-xs text-muted-foreground font-light mt-1">Keep your cookbook secure by updating your credentials.</p>
            </div>
            
            <form onSubmit={changePassword} className="flex flex-col gap-4 max-w-md">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-xs">Old Password</span>
                <input 
                  required
                  type="password"
                  value={oldPassword} 
                  onChange={e => setOldPassword(e.target.value)} 
                  className="rounded-xl border border-input bg-card px-4 py-3 outline-none ring-primary transition focus:ring-2 text-sm" 
                  placeholder="Enter your current password"
                />
              </label>
              
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-xs">New Password</span>
                <input 
                  required
                  type="password"
                  minLength={6}
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="rounded-xl border border-input bg-card px-4 py-3 outline-none ring-primary transition focus:ring-2 text-sm" 
                  placeholder="At least 6 characters"
                />
              </label>
              
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-xs">Confirm New Password</span>
                <input 
                  required
                  type="password"
                  minLength={6}
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className="rounded-xl border border-input bg-card px-4 py-3 outline-none ring-primary transition focus:ring-2 text-sm" 
                  placeholder="Confirm new password"
                />
              </label>

              {passMessage && (
                <p role="alert" className="text-xs text-destructive font-medium border border-destructive/10 bg-destructive/5 p-3 rounded-xl">
                  {passMessage}
                </p>
              )}

              {passSuccess && (
                <p role="status" className="text-xs text-emerald-600 font-medium border border-emerald-500/20 bg-emerald-50 p-3 rounded-xl">
                  Password updated successfully!
                </p>
              )}

              <button 
                type="submit"
                disabled={passBusy} 
                className="flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60 cursor-pointer shadow-sm hover:shadow-md"
              >
                {passBusy && <Loader2 size={16} className="animate-spin" />}
                Change password
              </button>
            </form>
          </div>

          {/* Clear Cache & Sign Out */}
          <div className="border-t border-border pt-8">
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={clearData} 
                className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground cursor-pointer"
              >
                <Trash2 size={16} /> Clear offline data
              </button>
              <button 
                onClick={signOut} 
                className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-destructive cursor-pointer"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
            <p className="mt-3 max-w-md text-xs leading-5 text-muted-foreground font-light">
              Favorites are stored privately on this device so you can still cook without a connection.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
