import { createClient } from '@/lib/supabase/server'
import { RecipeHome } from '@/components/recipe-home'
import { listRecipes } from '@/lib/recipes'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const recipes = await listRecipes()
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm font-sans">
        Loading cookbook...
      </div>
    }>
      <RecipeHome recipes={recipes} email={user.email ?? 'Your kitchen'} userId={user.id} />
    </Suspense>
  )
}
