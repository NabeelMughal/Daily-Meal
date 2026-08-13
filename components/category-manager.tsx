'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react'
import { listCachedCategories, setCachedCategory, deleteCachedCategory } from '@/lib/offline-db'

type Category = {
  id: string
  name: string
  user_id: string
  created_at: string
}

type Props = {
  userId: string
  isOpen: boolean
  onClose: () => void
  onChanged: () => void
}

export function CategoryManager({ userId, isOpen, onClose, onChanged }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  
  // Loading states
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null) // ID of category currently being edited/deleted
  const [createLoading, setCreateLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  async function loadCategories() {
    setLoading(true)
    setErrorMsg('')
    const supabase = createClient()

    if (!navigator.onLine) {
      const cached = await listCachedCategories(userId)
      setCategories(cached.map(c => ({ id: c.id, name: c.name, user_id: c.userId, created_at: new Date(c.createdAt).toISOString() })))
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })

      if (error) throw new Error(error.message)
      setCategories(data ?? [])
    } catch (err: any) {
      setErrorMsg('Failed to load categories.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    setCreateLoading(true)
    setErrorMsg('')
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: userId, name: newCategoryName.trim() })
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to create category')

      // Cache offline
      await setCachedCategory(userId, {
        id: data.id,
        userId: userId,
        name: data.name,
        createdAt: new Date(data.created_at).getTime()
      })

      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategoryName('')
      onChanged()
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Could not create category.')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleUpdate(id: string) {
    if (!editingName.trim()) return
    setActionId(id)
    setErrorMsg('')
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('categories')
        .update({ name: editingName.trim() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? 'Failed to update category')

      // Cache offline
      await setCachedCategory(userId, {
        id: data.id,
        userId: userId,
        name: data.name,
        createdAt: new Date(data.created_at).getTime()
      })

      setCategories((prev) => prev.map(c => c.id === id ? data : c).sort((a, b) => a.name.localeCompare(b.name)))
      setEditingId(null)
      onChanged()
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Could not rename category.')
    } finally {
      setActionId(null)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete the category "${name}"? This won't delete recipes within this category.`)) return
    setActionId(id)
    setErrorMsg('')
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw new Error(error.message)

      // Delete offline
      await deleteCachedCategory(userId, id)

      setCategories((prev) => prev.filter(c => c.id !== id))
      onChanged()
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Could not delete category.')
    } finally {
      setActionId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
      <div 
        className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <h2 className="font-serif text-2xl">Manage Categories</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:bg-muted transition"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Create Category Form */}
        <form onSubmit={handleCreate} className="flex gap-2 mb-6">
          <input
            required
            type="text"
            placeholder="Add new category (e.g. Pasta)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="field-input py-2 text-xs flex-1"
          />
          <button
            type="submit"
            disabled={createLoading}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60 flex items-center gap-1.5 transition hover:bg-primary/95 shrink-0"
          >
            {createLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </form>

        {errorMsg && (
          <p className="text-xs text-destructive font-medium mb-3">{errorMsg}</p>
        )}

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
              <Loader2 className="animate-spin text-primary" size={16} />
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">No categories created yet.</p>
          ) : (
            categories.map((c) => {
              const isEditing = editingId === c.id
              const isBusy = actionId === c.id

              return (
                <div 
                  key={c.id} 
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-muted/40 hover:bg-muted/80 transition duration-150"
                >
                  {isEditing ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="field-input py-1 px-3 text-xs bg-card flex-1 outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdate(c.id)}
                        disabled={isBusy}
                        className="p-2 text-primary hover:bg-primary/10 rounded-full transition"
                        aria-label="Save changes"
                      >
                        {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={isBusy}
                        className="p-2 text-muted-foreground hover:bg-muted rounded-full transition"
                        aria-label="Cancel editing"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium pl-1">{c.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(c.id)
                            setEditingName(c.name)
                          }}
                          disabled={isBusy}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition"
                          aria-label={`Edit name of ${c.name}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={isBusy}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition"
                          aria-label={`Delete category ${c.name}`}
                        >
                          {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
