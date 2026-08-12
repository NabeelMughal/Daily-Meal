'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Clock3, Heart, Plus, Search, SlidersHorizontal, Settings2, Loader2, Sparkles } from 'lucide-react'
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

  // Load favorites
  useEffect(() => { 
    listCachedFavorites(userId).then((items) => { 
      setFavoriteRecipes(items)
      setFavorites(items.map((item) => item.id)) 
    }) 
  }, [userId])

  // Sync favorites online -> offline DB
  useEffect(() => { 
    if (navigator.onLine && recipes.length) {
      cacheFavoriteRecipes(userId, favoriteRecipes.filter((item) => favorites.includes(item.id))).catch(() => {}) 
    }
  }, [favoriteRecipes, favorites, recipes.length, userId])

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

  // Toggle favorite with optimistic updates and loading states
  async function toggleFavorite(recipe: Recipe) { 
    const saved = favorites.includes(recipe.id)
    setFavLoadingId(recipe.id)

    if (!navigator.onLine) { 
      if (saved) { 
        setFavorites((current) => current.filter((id) => id !== recipe.id))
        setFavoriteRecipes((current) => current.filter((item) => item.id !== recipe.id))
        await setCachedFavorite(userId, recipe.id, false) 
      }
      setFavLoadingId(null)
      return 
    } 

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setFavLoadingId(null)
      return
    }

    try {
      const result = saved 
        ? await supabase.from('favorites').delete().eq('recipe_id', recipe.id).eq('user_id', user.id) 
        : await supabase.from('favorites').insert({ user_id: user.id, recipe_id: recipe.id })

      if (!result.error) { 
        setFavorites((current) => saved ? current.filter((id) => id !== recipe.id) : [...current, recipe.id])
        if (!saved) { 
          const cached = toCachedRecipe(userId, recipe)
          setFavoriteRecipes((current) => [...current.filter((item) => item.id !== recipe.id), cached])
          await cacheFavoriteRecipes(userId, [cached]) 
        } else {
          await setCachedFavorite(userId, recipe.id, false) 
        }
      } 
    } catch (err) {
      console.error(err)
    } finally {
      setFavLoadingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-10 border-b border-border/30">
        <Link href="/" className="font-serif text-2xl tracking-tight hover:scale-105 transition-transform duration-200">
          crumb<span className="text-primary">.</span>
        </Link>
        
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#discover" className="hover:text-foreground transition-colors">Discover</a>
          <button onClick={() => setOnlyFavorites(true)} className="hover:text-foreground transition-colors">Your collection</button>
        </nav>
        
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
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-5 pb-14 pt-16 sm:px-10 lg:pt-24 animate-in fade-in slide-in-from-bottom-2 duration-700">
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
          
          {/* Search Box */}
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
      <section id="discover" className="mx-auto max-w-7xl px-5 pb-24 sm:px-10 border-t border-border/20 pt-8 animate-in fade-in duration-500 delay-150">
        
        {/* Categories Bar */}
        <div className="flex flex-col gap-5 border-b border-border pb-6 mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">{onlyFavorites || offline ? 'Your collection' : 'Your cookbook'}</p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl">{offline ? 'Saved for later' : 'Recipes'}</h2>
          </div>
          
          {/* Scrollable Category Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar select-none">
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
              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-primary/20 text-primary hover:bg-primary/5 transition-all shrink-0 flex items-center gap-1"
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
              const isFavLoading = favLoadingId === recipe.id

              return (
                <article 
                  key={recipe.id} 
                  className="group relative rounded-3xl border border-border bg-card p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-3 duration-300"
                >
                  <div>
                    {/* Optional Image rendering */}
                    {cardImage ? (
                      <div className="w-full h-44 overflow-hidden rounded-2xl mb-4 bg-muted border border-border/30 relative">
                        <img 
                          src={cardImage} 
                          alt={recipe.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      </div>
                    ) : (
                      <div className="w-full h-8 overflow-hidden rounded-2xl mb-2 bg-gradient-to-r from-primary/5 to-primary/0 border-b border-primary/10"></div>
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="eyebrow text-[10px]">{recipe.difficulty}</span>
                          <span className="text-muted-foreground/45 text-[10px]">•</span>
                          <span className="eyebrow text-[10px]">{recipe.servings} servings</span>
                          {recipeCategory && (
                            <>
                              <span className="text-muted-foreground/45 text-[10px]">•</span>
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold tracking-wider uppercase font-mono">
                                {recipeCategory.name}
                              </span>
                            </>
                          )}
                        </div>
                        
                        <h3 className="mt-3 font-serif text-2xl leading-tight text-balance group-hover:text-primary transition-colors">
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
                        className="relative z-20 rounded-full border border-border bg-card p-2.5 hover:bg-muted transition-all active:scale-90 text-muted-foreground hover:text-primary disabled:opacity-50"
                      >
                        {isFavLoading ? (
                          <Loader2 size={16} className="animate-spin text-primary" />
                        ) : (
                          <Heart 
                            size={16} 
                            fill={saved ? 'currentColor' : 'none'} 
                            className={saved ? 'text-primary animate-in zoom-in duration-200' : ''} 
                          />
                        )}
                      </button>
                    </div>

                    <p className="relative mt-3 line-clamp-2 min-h-12 leading-relaxed text-sm text-muted-foreground">
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
        isOpen={isCategoryManagerOpen} 
        onClose={() => setIsCategoryManagerOpen(false)} 
        onChanged={loadCategories} 
      />
    </main>
  )
}

export default RecipeHome
