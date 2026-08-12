import { createClient } from '@/lib/supabase/server'
import { RecipeHome } from '@/components/recipe-home'
import { listRecipes } from '@/lib/recipes'
import { redirect } from 'next/navigation'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const recipes = await listRecipes()
  return <RecipeHome recipes={recipes} email={user.email ?? 'Your kitchen'} />
}
