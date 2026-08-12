'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Clock3, Heart, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Recipe = { id: string; title: string; description?: string | null; difficulty: string; preparation_time: number; cooking_time: number; servings: number; created_at?: string }

export function RecipeHome({ recipes, email }: { recipes: Recipe[]; email: string }) {
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState('all')
  const visible = useMemo(() => recipes.filter((recipe) => {
    const matchesQuery = `${recipe.title} ${recipe.description ?? ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (difficulty === 'all' || recipe.difficulty === difficulty)
  }), [recipes, query, difficulty])

  async function toggleFavorite(id: string) {
    const supabase = createClient()
    const saved = favorites.includes(id)
    setFavorites((current) => saved ? current.filter((item) => item !== id) : [...current, id])
    if (saved) await supabase.from('favorites').delete().eq('recipe_id', id)
    else { const { data: { user } } = await supabase.auth.getUser(); if (user) await supabase.from('favorites').insert({ user_id: user.id, recipe_id: id }) }
  }

  return <main className="min-h-screen bg-background text-foreground">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-10">
      <Link href="/" className="font-serif text-2xl tracking-tight">crumb<span className="text-primary">.</span></Link>
      <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"><a href="#discover" className="hover:text-foreground">Discover</a><a href="#collection" className="hover:text-foreground">Your collection</a></nav>
      <div className="flex items-center gap-2"><Link href="/recipes/new" className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"><Plus data-icon="inline-start" /> Add recipe</Link><Link href="/account" className="rounded-full border border-border px-4 py-2.5 text-sm">My kitchen</Link></div>
    </header>
    <section className="mx-auto max-w-7xl px-5 pb-14 pt-16 sm:px-10 lg:pt-24"><p className="eyebrow">Good food, remembered.</p><div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><h1 className="font-serif text-5xl leading-[1.02] tracking-tight text-balance sm:text-7xl">Your recipes, <em className="text-primary">beautifully</em> kept.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">A private, calm place for the dishes you make on repeat and the ones you cannot wait to try.</p></div><div className="w-full max-w-md rounded-2xl border border-border bg-card p-3"><div className="flex items-center gap-3 px-2"><Search className="text-muted-foreground" /><input aria-label="Search recipes" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your cookbook" className="w-full bg-transparent py-2 outline-none" /></div><div className="mt-3 flex items-center gap-2 border-t border-border pt-3"><SlidersHorizontal size={16} className="text-muted-foreground" /><select aria-label="Filter by difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="bg-transparent text-sm outline-none"><option value="all">All recipes</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select><span className="ml-auto text-xs text-muted-foreground">{visible.length} recipes</span></div></div></div></section>
    <section id="discover" className="mx-auto max-w-7xl px-5 pb-24 sm:px-10"><div className="flex items-end justify-between border-b border-border pb-4"><div><p className="eyebrow">Your cookbook</p><h2 className="mt-2 font-serif text-3xl">Made by you</h2></div><span className="text-sm text-muted-foreground">{email}</span></div>{visible.length === 0 ? <div className="py-20 text-center"><p className="font-serif text-3xl">Nothing here yet.</p><p className="mt-3 text-muted-foreground">Add a recipe or try a different search.</p></div> : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visible.map((recipe) => { const saved = favorites.includes(recipe.id); return <article key={recipe.id} className="group rounded-3xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{recipe.difficulty} · {recipe.servings} servings</p><h3 className="mt-4 font-serif text-3xl leading-tight"><Link href={`/recipes/${recipe.id}`} className="after:absolute after:inset-0">{recipe.title}</Link></h3></div><button aria-label={saved ? `Remove ${recipe.title} from favorites` : `Save ${recipe.title}`} onClick={() => toggleFavorite(recipe.id)} className="relative z-10 rounded-full border border-border p-2.5 hover:bg-muted"><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button></div><p className="relative mt-4 line-clamp-2 min-h-12 leading-6 text-muted-foreground">{recipe.description || 'A recipe worth making again.'}</p><div className="relative mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 size={16} /> {recipe.preparation_time + recipe.cooking_time} min <span className="ml-auto text-primary">View recipe →</span></div></article>})}</div>}</section>
  </main>
}

export default RecipeHome
