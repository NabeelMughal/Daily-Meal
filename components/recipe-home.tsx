'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Clock3, Heart, Plus, Search, SlidersHorizontal, Settings2, Loader2, Sparkles, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { 
  cacheFavoriteRecipes, 
  listCachedFavorites, 
  setCachedFavorite, 
  toCachedRecipe, 
  listCachedCategories, 
  cacheCategories, 
  type CachedRecipe 
} from '@/lib/offline-db'
import { CategoryManager } from './category-manager'

type Recipe = { 
  id: string
  title: string
  description?: string | null
  difficulty: string
  preparation_time: number
  cooking_time: number
  servings: number
  created_at?: string
  ingredients?: any[]
  instructions?: any[]
  category_id?: string | null
  image_url?: string | null
  categoryId?: string | null
  imageUrl?: string | null
}

export function RecipeHome({ recipes, email, userId }: { recipes: Recipe[]; email: string; userId: string }) {
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [favoriteRecipes, setFavoriteRecipes] = useState<CachedRecipe[]>([])
  const [difficulty, setDifficulty] = useState('all')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [offline, setOffline] = useState(false)
  
  // Category management states
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [favLoadingId, setFavLoadingId] = useState<string | null>(null)
  const [isSearchVisible, setIsSearchVisible] = useState(false)

  // Network check
  useEffect(() => { 
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { 
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update) 
    } 
  }, [])

  const searchParams = useSearchParams()

  // Sync favorites & categories from query parameters (bottom nav tab bar support)
  useEffect(() => {
    if (!searchParams) return
    const filter = searchParams.get('filter')
    const manage = searchParams.get('manage')
    setOnlyFavorites(filter === 'favorites')
    setIsCategoryManagerOpen(manage === 'categories')
  }, [searchParams])

  // Load favorites and sync with server once on mount
  useEffect(() => { 
    listCachedFavorites(userId).then(async (items) => { 
      setFavoriteRecipes(items)
      setFavorites(items.map((item) => item.id)) 

      if (navigator.onLine) {
        try {
          const supabase = createClient()
          const { data: serverFavs, error } = await supabase.from('favorites').select('recipe_id').eq('user_id', userId)
          if (serverFavs && !error) {
            const serverIds = serverFavs.map(f => f.recipe_id)
            const localIds = items.map(item => item.id)
            const missingIds = serverIds.filter(id => !localIds.includes(id))
            
            let updatedFavorites = [...items]
            
            if (missingIds.length > 0) {
              const { data: missingRecipes } = await supabase
                .from('recipes')
                .select('*, ingredients(*), instructions(*)')
                .in('id', missingIds)
                
              if (missingRecipes && missingRecipes.length > 0) {
                const cachedRecipes = missingRecipes.map(r => toCachedRecipe(userId, r))
                await cacheFavoriteRecipes(userId, cachedRecipes)
                updatedFavorites = [...updatedFavorites, ...cachedRecipes]
              }
            }
            
            const removedIds = localIds.filter(id => !serverIds.includes(id))
            if (removedIds.length > 0) {
              await Promise.all(removedIds.map(id => setCachedFavorite(userId, id, false)))
              updatedFavorites = updatedFavorites.filter(item => !removedIds.includes(item.id))
            }
            
            setFavoriteRecipes(updatedFavorites)
            setFavorites(updatedFavorites.map(item => item.id))
          }
        } catch (err) {
          console.error('Failed to sync favorites with server:', err)
        }
      }
    }) 
  }, [userId])

  // Load categories (offline vs online)
  async function loadCategories() {
    if (!userId) return
    
    if (!navigator.onLine) {
      const cached = await listCachedCategories(userId)
      setCategories(cached)
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })

      if (data && !error) {
        setCategories(data)
        // Cache categories offline
        await cacheCategories(userId, data.map(item => ({
          id: item.id,
          userId,
          name: item.name,
          createdAt: new Date(item.created_at).getTime()
        })))
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [userId, offline])

  const source = offline ? favoriteRecipes : recipes

  // Filter logic including query, difficulty, favorites, and CATEGORY
  const visible = useMemo(() => {
    return source.filter((recipe) => {
      const matchesQuery = `${recipe.title} ${recipe.description ?? ''}`.toLowerCase().includes(query.toLowerCase())
      const matchesDifficulty = difficulty === 'all' || recipe.difficulty === difficulty
      const matchesFavorite = !onlyFavorites || favorites.includes(recipe.id)
      
      const rCatId = recipe.category_id ?? recipe.categoryId ?? null
      const matchesCategory = selectedCategoryId === 'all' || rCatId === selectedCategoryId

      return matchesQuery && matchesDifficulty && matchesFavorite && matchesCategory
    })
  }, [source, query, difficulty, onlyFavorites, favorites, selectedCategoryId])

  // Toggle favorite with optimistic updates and rollback
  async function toggleFavorite(recipe: Recipe) { 
    const saved = favorites.includes(recipe.id)
    
    // OPTIMISTIC UPDATE: update immediately!
    setFavorites((current) => saved ? current.filter((id) => id !== recipe.id) : [...current, recipe.id])
    if (!saved) { 
      const cached = toCachedRecipe(userId, recipe)
      setFavoriteRecipes((current) => [...current.filter((item) => item.id !== recipe.id), cached])
      await cacheFavoriteRecipes(userId, [cached]).catch(() => {})
    } else {
      setFavoriteRecipes((current) => current.filter((item) => item.id !== recipe.id))
      await setCachedFavorite(userId, recipe.id, false).catch(() => {})
    }

    if (!navigator.onLine) return 

    const supabase = createClient()
    try {
      if (saved) {
        const result = await supabase.from('favorites').delete().eq('recipe_id', recipe.id).eq('user_id', userId)
        if (result.error) throw result.error
      } else {
        // Fetch full recipe details in background to cache complete recipe offline (with ingredients & instructions)
        const [favResult, detailsResult] = await Promise.all([
          supabase.from('favorites').insert({ user_id: userId, recipe_id: recipe.id }),
          supabase.from('recipes').select('*, ingredients(*), instructions(*)').eq('id', recipe.id).single()
        ])
        
        if (favResult.error) throw favResult.error
        if (detailsResult.error) throw detailsResult.error
        
        if (detailsResult.data) {
          const cached = toCachedRecipe(userId, detailsResult.data)
          setFavoriteRecipes((current) => [...current.filter((item) => item.id !== recipe.id), cached])
          await cacheFavoriteRecipes(userId, [cached]).catch(() => {})
        }
      }
    } catch (err) {
      console.error('Failed to toggle favorite on server:', err)
      // Rollback state if server returns error
      setFavorites((current) => saved ? [...current, recipe.id] : current.filter((id) => id !== recipe.id))
      if (!saved) { 
        setFavoriteRecipes((current) => current.filter((item) => item.id !== recipe.id))
        await setCachedFavorite(userId, recipe.id, false).catch(() => {})
      } else {
        const cached = toCachedRecipe(userId, recipe)
        setFavoriteRecipes((current) => [...current.filter((item) => item.id !== recipe.id), cached])
        await cacheFavoriteRecipes(userId, [cached]).catch(() => {})
      }
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* Sticky Header with Search Option on Mobile */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-10 border-b border-border/30 sticky top-0 bg-background/85 backdrop-blur-md z-30">
        <Link href="/" className="font-serif text-2xl tracking-tight hover:scale-105 transition-transform duration-200">
          crumb<span className="text-primary">.</span>
        </Link>
        
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#discover" className="hover:text-foreground transition-colors">Discover</a>
          <button onClick={() => setOnlyFavorites(true)} className="hover:text-foreground transition-colors">Your collection</button>
        </nav>
        
        <div className="flex items-center gap-3">
          {/* Mobile Search Toggle Button */}
          <button 
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className={`p-2.5 rounded-xl md:hidden bg-primary/5 hover:bg-primary/10 border border-primary/10 text-primary transition-all duration-200 ${
              isSearchVisible ? 'bg-primary/15' : ''
            }`}
            aria-label="Toggle search panel"
          >
            {isSearchVisible ? (
              <X size={20} className="stroke-[2.2] animate-in spin-in-90 duration-200" />
            ) : (
              <Search size={20} className="stroke-[2.2] animate-in fade-in duration-200" />
            )}
          </button>

          <div className="hidden md:flex items-center gap-2">
            <Link 
              href="/recipes/new" 
              className="flex items-center gap-2 rounded-full bg-primary hover:bg-primary/95 hover:shadow-md hover:scale-[1.02] active:scale-98 transition-all px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              <Plus size={16} /> Add recipe
            </Link>
            <Link 
              href="/account" 
              className="rounded-full border border-border px-4 py-2.5 text-sm hover:bg-muted/80 transition-colors"
            >
              My kitchen
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Search/Filter Panel (Smooth slide down) */}
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden md:hidden bg-card border-b border-border/40 ${
          isSearchVisible ? 'max-h-56 opacity-100 py-4 shadow-sm' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-5 flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
            <Search className="text-muted-foreground" size={16} />
            <input 
              aria-label="Search recipes mobile" 
              value={query} 
              onChange={(event) => setQuery(event.target.value)} 
              placeholder="Search your cookbook..." 
              className="w-full bg-transparent outline-none text-xs" 
            />
          </div>
          
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-1.5 border border-border/80 rounded-xl px-2.5 py-1.5 bg-background">
              <SlidersHorizontal size={12} className="text-muted-foreground" />
              <select 
                aria-label="Filter by difficulty mobile" 
                value={difficulty} 
                onChange={(event) => setDifficulty(event.target.value)} 
                className="bg-transparent text-[10px] outline-none cursor-pointer"
              >
                <option value="all">All levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <button 
              onClick={() => setOnlyFavorites((value) => !value)} 
              className={`rounded-xl px-3.5 py-1.5 text-[10px] font-medium transition-all ${
                onlyFavorites ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'
              }`}
            >
              {onlyFavorites ? 'Favorites' : 'Show Favorites'}
            </button>
            <span className="text-[10px] text-muted-foreground font-mono">{visible.length} items</span>
          </div>
        </div>
      </div>

      {/* Hero Section (Hidden on mobile, visible on desktop) */}
      <section className="hidden md:block mx-auto max-w-7xl px-5 pb-14 pt-16 sm:px-10 lg:pt-24 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <p className="eyebrow flex items-center gap-1.5">
          <Sparkles size={12} className="animate-pulse" />
          {offline ? 'Your offline collection.' : 'Good food, remembered.'}
        </p>
        
        <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl text-balance">
              Your recipes, <em className="text-primary not-italic font-sans font-light">beautifully</em> kept.
            </h1>
            <p className="mt-6 max-w-xl text-md sm:text-lg leading-8 text-muted-foreground">
              A private, calm place for the dishes you make on repeat and the ones you cannot wait to try.
            </p>
          </div>
          
          {/* Search Box (Desktop) */}
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 px-2">
              <Search className="text-muted-foreground" size={18} />
              <input 
                aria-label="Search recipes" 
                value={query} 
                onChange={(event) => setQuery(event.target.value)} 
                placeholder="Search your cookbook..." 
                className="w-full bg-transparent py-2 outline-none text-sm" 
              />
            </div>
            
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <SlidersHorizontal size={14} className="text-muted-foreground" />
              <select 
                aria-label="Filter by difficulty" 
                value={difficulty} 
                onChange={(event) => setDifficulty(event.target.value)} 
                className="bg-transparent text-xs outline-none cursor-pointer pr-4"
              >
                <option value="all">All levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              
              <button 
                onClick={() => setOnlyFavorites((value) => !value)} 
                className={`ml-2 rounded-full px-3 py-1 text-xs transition-all duration-200 ${
                  onlyFavorites ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {onlyFavorites ? 'Favorites' : 'Show Favorites'}
              </button>
              <span className="ml-auto text-xs text-muted-foreground font-mono">{visible.length} items</span>
            </div>
          </div>
        </div>
      </section>

      {/* Discovery / Recipes Listing */}
      <section id="discover" className="mx-auto max-w-7xl px-5 pb-24 sm:px-10 border-t border-border/20 pt-4 md:pt-8 animate-in fade-in duration-500 delay-150">
        
        {/* Mobile App Title Header */}
        <div className="md:hidden pt-5 pb-2 text-left px-1">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground leading-none">
            My Cookbook
          </h1>
          <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-primary mt-2">
            Good food, remembered.
          </p>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-col gap-5 border-b border-border pb-6 mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden md:block">
            <p className="eyebrow">{onlyFavorites || offline ? 'Your collection' : 'Your cookbook'}</p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl">{offline ? 'Saved for later' : 'Recipes'}</h2>
          </div>
          
          {/* Scrollable Category Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar select-none w-full md:w-auto">
            <button 
              onClick={() => setSelectedCategoryId('all')} 
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all shrink-0 ${
                selectedCategoryId === 'all' 
                  ? 'bg-primary text-primary-foreground shadow-sm scale-102 font-semibold' 
                  : 'border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              All Category
            </button>
            {categories.map((c) => (
              <button 
                key={c.id} 
                onClick={() => setSelectedCategoryId(c.id)} 
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all shrink-0 ${
                  selectedCategoryId === c.id 
                    ? 'bg-primary text-primary-foreground shadow-sm scale-102 font-semibold' 
                    : 'border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {c.name}
              </button>
            ))}
            <button 
              onClick={() => setIsCategoryManagerOpen(true)} 
              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-primary/20 text-primary hover:bg-primary/5 transition-all shrink-0 flex items-center gap-1 ml-auto md:ml-0"
              aria-label="Manage categories dialog"
            >
              <Settings2 size={12} /> Manage
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="py-24 text-center rounded-3xl border border-dashed border-border bg-muted/20 animate-in fade-in duration-300">
            <p className="font-serif text-2xl sm:text-3xl text-muted-foreground">{offline ? 'No saved recipes offline.' : 'No recipes found.'}</p>
            <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
              {offline ? 'Reconnect to sync favorites for your next kitchen session.' : 'Add a recipe or clear filters to discover more cooking ideas.'}
            </p>
            {!offline && (
              <Link 
                href="/recipes/new" 
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/95 shadow-sm"
              >
                <Plus size={16} /> Create Recipe
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((recipe) => { 
              const saved = favorites.includes(recipe.id)
              const cardImage = recipe.image_url ?? recipe.imageUrl
              const recipeCategory = categories.find(c => c.id === (recipe.category_id ?? recipe.categoryId))

              // Safe extraction of display cover image from single-URL or multiple-images JSON array
              let displayImageUrl = ''
              if (cardImage) {
                if (cardImage.startsWith('[')) {
                  try {
                    const parsed = JSON.parse(cardImage)
                    if (parsed && parsed.length > 0) displayImageUrl = parsed[0]
                  } catch (e) {
                    displayImageUrl = cardImage
                  }
                } else {
                  displayImageUrl = cardImage
                }
              }

              // Color-coded difficulty badges matching crumb branding
              const diffColors = {
                easy: 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200/30',
                medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/30',
                hard: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200/30',
              }
              const diffColorClass = diffColors[recipe.difficulty as keyof typeof diffColors] || 'bg-muted text-muted-foreground'

              return (
                <article 
                  key={recipe.id} 
                  className="group relative rounded-3xl border border-border/80 bg-card p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-3 duration-300"
                >
                  <div>
                    {/* Optional Image rendering */}
                    {displayImageUrl ? (
                      <div className="w-full h-44 overflow-hidden rounded-2xl mb-4 bg-muted border border-border/30 relative shadow-inner">
                        <img 
                          src={displayImageUrl} 
                          alt={recipe.title} 
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      </div>
                    ) : (
                      <div className="w-full h-8 overflow-hidden rounded-2xl mb-2 bg-gradient-to-r from-primary/5 to-primary/0 border-b border-primary/10"></div>
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Premium Colored Tags Layout */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase font-mono ${diffColorClass}`}>
                            {recipe.difficulty}
                          </span>
                          {recipeCategory && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold tracking-wider uppercase font-mono border border-primary/20">
                              {recipeCategory.name}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[9px] font-semibold tracking-wider uppercase font-mono border border-border/50">
                            {recipe.servings} Servings
                          </span>
                        </div>
                        
                        <h3 className="mt-3.5 font-serif text-2xl leading-tight text-balance group-hover:text-primary transition-colors">
                          <Link href={`/recipes/${recipe.id}`} className="after:absolute after:inset-0">
                            {recipe.title}
                          </Link>
                        </h3>
                      </div>
                      
                      {/* Favorite Button */}
                      <button 
                        aria-label={saved ? `Remove ${recipe.title} from favorites` : `Save ${recipe.title}`} 
                        onClick={() => toggleFavorite(recipe)} 
                        disabled={offline && !saved} 
                        className="relative z-20 rounded-full border border-border bg-card p-2.5 hover:bg-muted transition-all active:scale-[0.82] text-muted-foreground hover:text-primary disabled:opacity-50"
                      >
                        <Heart 
                          size={16} 
                          fill={saved ? 'currentColor' : 'none'} 
                          className={saved ? 'text-primary animate-in scale-in duration-200' : 'transition-colors hover:text-primary'} 
                        />
                      </button>
                    </div>

                    <p className="relative mt-3 line-clamp-2 min-h-12 leading-relaxed text-sm text-muted-foreground font-light">
                      {recipe.description || 'A simple and flavorful recipe worth cooking again.'}
                    </p>
                  </div>
                  
                  {/* Card Footer */}
                  <div className="relative mt-6 pt-4 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 size={14} /> 
                    <span>{recipe.preparation_time + recipe.cooking_time} min</span> 
                    <span className="ml-auto text-primary font-medium group-hover:translate-x-1 transition-transform">
                      View recipe →
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Category Manager Modal */}
      <CategoryManager 
        userId={userId}
        isOpen={isCategoryManagerOpen} 
        onClose={() => setIsCategoryManagerOpen(false)} 
        onChanged={loadCategories} 
      />
    </main>
  )
}

export default RecipeHome
