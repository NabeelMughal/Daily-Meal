import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecipeEditor } from '@/components/recipe-editor'

export default async function NewRecipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=login')
  return <main className="min-h-screen bg-background text-foreground"><header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-6 sm:px-10"><Link href="/" className="font-serif text-2xl">crumb<span className="text-primary">.</span></Link><Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link></header><section className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-10"><p className="eyebrow">Your kitchen</p><h1 className="mt-3 font-serif text-5xl tracking-tight text-balance">Add a recipe worth repeating.</h1><p className="mt-4 max-w-xl leading-7 text-muted-foreground">Capture the details while they are fresh. You can always come back and refine the story later.</p><div className="mt-10"><RecipeEditor /></div></section></main>
}
