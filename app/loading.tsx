import { Loader2 } from 'lucide-react'

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-card border border-border/80 shadow-2xl">
        <div className="relative flex items-center justify-center">
          <Loader2 className="animate-spin text-primary size-12 stroke-[1.5]" />
          <div className="absolute size-6 rounded-full bg-primary/10 animate-ping"></div>
        </div>
        <p className="text-sm font-serif text-primary font-medium tracking-wide animate-pulse">
          Loading cookbook...
        </p>
      </div>
    </div>
  )
}
