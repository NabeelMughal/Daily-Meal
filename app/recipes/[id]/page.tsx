import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Clock, ChefHat, Users } from 'lucide-react'
import { RecipeActions } from '@/components/recipe-actions'
import { createClient } from '@/lib/supabase/server'
import { InteractiveIngredients } from '@/components/interactive-ingredients'
import { ImageSlideshow } from '@/components/image-slideshow'

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=login')

  // Safe database query to fetch recipe, ingredients, instructions, and joined category
  let recipe: any = null
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*, ingredients(*), instructions(*), categories(name)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (!error) {
      recipe = data
    } else {
      throw error
    }
  } catch (err) {
    console.warn('Could not load joined categories schema, trying recipe-only fallback...', err)
    // Fallback if categories join isn't migrated in the db yet
    const { data } = await supabase
      .from('recipes')
      .select('*, ingredients(*), instructions(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    recipe = data
  }

  if (!recipe) notFound()

  // Track recently viewed in a try-catch block to avoid crashing on schema mismatch
  try {
    await supabase.from('recently_viewed').upsert(
      { user_id: user.id, recipe_id: id, viewed_at: new Date().toISOString() }, 
      { onConflict: 'user_id,recipe_id' }
    )
  } catch (err) {
    console.error('Failed to log recently viewed history:', err)
  }

  const ingredients = [...(recipe.ingredients ?? [])].sort((a, b) => a.position - b.position)
  const instructions = [...(recipe.instructions ?? [])].sort((a, b) => a.position - b.position)
  
  // Extract category name
  const categoryName = recipe.categories 
    ? (Array.isArray(recipe.categories) ? recipe.categories[0]?.name : recipe.categories.name) 
    : null

  // Parse multiple images JSON array (backward-compatible)
  let images: string[] = []
  if (recipe.image_url) {
    if (recipe.image_url.startsWith('[')) {
      try {
        images = JSON.parse(recipe.image_url)
      } catch (e) {
        images = [recipe.image_url]
      }
    } else {
      images = [recipe.image_url]
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* Responsive Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-10 border-b border-border/30">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft size={16} /> 
          <span>Cookbook</span>
        </Link>
        
        <Link href="/" className="font-serif text-2xl tracking-tight">
          crumb<span className="text-primary">.</span>
        </Link>
      </header>

      {/* Main Content Article */}
      <article className="mx-auto max-w-5xl px-5 pb-24 pt-8 sm:px-10 animate-in fade-in duration-500">
        
        {/* Metadata & Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {categoryName && (
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider font-mono">
              {categoryName}
            </span>
          )}
          
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/60 px-3 py-1 rounded-full border border-border/45">
            <ChefHat size={12} />
            <span className="capitalize">{recipe.difficulty} level</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/60 px-3 py-1 rounded-full border border-border/45">
            <Clock size={12} />
            <span>{recipe.preparation_time + recipe.cooking_time} min</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/60 px-3 py-1 rounded-full border border-border/45">
            <Users size={12} />
            <span>Serves {recipe.servings}</span>
          </div>
        </div>

        {/* Recipe Title with Responsive Typography */}
        <h1 className="mt-5 font-serif text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-tight text-balance">
          {recipe.title}
        </h1>

        {recipe.description && (
          <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-muted-foreground font-light">
            {recipe.description}
          </p>
        )}

        {/* Unified actions toolbar (Edit, Delete, PDF, print, etc.) */}
        <div className="mt-8 border-y border-border/60 py-4 max-w-full">
          <RecipeActions 
            recipeId={recipe.id}
            title={recipe.title} 
            description={recipe.description} 
            ingredients={ingredients} 
            instructions={instructions} 
          />
        </div>

        {/* Hero Image Slideshow Section */}
        <ImageSlideshow images={images} />

        {/* Split Grid for Ingredients and Method */}
        <div className="mt-12 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] border-t border-border/20 pt-10">
          
          {/* Ingredients Column */}
          <section className="animate-in fade-in duration-500 delay-150">
            <h2 className="font-serif text-2xl sm:text-3xl tracking-tight flex items-center justify-between border-b border-border pb-3">
              <span>Ingredients</span>
              <span className="text-xs font-sans text-muted-foreground font-normal">Click to cross off items</span>
            </h2>
            <InteractiveIngredients ingredients={ingredients} />
          </section>

          {/* Method / Instructions Column */}
          <section className="animate-in fade-in duration-500 delay-300">
            <h2 className="font-serif text-2xl sm:text-3xl tracking-tight border-b border-border pb-3 mb-5">
              Method
            </h2>
            
            <ol className="flex flex-col gap-6">
              {instructions.map((item, index) => (
                <li key={item.id} className="flex gap-4 items-start pb-5 border-b border-border/20 last:border-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="leading-relaxed text-sm sm:text-base text-foreground/90">
                      {item.instruction}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

        </div>
      </article>
    </main>
  )
}
