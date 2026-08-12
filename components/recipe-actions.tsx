'use client'

import { useState } from 'react'
import { Copy, Download, Printer, Share2, Edit, Trash2, Check, Loader2 } from 'lucide-react'
import { pdf, Document, Page, Text, StyleSheet } from '@react-pdf/renderer'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Props = { 
  recipeId: string
  title: string 
  description?: string | null 
  ingredients: Array<{ name: string; quantity?: string; unit?: string }> 
  instructions: Array<{ instruction: string }> 
}

const styles = StyleSheet.create({ 
  page: { padding: 44, fontSize: 11, color: '#27231e' }, 
  title: { fontSize: 28, marginBottom: 10 }, 
  section: { marginTop: 22, fontSize: 16, marginBottom: 8 }, 
  line: { marginBottom: 6, lineHeight: 1.4 } 
})

function RecipeDocument({ title, description, ingredients, instructions }: Omit<Props, 'recipeId'>) { 
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.line}>{description}</Text>}
        
        <Text style={styles.section}>Ingredients</Text>
        {ingredients.map((item, index) => (
          <Text key={index} style={styles.line}>
            • {[item.quantity, item.unit, item.name].filter(Boolean).join(' ')}
          </Text>
        ))}
        
        <Text style={styles.section}>Method</Text>
        {instructions.map((item, index) => (
          <Text key={index} style={styles.line}>
            {index + 1}. {item.instruction}
          </Text>
        ))}
      </Page>
    </Document>
  )
}

export function RecipeActions({ recipeId, title, description, ingredients, instructions }: Props) { 
  const router = useRouter()
  const [downloadBusy, setDownloadBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [copied, setCopied] = useState(false)

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

    </div>
  ) 
}
