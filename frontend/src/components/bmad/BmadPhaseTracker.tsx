/**
 * BmadPhaseTracker - Horizontal 4-phase stepper showing
 * Analysis → Planning → Solutioning → Implementation with status colors
 */

import { memo } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BmadPhase, BmadPhaseStatus } from '@/types/bmad'
import { BMAD_PHASES, BMAD_PHASE_LABELS, BMAD_PHASE_DESCRIPTIONS, BMAD_PHASE_STATUS_STYLES } from '@/types/bmad'
import type { PhaseInfo } from '@/hooks/useBmadPipeline'

// =============================================================================
// Types
// =============================================================================

export interface BmadPhaseTrackerProps {
  phases: PhaseInfo[]
  currentPhase: BmadPhase | null
  onPhaseClick?: (phase: BmadPhase) => void
  className?: string
}

// =============================================================================
// Phase Step Icon
// =============================================================================

function PhaseIcon({ status, className }: { status: BmadPhaseStatus; className?: string }) {
  const styles = BMAD_PHASE_STATUS_STYLES[status]
  const iconClass = cn('h-6 w-6', styles.icon, className)

  switch (status) {
    case 'completed':
      return <CheckCircle2 className={iconClass} />
    case 'active':
      return <Loader2 className={cn(iconClass, 'animate-spin')} />
    case 'upcoming':
      return <Circle className={iconClass} />
  }
}

// =============================================================================
// Component
// =============================================================================

function BmadPhaseTrackerComponent({
  phases,
  currentPhase,
  onPhaseClick,
  className,
}: BmadPhaseTrackerProps) {
  return (
    <div className={cn('flex items-center gap-0', className)}>
      {BMAD_PHASES.map((phase, index) => {
        const phaseInfo = phases.find((p) => p.phase === phase)
        const status = phaseInfo?.status ?? 'upcoming'
        const styles = BMAD_PHASE_STATUS_STYLES[status]
        const isLast = index === BMAD_PHASES.length - 1

        return (
          <div key={phase} className="flex items-center">
            {/* Phase step */}
            <button
              onClick={() => onPhaseClick?.(phase)}
              disabled={!onPhaseClick}
              className={cn(
                'flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-colors',
                styles.border,
                styles.background,
                onPhaseClick && 'cursor-pointer hover:opacity-80',
                !onPhaseClick && 'cursor-default',
                phase === currentPhase && 'ring-2 ring-primary/20 ring-offset-1 ring-offset-background'
              )}
            >
              <PhaseIcon status={status} />
              <div className="text-left">
                <div className={cn('text-sm font-semibold', styles.text)}>
                  {BMAD_PHASE_LABELS[phase]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {phaseInfo
                    ? `${phaseInfo.completedArtifacts}/${phaseInfo.totalArtifacts} artifacts`
                    : BMAD_PHASE_DESCRIPTIONS[phase]}
                </div>
              </div>
            </button>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'h-0.5 w-8',
                  status === 'completed' ? 'bg-green-500' : 'bg-border'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export const BmadPhaseTracker = memo(BmadPhaseTrackerComponent)
