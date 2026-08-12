'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Clock3, Heart, Plus, Search, Sparkles, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cacheFavoriteRecipes, listCachedFavorites, setCachedFavorite, toCachedRecipe, type CachedRecipe } from '@/lib/offline-db'

type Recipe = { id: string; title: string; description?: string | null; difficulty: string; preparation_time: number; cooking_time: number; servings: number; created_at?: string; ingredients?: any[]; instructions?: any[] }

const difficultyLabels = { all: 'All recipes', easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export function RecipeHome({ recipes, email, userId }: { recipes: Recipe[]; email: string; userId: string }) {
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [favoriteRecipes, setFavoriteRecipes] = useState<CachedRecipe[]>([])
  const [difficulty, setDifficulty] = useState('all')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [offline, setOffline] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update(); window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  useEffect(() => { listCachedFavorites(userId).then((items) => { setFavoriteRecipes(items); setFavorites(items.map((item) => item.id)) }) }, [userId])
  useEffect(() => { if (navigator.onLine && recipes.length) cacheFavoriteRecipes(userId, favoriteRecipes.filter((item) => favorites.includes(item.id))).catch(() => {}) }, [favoriteRecipes, favorites, recipes.length, userId])

  const source = offline ? favoriteRecipes : recipes
  const visible = useMemo(() => source.filter((recipe) => {
    const haystack = `${recipe.title} ${recipe.description ?? ''}`.toLowerCase()
    return haystack.includes(query.toLowerCase()) && (difficulty === 'all' || recipe.difficulty === difficulty) && (!onlyFavorites || favorites.includes(recipe.id))
  }), [source, query, difficulty, onlyFavorites, favorites])

  async function toggleFavorite(recipe: Recipe) {
    const saved = favorites.includes(recipe.id)
    if (!navigator.onLine) { if (saved) { setFavorites((current) => current.filter((id) => id !== recipe.id)); setFavoriteRecipes((current) => current.filter((item) => item.id !== recipe.id)); await setCachedFavorite(userId, recipe.id, false) }; return }
    const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const result = saved ? await supabase.from('favorites').delete().eq('recipe_id', recipe.id).eq('user_id', user.id) : await supabase.from('favorites').insert({ user_id: user.id, recipe_id: recipe.id })
    if (!result.error) { setFavorites((current) => saved ? current.filter((id) => id !== recipe.id) : [...current, recipe.id]); if (!saved) { const cached = toCachedRecipe(userId, recipe); setFavoriteRecipes((current) => [...current.filter((item) => item.id !== recipe.id), cached]); await cacheFavoriteRecipes(userId, [cached]) } else await setCachedFavorite(userId, recipe.id, false) }
  }

  return <main className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur-md"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-10"><Link href="/" className="font-serif text-2xl tracking-tight">crumb<span className="text-primary">.</span></Link><nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"><a href="#discover" className="transition hover:text-foreground">Discover</a><button onClick={() => { setOnlyFavorites(true); document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' }) }} className="transition hover:text-foreground">Your collection</button></nav><div className="flex items-center gap-2"><Link href="/recipes/new" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"><Plus data-icon="inline-start" /> <span className="hidden sm:inline">Add recipe</span><span className="sm:hidden">Add</span></Link><Link href="/account" className="hidden rounded-full border border-border px-4 py-2.5 text-sm sm:block">My kitchen</Link><button aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)} className="rounded-full border border-border p-2.5 md:hidden"><SlidersHorizontal /></button></div></div>{menuOpen && <div className="border-t border-border px-5 py-3 md:hidden"><div className="flex gap-5 text-sm text-muted-foreground"><a href="#discover" onClick={() => setMenuOpen(false)}>Discover</a><button onClick={() => { setOnlyFavorites(true); setMenuOpen(false) }}>Your collection</button><Link href="/account">My kitchen</Link></div></div>}</header>
    <section className="mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-10 lg:pb-20 lg:pt-24"><div className="grid items-end gap-10 lg:grid-cols-[1fr_420px]"><div className="max-w-3xl"><p className="eyebrow">{offline ? 'Offline collection' : 'Good food, remembered.'}</p><h1 className="mt-5 font-serif text-5xl leading-[1.04] tracking-tight text-balance sm:text-7xl">Your recipes, <em className="text-primary">beautifully</em> kept.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">A private, calm place for the dishes you make on repeat and the ones you cannot wait to try.</p></div><div className="rounded-3xl border border-border bg-card p-3 shadow-sm"><div className="flex items-center gap-3 px-2"><Search className="text-muted-foreground" /><input aria-label="Search recipes" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your cookbook" className="w-full bg-transparent py-2 outline-none" /></div><div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3"><SlidersHorizontal className="text-muted-foreground" /><select aria-label="Filter by difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="bg-transparent text-sm outline-none">{Object.entries(difficultyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button onClick={() => setOnlyFavorites(!onlyFavorites)} className={`ml-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${onlyFavorites ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><Heart data-icon="inline-start" fill={onlyFavorites ? 'currentColor' : 'none'} /> Favorites</button></div></div></div></section>
    <section id="discover" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-24 sm:px-10"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="eyebrow">{onlyFavorites ? 'Saved for later' : 'Your cookbook'}</p><h2 className="mt-2 font-serif text-3xl">{visible.length} {visible.length === 1 ? 'recipe' : 'recipes'}</h2></div><div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><BookOpen /> {email}</div></div>{visible.length === 0 ? <div className="rounded-3xl border border-dashed border-border px-6 py-20 text-center"><Sparkles className="mx-auto text-primary" /><h3 className="mt-4 font-serif text-2xl">Nothing matches yet</h3><p className="mx-auto mt-2 max-w-sm text-muted-foreground">Try another search, or add the next recipe you want to remember.</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((recipe, index) => <article key={recipe.id} className={`group relative flex min-h-64 flex-col justify-between rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-lg ${index === 0 ? 'sm:col-span-2 lg:col-span-1' : ''}`}><div><div className="flex items-start justify-between gap-3"><p className="eyebrow">{recipe.difficulty} · {recipe.preparation_time + recipe.cooking_time} min</p><button aria-label={`${favorites.includes(recipe.id) ? 'Remove' : 'Add'} ${recipe.title} ${favorites.includes(recipe.id) ? 'from' : 'to'} favorites`} onClick={() => toggleFavorite(recipe)} className="rounded-full p-2 text-primary transition hover:bg-muted"><Heart fill={favorites.includes(recipe.id) ? 'currentColor' : 'none'} /></button></div><Link href={`/recipes/${recipe.id}`} className="mt-8 block"><h3 className="font-serif text-3xl leading-tight group-hover:text-primary">{recipe.title}</h3>{recipe.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{recipe.description}</p>}</Link></div><div className="mt-8 flex items-center justify-between text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><Clock3 /> serves {recipe.servings}</span><Link href={`/recipes/${recipe.id}`} className="font-medium text-primary">Open recipe</Link></div></article>)}</div>}</section>
  </main>
}
export default RecipeHome
