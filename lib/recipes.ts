import { createClient } from '@/lib/supabase/server'

export type RecipeInput = {
  title: string
  description: string
  preparation_time: number
  cooking_time: number
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  ingredients: Array<{ name: string; quantity: string; unit: string; notes: string }>
  instructions: string[]
  category_id?: string | null
  image_url?: string | null
}

export async function listRecipes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('recipes').select('*, ingredients(*), instructions(*)').eq('user_id', user.id).order('created_at', { ascending: false })
  return data ?? []
}

export async function getRecipe(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('recipes').select('*, ingredients(*), instructions(*)').eq('id', id).eq('user_id', user.id).maybeSingle()
  return data
}

export async function createRecipe(input: RecipeInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Authentication required')
  
  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert({ 
      user_id: user.id, 
      title: input.title.trim(), 
      description: input.description.trim(), 
      preparation_time: input.preparation_time, 
      cooking_time: input.cooking_time, 
      servings: input.servings, 
      difficulty: input.difficulty,
      category_id: input.category_id || null,
      image_url: input.image_url || null
    })
    .select()
    .single()
    
  if (error || !recipe) throw new Error(error?.message ?? 'Unable to create recipe')
  
  const ingredients = input.ingredients
    .filter((item) => item.name.trim())
    .map((item, position) => ({ ...item, recipe_id: recipe.id, name: item.name.trim(), position }))
    
  const instructions = input.instructions
    .filter(Boolean)
    .map((instruction, position) => ({ recipe_id: recipe.id, instruction: instruction.trim(), position }))
    
  if (ingredients.length) await supabase.from('ingredients').insert(ingredients)
  if (instructions.length) await supabase.from('instructions').insert(instructions)
  
  return recipe
}

export async function updateRecipe(id: string, input: RecipeInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Authentication required')
  
  const { error: recipeError } = await supabase
    .from('recipes')
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      preparation_time: input.preparation_time,
      cooking_time: input.cooking_time,
      servings: input.servings,
      difficulty: input.difficulty,
      category_id: input.category_id || null,
      image_url: input.image_url || null
    })
    .eq('id', id)
    .eq('user_id', user.id)
    
  if (recipeError) throw new Error(recipeError.message)
  
  // Re-insert ingredients
  await supabase.from('ingredients').delete().eq('recipe_id', id)
  const ingredients = input.ingredients
    .filter((item) => item.name.trim())
    .map((item, position) => ({ ...item, recipe_id: id, name: item.name.trim(), position }))
  if (ingredients.length) await supabase.from('ingredients').insert(ingredients)
  
  // Re-insert instructions
  await supabase.from('instructions').delete().eq('recipe_id', id)
  const instructions = input.instructions
    .filter(Boolean)
    .map((instruction, position) => ({ recipe_id: id, instruction: instruction.trim(), position }))
  if (instructions.length) await supabase.from('instructions').insert(instructions)
}

export async function deleteRecipe(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Authentication required')
  const { error } = await supabase.from('recipes').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
}

// Category Operations
export async function listCategories() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase.from('categories').select('*').eq('user_id', user.id).order('name', { ascending: true })
  if (error) {
    console.error('Error fetching categories:', error.message)
    return []
  }
  return data ?? []
}

export async function createCategory(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Authentication required')
  const { data, error } = await supabase.from('categories').insert({ user_id: user.id, name: name.trim() }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateCategory(id: string, name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Authentication required')
  const { data, error } = await supabase.from('categories').update({ name: name.trim() }).eq('id', id).eq('user_id', user.id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Authentication required')
  const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
}
