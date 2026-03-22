/**
 * BmadPersonaDetail - Detail panel for a selected BMAD agent persona
 * Shows avatar, role, capabilities list, and "Run as [Persona]" button.
 */

import { memo } from 'react'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EnrichedPersona } from '@/hooks/useBmadPersonas'
import { BMAD_PHASE_LABELS } from '@/types/bmad'
import { Badge } from '@/components/ui/badge'

// =============================================================================
// Types
// =============================================================================

export interface BmadPersonaDetailProps {
  persona: EnrichedPersona | undefined
  executionCount?: number
  onRunAsPersona?: (persona: EnrichedPersona) => void
  className?: string
}

// =============================================================================
// Component
// =============================================================================

function BmadPersonaDetailComponent({
  persona,
  executionCount = 0,
  onRunAsPersona,
  className,
}: BmadPersonaDetailProps) {
  if (!persona) {
    return (
      <div className={cn('rounded-lg border bg-card p-4', className)}>
        <p className="text-sm text-muted-foreground">Select a persona to view details</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
            persona.avatarColor
          )}
        >
          {persona.initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">{persona.displayName}</span>
            <Badge variant="secondary" className="text-[10px]">
              {BMAD_PHASE_LABELS[persona.phase]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{persona.role}</p>
        </div>
      </div>

      {/* Capabilities */}
      <div className="mt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Capabilities
        </h4>
        <div className="flex flex-wrap gap-1">
          {persona.capabilities.map((cap) => (
            <span
              key={cap}
              className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Execution History */}
      {executionCount > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          {executionCount} execution{executionCount !== 1 ? 's' : ''} completed
        </div>
      )}

      {/* Run Button */}
      {onRunAsPersona && (
        <button
          onClick={() => onRunAsPersona(persona)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Play className="h-3.5 w-3.5" />
          Run as {persona.displayName}
        </button>
      )}
    </div>
  )
}

export const BmadPersonaDetail = memo(BmadPersonaDetailComponent)
