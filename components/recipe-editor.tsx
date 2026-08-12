'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

type Ingredient = { name: string; quantity: string; unit: string; notes: string }

export function RecipeEditor() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prep, setPrep] = useState('10')
  const [cook, setCook] = useState('20')
  const [servings, setServings] = useState('2')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', quantity: '', unit: '', notes: '' }])
  const [instructions, setInstructions] = useState([''])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  function updateIngredient(index: number, key: keyof Ingredient, value: string) {
    setIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/?auth=login'); return }
    const { data: recipe, error } = await supabase.from('recipes').insert({ user_id: user.id, title: title.trim(), description: description.trim(), preparation_time: Number(prep) || 0, cooking_time: Number(cook) || 0, servings: Math.max(1, Number(servings) || 1), difficulty }).select().single()
    if (error || !recipe) { setBusy(false); setMessage('We could not save this recipe. Please try again.'); return }
    const ingredientRows = ingredients.filter((item) => item.name.trim()).map((item, position) => ({ ...item, recipe_id: recipe.id, name: item.name.trim(), position }))
    const instructionRows = instructions.filter((item) => item.trim()).map((item, position) => ({ recipe_id: recipe.id, instruction: item.trim(), position }))
    if (ingredientRows.length) await supabase.from('ingredients').insert(ingredientRows)
    if (instructionRows.length) await supabase.from('instructions').insert(instructionRows)
    router.push(`/recipes/${recipe.id}`)
  }

  return <form onSubmit={submit} className="flex flex-col gap-8">
    <div className="grid gap-5 md:grid-cols-2">
      <label className="md:col-span-2"><span className="field-label">Recipe title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Lemon herb pasta" className="field-input text-xl" /></label>
      <label className="md:col-span-2"><span className="field-label">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What makes this recipe worth remembering?" rows={4} className="field-input resize-none" /></label>
      <label><span className="field-label">Prep time</span><input type="number" min="0" value={prep} onChange={(event) => setPrep(event.target.value)} className="field-input" /></label>
      <label><span className="field-label">Cook time</span><input type="number" min="0" value={cook} onChange={(event) => setCook(event.target.value)} className="field-input" /></label>
      <label><span className="field-label">Servings</span><input type="number" min="1" value={servings} onChange={(event) => setServings(event.target.value)} className="field-input" /></label>
      <label><span className="field-label">Difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} className="field-input"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
    </div>
    <section><div className="mb-4 flex items-center justify-between"><h2 className="font-serif text-2xl">Ingredients</h2><button type="button" onClick={() => setIngredients([...ingredients, { name: '', quantity: '', unit: '', notes: '' }])} className="inline-flex items-center gap-2 text-sm text-primary"><Plus size={16} /> Add ingredient</button></div><div className="flex flex-col gap-3">{ingredients.map((item, index) => <div key={index} className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-[1fr_0.7fr_0.7fr_auto]"><input required={index === 0} value={item.name} onChange={(event) => updateIngredient(index, 'name', event.target.value)} placeholder="Ingredient" className="field-input" /><input value={item.quantity} onChange={(event) => updateIngredient(index, 'quantity', event.target.value)} placeholder="Quantity" className="field-input" /><input value={item.unit} onChange={(event) => updateIngredient(index, 'unit', event.target.value)} placeholder="Unit" className="field-input" />{ingredients.length > 1 && <button type="button" aria-label="Remove ingredient" onClick={() => setIngredients(ingredients.filter((_, itemIndex) => itemIndex !== index))} className="self-center rounded-full p-2 text-muted-foreground hover:bg-muted"><Trash2 size={16} /></button>}</div>)}</div></section>
    <section><div className="mb-4 flex items-center justify-between"><h2 className="font-serif text-2xl">Instructions</h2><button type="button" onClick={() => setInstructions([...instructions, ''])} className="inline-flex items-center gap-2 text-sm text-primary"><Plus size={16} /> Add step</button></div><div className="flex flex-col gap-3">{instructions.map((item, index) => <div key={index} className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">{index + 1}</span><textarea required={index === 0} value={item} onChange={(event) => setInstructions(instructions.map((step, stepIndex) => stepIndex === index ? event.target.value : step))} placeholder="Describe this step" rows={3} className="field-input resize-none" /></div>)}</div></section>
    {message && <p className="text-sm text-destructive">{message}</p>}
    <button disabled={busy} className="rounded-full bg-primary px-6 py-3.5 font-medium text-primary-foreground disabled:opacity-60">{busy ? 'Saving recipe...' : 'Save recipe'}</button>
  </form>
}
