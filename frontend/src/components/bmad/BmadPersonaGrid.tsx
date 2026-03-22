/**
 * BmadPersonaGrid - 3x3 grid of BMAD agent persona avatars
 * Shows colored circles with initials, name, and role subtitle.
 * Active persona gets a ring highlight.
 */

import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { EnrichedPersona } from '@/hooks/useBmadPersonas'

// =============================================================================
// Types
// =============================================================================

export interface BmadPersonaGridProps {
  personas: EnrichedPersona[]
  activePersona?: string
  onPersonaClick?: (persona: EnrichedPersona) => void
  className?: string
}

// =============================================================================
// Component
// =============================================================================

function BmadPersonaGridComponent({
  personas,
  activePersona,
  onPersonaClick,
  className,
}: BmadPersonaGridProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
      {personas.map((persona) => {
        const isActive = persona.name === activePersona

        return (
          <button
            key={persona.name}
            onClick={() => onPersonaClick?.(persona)}
            disabled={!onPersonaClick}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors',
              isActive
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border bg-card hover:bg-accent/50',
              onPersonaClick ? 'cursor-pointer' : 'cursor-default'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white',
                persona.avatarColor,
                isActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}
            >
              {persona.initials}
            </div>

            {/* Name & Role */}
            <div className="min-w-0 text-center">
              <div className="truncate text-xs font-semibold">{persona.displayName}</div>
              <div className="truncate text-[10px] text-muted-foreground">{persona.role}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export const BmadPersonaGrid = memo(BmadPersonaGridComponent)
