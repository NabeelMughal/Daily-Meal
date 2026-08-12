'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

type Ingredient = {
  id: string
  name: string
  quantity?: string
  unit?: string
  notes?: string
}

export function InteractiveIngredients({ ingredients }: { ingredients: Ingredient[] }) {
  const [checkedIds, setCheckedIds] = useState<string[]>([])

  function toggle(id: string) {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <ul className="mt-5 flex flex-col gap-3">
      {ingredients.map((item) => {
        const isChecked = checkedIds.includes(item.id)
        return (
          <li
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`flex items-center justify-between gap-4 border-b border-border/60 pb-3 cursor-pointer select-none group transition-all duration-200 ${
              isChecked ? 'opacity-35 line-through text-muted-foreground' : 'hover:translate-x-0.5'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                  isChecked
                    ? 'bg-primary border-primary text-primary-foreground scale-105'
                    : 'border-border group-hover:border-primary/40 bg-card'
                }`}
              >
                {isChecked && <Check size={11} className="stroke-[3]" />}
              </span>
              <span className="text-sm sm:text-base font-medium">{item.name}</span>
            </div>
            
            <span
              className={`text-xs sm:text-sm transition-colors font-mono ${
                isChecked ? 'text-muted-foreground' : 'text-muted-foreground/80'
              }`}
            >
              {[item.quantity, item.unit].filter(Boolean).join(' ')}
              {item.notes && <span className="text-[10px] text-muted-foreground ml-1">({item.notes})</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
