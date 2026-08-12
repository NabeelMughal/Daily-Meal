'use client'

import { useState, useEffect, FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Image as ImageIcon, Loader2, X, ArrowLeft } from 'lucide-react'
import { listCachedCategories } from '@/lib/offline-db'

type Ingredient = { name: string; quantity: string; unit: string; notes: string }

type Recipe = { 
  id: string
  title: string
  description?: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  preparation_time: number
  cooking_time: number
  servings: number
  category_id?: string | null
  image_url?: string | null
  ingredients?: Array<{ name: string; quantity: string; unit: string; notes?: string }>
  instructions?: Array<{ instruction: string }>
}

export function RecipeEditor({ recipe }: { recipe?: Recipe }) {
  const router = useRouter()
  const [title, setTitle] = useState(recipe?.title ?? '')
  const [description, setDescription] = useState(recipe?.description ?? '')
  const [prep, setPrep] = useState(String(recipe?.preparation_time ?? '10'))
  const [cook, setCook] = useState(String(recipe?.cooking_time ?? '20'))
  const [servings, setServings] = useState(String(recipe?.servings ?? '2'))
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(recipe?.difficulty ?? 'easy')
  const [categoryId, setCategoryId] = useState<string>(recipe?.category_id ?? '')
  const [imageUrl, setImageUrl] = useState<string>(recipe?.image_url ?? '')
  
  // Ingredients state setup (initialize with default structure)
  const initialIngredients = recipe?.ingredients && recipe.ingredients.length > 0 
    ? recipe.ingredients.map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit, notes: item.notes ?? '' }))
    : [{ name: '', quantity: '', unit: '', notes: '' }]
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients)
  
  // Instructions state setup
  const initialInstructions = recipe?.instructions && recipe.instructions.length > 0
    ? recipe.instructions.map(item => item.instruction)
    : ['']
  const [instructions, setInstructions] = useState<string[]>(initialInstructions)
  
  const [categories, setCategories] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)

  // Fetch user categories
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!navigator.onLine) {
        const cached = await listCachedCategories(user.id)
        setCategories(cached)
        return
      }

      try {
        const { data, error } = await supabase.from('categories').select('*').eq('user_id', user.id).order('name', { ascending: true })
        if (data && !error) {
          setCategories(data)
        }
      } catch (err) {
        console.error('Failed to load categories online:', err)
      }
    }
    load()
  }, [])

  function updateIngredient(index: number, key: keyof Ingredient, value: string) {
    setIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  }

  // Handle category creation inline
  async function handleAddCategory(e: React.MouseEvent) {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    setCategoryLoading(true)
    setMessage('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage('Auth required.')
        setCategoryLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: user.id, name: newCategoryName.trim() })
        .select()
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? 'Failed to create category')
      }

      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryId(data.id)
      setNewCategoryName('')
      setIsAddingCategory(false)
    } catch (err: any) {
      setMessage(err.message ?? 'Could not create category.')
    } finally {
      setCategoryLoading(false)
    }
  }

  // Handle image upload with FileReader conversion to Base64
  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Check file size (e.g. limit to 1.5MB to ensure it saves nicely in database)
    if (file.size > 1.5 * 1024 * 1024) {
      setMessage('Image is too large. Please select an image under 1.5MB.')
      return
    }

    setImageLoading(true)
    setMessage('')
    const reader = new FileReader()
    reader.onloadend = () => {
      setImageUrl(reader.result as string)
      setImageLoading(false)
    }
    reader.onerror = () => {
      setMessage('Failed to read image file.')
      setImageLoading(false)
    }
    reader.readAsDataURL(file)
  }

  // Submit recipe (Create or Update)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { 
      router.push('/?auth=login')
      return 
    }

    const payload = {
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      preparation_time: Number(prep) || 0,
      cooking_time: Number(cook) || 0,
      servings: Math.max(1, Number(servings) || 1),
      difficulty,
      category_id: categoryId || null,
      image_url: imageUrl || null
    }

    try {
      let targetId = recipe?.id

      if (recipe) {
        // UPDATE MODE
        const { error } = await supabase
          .from('recipes')
          .update(payload)
          .eq('id', recipe.id)
          .eq('user_id', user.id)

        if (error) throw new Error(error.message)
        
        // Refresh ingredients and instructions
        await supabase.from('ingredients').delete().eq('recipe_id', recipe.id)
        await supabase.from('instructions').delete().eq('recipe_id', recipe.id)
      } else {
        // CREATE MODE
        const { data: newRecipe, error } = await supabase
          .from('recipes')
          .insert(payload)
          .select()
          .single()

        if (error || !newRecipe) throw new Error(error?.message ?? 'Failed to create recipe')
        targetId = newRecipe.id
      }

      // Insert ingredients
      const ingredientRows = ingredients
        .filter((item) => item.name.trim())
        .map((item, position) => ({ 
          recipe_id: targetId, 
          name: item.name.trim(), 
          quantity: item.quantity.trim(),
          unit: item.unit.trim(),
          notes: item.notes.trim(),
          position 
        }))

      // Insert instructions
      const instructionRows = instructions
        .filter((item) => item.trim())
        .map((item, position) => ({ 
          recipe_id: targetId, 
          instruction: item.trim(), 
          position 
        }))

      if (ingredientRows.length) {
        const { error: ingError } = await supabase.from('ingredients').insert(ingredientRows)
        if (ingError) throw ingError
      }
      
      if (instructionRows.length) {
        const { error: instError } = await supabase.from('instructions').insert(instructionRows)
        if (instError) throw instError
      }

      router.push(`/recipes/${targetId}`)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setMessage(err.message ?? 'We could not save this recipe. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8 transition-all duration-300">
      
      {/* Recipe Meta Section */}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="field-label">Recipe title</span>
          <input 
            required 
            value={title} 
            onChange={(event) => setTitle(event.target.value)} 
            placeholder="e.g. Lemon herb pasta" 
            className="field-input text-xl" 
          />
        </label>
        
        <label className="md:col-span-2">
          <span className="field-label">Description</span>
          <textarea 
            value={description} 
            onChange={(event) => setDescription(event.target.value)} 
            placeholder="What makes this recipe worth remembering?" 
            rows={3} 
            className="field-input resize-none" 
          />
        </label>

        {/* Category Picker & Inline Adder */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Category</span>
            {!isAddingCategory ? (
              <button 
                type="button" 
                onClick={() => setIsAddingCategory(true)} 
                className="text-xs font-medium text-primary hover:underline transition-all"
              >
                + Add New Category
              </button>
            ) : (
              <button 
                type="button" 
                onClick={() => setIsAddingCategory(false)} 
                className="text-xs font-medium text-muted-foreground hover:underline transition-all"
              >
                Cancel
              </button>
            )}
          </div>

          {!isAddingCategory ? (
            <select 
              value={categoryId} 
              onChange={(e) => setCategoryId(e.target.value)} 
              className="field-input"
            >
              <option value="">No Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <input 
                type="text" 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)} 
                placeholder="Category name (e.g. Pasta, Desserts)" 
                className="field-input" 
                autoFocus
              />
              <button 
                type="button" 
                disabled={categoryLoading}
                onClick={handleAddCategory} 
                className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60 flex items-center gap-1 shrink-0 transition hover:bg-primary/95"
              >
                {categoryLoading ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
              </button>
            </div>
          )}
        </div>

        {/* Image handling */}
        <div className="md:col-span-2">
          <span className="field-label">Recipe Image</span>
          <div className="mt-2 flex flex-col gap-4">
            
            {/* Image Preview & Controls */}
            {imageUrl ? (
              <div className="relative group overflow-hidden rounded-2xl border border-border bg-muted flex items-center justify-center max-h-72 aspect-video transition-all animate-in fade-in duration-300">
                <img 
                  src={imageUrl} 
                  alt="Recipe preview" 
                  className="w-full h-full object-cover rounded-2xl" 
                />
                <button 
                  type="button" 
                  onClick={() => setImageUrl('')}
                  className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all shadow-md"
                  aria-label="Remove image"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-6 bg-card hover:bg-muted/50 transition-colors relative">
                {imageLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-primary" size={32} />
                    <span className="text-sm text-muted-foreground">Reading file...</span>
                  </div>
                ) : (
                  <label htmlFor="image-upload" className="flex flex-col items-center gap-2 cursor-pointer w-full h-full text-center">
                    <ImageIcon size={36} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium">Click to upload recipe image</span>
                    <span className="text-xs text-muted-foreground">Supports PNG, JPG, WEBP (Max 1.5MB)</span>
                    <input 
                      type="file" 
                      id="image-upload" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageFile} 
                    />
                  </label>
                )}
              </div>
            )}

            {/* Alternately paste image URL */}
            {!imageUrl && !imageLoading && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">or</span>
                <input 
                  type="text" 
                  placeholder="Paste direct image link (URL)" 
                  value={imageUrl} 
                  onChange={(e) => setImageUrl(e.target.value)} 
                  className="flex-1 bg-transparent text-xs border-b border-border py-1 outline-none focus:border-primary transition"
                />
              </div>
            )}
          </div>
        </div>

        <label>
          <span className="field-label">Prep time (mins)</span>
          <input 
            type="number" 
            min="0" 
            value={prep} 
            onChange={(event) => setPrep(event.target.value)} 
            className="field-input" 
          />
        </label>
        
        <label>
          <span className="field-label">Cook time (mins)</span>
          <input 
            type="number" 
            min="0" 
            value={cook} 
            onChange={(event) => setCook(event.target.value)} 
            className="field-input" 
          />
        </label>
        
        <label>
          <span className="field-label">Servings</span>
          <input 
            type="number" 
            min="1" 
            value={servings} 
            onChange={(event) => setServings(event.target.value)} 
            className="field-input" 
          />
        </label>
        
        <label>
          <span className="field-label">Difficulty</span>
          <select 
            value={difficulty} 
            onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} 
            className="field-input"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      {/* Ingredients Section */}
      <section className="transition-all duration-300">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Ingredients</h2>
          <button 
            type="button" 
            onClick={() => setIngredients([...ingredients, { name: '', quantity: '', unit: '', notes: '' }])} 
            className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline transition-all"
          >
            <Plus size={16} /> Add ingredient
          </button>
        </div>
        
        <div className="flex flex-col gap-3">
          {ingredients.map((item, index) => (
            <div 
              key={index} 
              className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1.5fr_0.8fr_0.8fr_1fr_auto] items-center transition-all animate-in fade-in duration-200"
            >
              <input 
                required={index === 0} 
                value={item.name} 
                onChange={(event) => updateIngredient(index, 'name', event.target.value)} 
                placeholder="Ingredient name" 
                className="field-input" 
              />
              <input 
                value={item.quantity} 
                onChange={(event) => updateIngredient(index, 'quantity', event.target.value)} 
                placeholder="Qty" 
                className="field-input" 
              />
              <input 
                value={item.unit} 
                onChange={(event) => updateIngredient(index, 'unit', event.target.value)} 
                placeholder="Unit (e.g. g, tbsp)" 
                className="field-input" 
              />
              <input 
                value={item.notes} 
                onChange={(event) => updateIngredient(index, 'notes', event.target.value)} 
                placeholder="Notes (e.g. chopped)" 
                className="field-input" 
              />
              {ingredients.length > 1 && (
                <button 
                  type="button" 
                  aria-label="Remove ingredient" 
                  onClick={() => setIngredients(ingredients.filter((_, itemIndex) => itemIndex !== index))} 
                  className="self-center justify-self-center rounded-full p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Instructions Section */}
      <section className="transition-all duration-300">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Instructions</h2>
          <button 
            type="button" 
            onClick={() => setInstructions([...instructions, ''])} 
            className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline transition-all"
          >
            <Plus size={16} /> Add step
          </button>
        </div>
        
        <div className="flex flex-col gap-3">
          {instructions.map((item, index) => (
            <div key={index} className="flex gap-3 items-start transition-all animate-in fade-in duration-200">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground shadow-sm">
                {index + 1}
              </span>
              <div className="flex-1 flex gap-2 items-start">
                <textarea 
                  required={index === 0} 
                  value={item} 
                  onChange={(event) => setInstructions(instructions.map((step, stepIndex) => stepIndex === index ? event.target.value : step))} 
                  placeholder="Describe this step of the preparation..." 
                  rows={2} 
                  className="field-input resize-none flex-1" 
                />
                {instructions.length > 1 && (
                  <button 
                    type="button" 
                    aria-label="Remove step" 
                    onClick={() => setInstructions(instructions.filter((_, stepIndex) => stepIndex !== index))} 
                    className="p-2.5 mt-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {message && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive font-medium animate-shake">
          {message}
        </div>
      )}
      
      {/* Submit Button with Loading State */}
      <button 
        disabled={busy || imageLoading} 
        className="rounded-full bg-primary hover:bg-primary/95 active:scale-95 px-8 py-4 font-medium text-primary-foreground disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all duration-200"
      >
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Saving recipe...
          </>
        ) : (
          'Save recipe'
        )}
      </button>
    </form>
  )
}
