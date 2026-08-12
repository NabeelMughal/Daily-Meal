'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react'

export function ImageSlideshow({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  if (!images || images.length === 0) return null

  function nextSlide() {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  function prevSlide() {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  return (
    <div className="w-full relative mt-8 select-none">
      
      {/* Slideshow Container */}
      <div className="relative w-full overflow-hidden rounded-3xl border border-border/50 shadow-sm aspect-video sm:aspect-[21/9] max-h-[420px] bg-muted/30 group">
        
        {/* Active Image */}
        <img
          src={images[currentIndex]}
          alt={`Recipe slide ${currentIndex + 1}`}
          className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 hover:scale-[1.01]"
          onClick={() => setIsPreviewOpen(true)}
        />

        {/* Zoom Overlay Indicator */}
        <button
          onClick={() => setIsPreviewOpen(true)}
          className="absolute bottom-4 right-4 p-2 bg-black/60 hover:bg-black/75 rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
          aria-label="Zoom image"
        >
          <Maximize2 size={16} />
        </button>

        {/* Left Arrow Button */}
        {images.length > 1 && (
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-all shadow-md active:scale-95 z-10"
            aria-label="Previous image"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Right Arrow Button */}
        {images.length > 1 && (
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-all shadow-md active:scale-95 z-10"
            aria-label="Next image"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Navigation Dot Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/25 px-3 py-1.5 rounded-full backdrop-blur-sm">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`size-2 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'bg-white w-4' : 'bg-white/50'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Full-Screen Zoom Modal */}
      {isPreviewOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setIsPreviewOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setIsPreviewOpen(false)}
            className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-50 shadow-md cursor-pointer"
            aria-label="Close image zoom"
          >
            <X size={22} />
          </button>

          {/* Full Screen Image */}
          <div className="max-w-[95vw] max-h-[90vh] flex items-center justify-center animate-in zoom-in-95 duration-250">
            <img
              src={images[currentIndex]}
              alt={`Full size recipe photo ${currentIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl select-none"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
            />
          </div>
        </div>
      )}
    </div>
  )
}
