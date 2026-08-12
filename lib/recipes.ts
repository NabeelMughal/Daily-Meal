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
  const { data: recipe, error } = await supabase.from('recipes').insert({ user_id: user.id, title: input.title.trim(), description: input.description.trim(), preparation_time: input.preparation_time, cooking_time: input.cooking_time, servings: input.servings, difficulty: input.difficulty }).select().single()
  if (error || !recipe) throw new Error(error?.message ?? 'Unable to create recipe')
  const ingredients = input.ingredients.filter((item) => item.name.trim()).map((item, position) => ({ ...item, recipe_id: recipe.id, name: item.name.trim(), position }))
  const instructions = input.instructions.filter(Boolean).map((instruction, position) => ({ recipe_id: recipe.id, instruction: instruction.trim(), position }))
  if (ingredients.length) await supabase.from('ingredients').insert(ingredients)
  if (instructions.length) await supabase.from('instructions').insert(instructions)
  return recipe
}

export async function deleteRecipe(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Authentication required')
  const { error } = await supabase.from('recipes').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
}
