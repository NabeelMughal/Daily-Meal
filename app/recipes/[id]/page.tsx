import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DeleteRecipeButton } from '@/components/delete-recipe-button'

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=login')
  const { data: recipe } = await supabase.from('recipes').select('*, ingredients(*), instructions(*)').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!recipe) notFound()
  const ingredients = [...(recipe.ingredients ?? [])].sort((a, b) => a.position - b.position)
  const instructions = [...(recipe.instructions ?? [])].sort((a, b) => a.position - b.position)
  return <main className="min-h-screen bg-background text-foreground"><header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-10"><Link href="/" className="font-serif text-2xl">crumb<span className="text-primary">.</span></Link><div className="flex items-center gap-3"><DeleteRecipeButton recipeId={recipe.id} /><Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Back to recipes</Link></div></header><article className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-10"><p className="eyebrow">{recipe.difficulty} · {recipe.preparation_time + recipe.cooking_time} min · serves {recipe.servings}</p><h1 className="mt-4 max-w-3xl font-serif text-6xl tracking-tight text-balance">{recipe.title}</h1>{recipe.description && <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{recipe.description}</p>}<div className="mt-12 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]"><section><h2 className="font-serif text-3xl">Ingredients</h2><ul className="mt-5 flex flex-col gap-4">{ingredients.map((item) => <li key={item.id} className="flex items-baseline justify-between gap-4 border-b border-border pb-3"><span>{item.name}</span><span className="text-sm text-muted-foreground">{[item.quantity, item.unit].filter(Boolean).join(' ')}</span></li>)}</ul></section><section><h2 className="font-serif text-3xl">Method</h2><ol className="mt-5 flex flex-col gap-6">{instructions.map((item, index) => <li key={item.id} className="flex gap-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{index + 1}</span><p className="leading-7">{item.instruction}</p></li>)}</ol></section></div></article></main>
}
