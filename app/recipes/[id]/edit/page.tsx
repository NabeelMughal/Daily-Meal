import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecipeEditor } from '@/components/recipe-editor'
import { ArrowLeft } from 'lucide-react'

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=login')

  // Fetch recipe along with ingredients and instructions
  const { data: recipe } = await supabase
    .from('recipes')
    .select('*, ingredients(*), instructions(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!recipe) notFound()

  // Sort ingredients and instructions by position
  recipe.ingredients = [...(recipe.ingredients ?? [])].sort((a, b) => a.position - b.position)
  recipe.instructions = [...(recipe.instructions ?? [])].sort((a, b) => a.position - b.position)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-6 sm:px-10 border-b border-border/50">
        <Link href={`/recipes/${recipe.id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200">
          <ArrowLeft size={16} /> Back to recipe
        </Link>
        <Link href="/" className="font-serif text-2xl tracking-tight">
          crumb<span className="text-primary">.</span>
        </Link>
      </header>

      <section className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-10">
        <p className="eyebrow">Edit recipe</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl tracking-tight text-balance">
          Refine the recipe details.
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
          Update the title, measurements, steps, or change its category. You can also upload a preview image.
        </p>

        <div className="mt-10">
          <RecipeEditor recipe={recipe} />
        </div>
      </section>
    </main>
  )
}
