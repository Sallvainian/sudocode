/**
 * BmadActiveAgentPanel - Shows the current/recommended persona
 * with avatar, role, and capabilities
 */

import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { EnrichedPersona } from '@/hooks/useBmadPersonas'
import { BMAD_PHASE_LABELS } from '@/types/bmad'
import { Badge } from '@/components/ui/badge'

// =============================================================================
// Types
// =============================================================================

export interface BmadActiveAgentPanelProps {
  persona: EnrichedPersona | undefined
  className?: string
}

// =============================================================================
// Component
// =============================================================================

function BmadActiveAgentPanelComponent({ persona, className }: BmadActiveAgentPanelProps) {
  if (!persona) {
    return (
      <div className={cn('rounded-lg border bg-card p-4', className)}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Active Agent</h3>
        <p className="text-sm text-muted-foreground">No agent recommended for current phase</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Active Agent</h3>

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
            persona.avatarColor
          )}
        >
          {persona.initials}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">{persona.displayName}</span>
            <Badge variant="secondary" className="text-[10px]">
              {BMAD_PHASE_LABELS[persona.phase]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{persona.role}</p>

          {/* Capabilities */}
          <div className="mt-2 flex flex-wrap gap-1">
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
      </div>
    </div>
  )
}

export const BmadActiveAgentPanel = memo(BmadActiveAgentPanelComponent)
