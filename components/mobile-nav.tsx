'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { BookOpen, Heart, Plus, Tag, User } from 'lucide-react'

function MobileNavContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const filter = searchParams?.get('filter')
  const manage = searchParams?.get('manage')
  
  let activeTab = 'home'
  if (pathname === '/account') {
    activeTab = 'account'
  } else if (pathname === '/recipes/new') {
    activeTab = 'add'
  } else if (filter === 'favorites') {
    activeTab = 'favorites'
  } else if (manage === 'categories') {
    activeTab = 'categories'
  }

  return (
    <div className="fixed bottom-0 inset-x-0 h-16 bg-card/95 backdrop-blur-md border-t border-border z-40 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.04)] md:hidden">
      
      {/* Cookbook (Home) Tab */}
      <Link 
        href="/" 
        className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all duration-200 ${
          activeTab === 'home' ? 'text-primary scale-102 font-medium' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <BookOpen size={20} className={activeTab === 'home' ? 'stroke-[2.2]' : ''} />
        <span className="text-[10px] mt-1 font-sans">Cookbook</span>
      </Link>
      
      {/* Favorites Tab */}
      <Link 
        href="/?filter=favorites" 
        className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all duration-200 ${
          activeTab === 'favorites' ? 'text-primary scale-102 font-medium' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Heart size={20} className={activeTab === 'favorites' ? 'fill-primary stroke-primary scale-105' : ''} />
        <span className="text-[10px] mt-1 font-sans">Favorites</span>
      </Link>
      
      {/* Plus Button (Center Floating Tab) */}
      <Link 
        href="/recipes/new" 
        className="flex flex-col items-center justify-center flex-1 h-full -mt-5 relative z-50 select-none scale-105"
        aria-label="Add new recipe"
      >
        <div className="flex items-center justify-center size-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 active:scale-90 transition-all hover:bg-primary/95">
          <Plus size={24} className="stroke-[2.5]" />
        </div>
        <span className="text-[10px] mt-1 font-medium text-muted-foreground">Add</span>
      </Link>
      
      {/* Categories Tab */}
      <Link 
        href="/?manage=categories" 
        className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all duration-200 ${
          activeTab === 'categories' ? 'text-primary scale-102 font-medium' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Tag size={20} className={activeTab === 'categories' ? 'stroke-[2.2]' : ''} />
        <span className="text-[10px] mt-1 font-sans">Categories</span>
      </Link>
      
      {/* Kitchen (Account) Tab */}
      <Link 
        href="/account" 
        className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all duration-200 ${
          activeTab === 'account' ? 'text-primary scale-102 font-medium' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <User size={20} className={activeTab === 'account' ? 'stroke-[2.2]' : ''} />
        <span className="text-[10px] mt-1 font-sans">Kitchen</span>
      </Link>
      
    </div>
  )
}

export function MobileNav() {
  return (
    <Suspense fallback={null}>
      <MobileNavContent />
    </Suspense>
  )
}
