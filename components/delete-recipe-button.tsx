'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function remove() {
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return
    setBusy(true)
    const { error } = await createClient().from('recipes').delete().eq('id', recipeId)
    if (error) { setBusy(false); return }
    router.push('/')
    router.refresh()
  }
  return <button type="button" onClick={remove} disabled={busy} className="rounded-full border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-60">{busy ? 'Deleting…' : 'Delete recipe'}</button>
}
