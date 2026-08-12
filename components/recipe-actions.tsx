'use client'

import { useState } from 'react'
import { Copy, Download, Printer, Share2, Edit, Trash2, Check, Loader2, BookOpen, X } from 'lucide-react'
import { pdf, Document, Page, Text, Image, View, StyleSheet } from '@react-pdf/renderer'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { FullScreenLoading } from './full-screen-loading'

type Props = { 
  recipeId: string
  title: string 
  description?: string | null 
  ingredients: Array<{ name: string; quantity?: string; unit?: string }> 
  instructions: Array<{ instruction: string }> 
  prep?: number
  cook?: number
  servings?: number
  difficulty?: string
  imageUrl?: string | null
}

const styles = StyleSheet.create({ 
  page: { padding: 44, fontSize: 10, color: '#33302c', fontFamily: 'Helvetica' }, 
  header: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0ede6', paddingBottom: 15 },
  brand: { fontSize: 8, color: '#8c7e6c', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 24, color: '#40301d', fontWeight: 'bold', marginBottom: 6 },
  description: { fontSize: 10, color: '#666159', fontStyle: 'italic', lineHeight: 1.4, marginBottom: 10 },
  recipeImage: { width: '100%', height: 180, objectFit: 'cover', borderRadius: 12, marginBottom: 15 },
  metaRow: { flexDirection: 'row', gap: 15, borderBottomWidth: 1, borderBottomColor: '#f5f2eb', paddingBottom: 8, marginBottom: 15 },
  metaItem: { fontSize: 9, color: '#8c7e6c' },
  section: { fontSize: 13, color: '#40301d', fontWeight: 'bold', marginTop: 15, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e8e5dc', paddingBottom: 3 },
  listItem: { marginBottom: 5, lineHeight: 1.4, flexDirection: 'row' },
  listBullet: { width: 12, fontSize: 10, color: '#8c7e6c' },
  listText: { flex: 1, fontSize: 10 },
  stepNumber: { width: 20, fontSize: 10, color: '#8c7e6c', fontWeight: 'bold' }
})

function RecipeDocument({ title, description, ingredients, instructions, prep = 0, cook = 0, servings = 1, difficulty = 'easy', imageUrl }: Omit<Props, 'recipeId'>) { 
  let firstImage = ''
  if (imageUrl) {
    if (imageUrl.startsWith('[')) {
      try {
        const parsed = JSON.parse(imageUrl)
        if (parsed && parsed.length > 0) firstImage = parsed[0]
      } catch (e) {
        firstImage = imageUrl
      }
    } else {
      firstImage = imageUrl
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.brand}>crumb. Cookbook</Text>
          <Text style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>

        {/* Cover Photo */}
        {firstImage && <Image src={firstImage} style={styles.recipeImage} />}

        {/* Meta Stats */}
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>DIFFICULTY: {difficulty.toUpperCase()}</Text>
          <Text style={styles.metaItem}>PREP: {prep} MINS</Text>
          <Text style={styles.metaItem}>COOK: {cook} MINS</Text>
          <Text style={styles.metaItem}>SERVINGS: {servings}</Text>
        </View>
        
        {/* Ingredients Block */}
        <Text style={styles.section}>Ingredients</Text>
        {ingredients.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listBullet}>•</Text>
            <Text style={styles.listText}>
              {[item.quantity, item.unit, item.name].filter(Boolean).join(' ')}
            </Text>
          </View>
        ))}
        
        {/* Steps Block */}
        <Text style={styles.section}>Method</Text>
        {instructions.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.stepNumber}>{index + 1}.</Text>
            <Text style={styles.listText}>{item.instruction}</Text>
          </View>
        ))}
      </Page>
    </Document>
  )
}

export function RecipeActions({ 
  recipeId, 
  title, 
  description, 
  ingredients, 
  instructions,
  prep = 0,
  cook = 0,
  servings = 1,
  difficulty = 'easy',
  imageUrl = null
}: Props) { 
  const router = useRouter()
  const [downloadBusy, setDownloadBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Share action
  async function share() { 
    const url = window.location.href
    if (navigator.share) { 
      try { 
        await navigator.share({ 
          title: title, 
          text: description ?? 'A recipe from crumb.', 
          url 
        }) 
      } catch (err) {
        console.error(err)
      } 
    } else { 
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } 
  } 

  // PDF download action
  async function download() { 
    setDownloadBusy(true) 
    try { 
      const blob = await pdf(
        <RecipeDocument 
          title={title} 
          description={description} 
          ingredients={ingredients} 
          instructions={instructions}
          prep={prep}
          cook={cook}
          servings={servings}
          difficulty={difficulty}
          imageUrl={imageUrl}
        />
      ).toBlob()
      
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
      anchor.click()
      URL.revokeObjectURL(url) 
    } catch (err) { 
      console.error(err)
      window.alert('Could not create the PDF. Try printing instead.') 
    } finally { 
      setDownloadBusy(false) 
    } 
  } 

  // Delete recipe action
  async function remove() {
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return
    setDeleteBusy(true)
    try {
      const { error } = await createClient().from('recipes').delete().eq('id', recipeId)
      if (error) throw new Error(error.message)
      router.push('/')
      router.refresh()
    } catch (err: any) {
      window.alert('Could not delete recipe: ' + err.message)
      setDeleteBusy(false)
    }
  }

  // Copy link action
  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 max-w-full print:hidden">
      <FullScreenLoading show={deleteBusy} message="Deleting recipe..." />
      <FullScreenLoading show={downloadBusy} message="Preparing PDF download..." />
      
      {/* Edit Recipe Button */}
      <Link 
        href={`/recipes/${recipeId}/edit`}
        className="flex items-center gap-2 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-2 text-sm transition-all duration-200"
      >
        <Edit size={14} /> 
        <span className="hidden sm:inline">Edit</span>
      </Link>

      {/* Delete Recipe Button */}
      <button 
        onClick={remove} 
        disabled={deleteBusy}
        className="flex items-center gap-2 rounded-full border border-destructive/20 bg-card hover:bg-destructive/5 text-destructive/80 hover:text-destructive px-3 py-2 text-sm disabled:opacity-50 transition-all duration-200"
      >
        {deleteBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        <span className="hidden sm:inline">{deleteBusy ? 'Deleting…' : 'Delete'}</span>
      </button>

      <span className="h-6 w-px bg-border/60 mx-1 hidden sm:inline" />

      {/* Quick Preview Button */}
      <button 
        onClick={() => setIsPreviewOpen(true)}
        className="flex items-center gap-2 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-2 text-sm transition-all duration-200"
      >
        <BookOpen size={14} /> 
        <span>Preview</span>
      </button>

      {/* Share Button */}
      <button 
        onClick={share} 
        className="flex items-center gap-2 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-2 text-sm transition-all duration-200"
      >
        <Share2 size={14} /> 
        <span>Share</span>
      </button>

      {/* Print Button */}
      <button 
        onClick={() => window.print()} 
        className="flex items-center gap-2 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-2 text-sm transition-all duration-200"
      >
        <Printer size={14} /> 
        <span className="hidden md:inline">Print</span>
      </button>

      {/* PDF Download Button */}
      <button 
        onClick={download} 
        disabled={downloadBusy} 
        className="flex items-center gap-2 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-60 transition-all duration-200 shadow-sm"
      >
        {downloadBusy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        <span>PDF</span>
      </button>

      {/* Copy Link Button */}
      <button 
        onClick={handleCopy} 
        aria-label="Copy recipe link" 
        className="rounded-full border border-border bg-card hover:bg-muted p-2 text-muted-foreground hover:text-foreground transition-all duration-200"
      >
        {copied ? (
          <Check size={14} className="text-primary animate-in zoom-in duration-200" />
        ) : (
          <Copy size={14} />
        )}
      </button>

      {/* Quick Preview Modal overlay */}
      {isPreviewOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div 
            className="w-full max-w-lg rounded-3xl bg-card border border-border p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto cursor-default animate-in zoom-in-95 duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
              <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">Recipe Summary</span>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 hover:bg-muted rounded-full transition-colors"
                aria-label="Close summary modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Title & Description */}
            <h2 className="font-serif text-2xl text-foreground font-semibold leading-tight">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic">{description}</p>}
            
            {/* Meta tags badges */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-mono font-semibold uppercase tracking-wider border border-primary/20">
                Difficulty: {difficulty}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[9px] font-mono font-semibold uppercase tracking-wider">
                Prep: {prep} mins
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[9px] font-mono font-semibold uppercase tracking-wider">
                Cook: {cook} mins
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[9px] font-mono font-semibold uppercase tracking-wider">
                {servings} Servings
              </span>
            </div>

            {/* Quick Ingredients */}
            <div className="mt-6">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-1 mb-2 font-mono">Ingredients List</h3>
              <ul className="text-xs text-muted-foreground flex flex-col gap-1.5 pl-1">
                {ingredients.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="text-primary font-bold text-[10px]">•</span>
                    <span>{[item.quantity, item.unit, item.name].filter(Boolean).join(' ')}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Steps */}
            <div className="mt-5">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-1 mb-2 font-mono">Method Overview</h3>
              <ol className="text-xs text-muted-foreground flex flex-col gap-2.5 pl-1">
                {instructions.map((item, idx) => (
                  <li key={idx} className="flex gap-2 items-start">
                    <span className="font-semibold text-primary font-mono text-[10px] shrink-0 mt-0.5">{idx + 1}.</span>
                    <span className="leading-relaxed">{item.instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

    </div>
  ) 
}
