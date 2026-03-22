/**
 * BmadArtifactChecklist - Sidebar list of artifacts with completion checkmarks
 * Groups artifacts by phase and shows existence status
 */

import { memo } from 'react'
import { CheckCircle2, Circle, FileText, FileCode, Layout, BookOpen, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BmadArtifactInfo, BmadPhase } from '@/types/bmad'
import { BMAD_PHASES, BMAD_PHASE_LABELS, ARTIFACT_PHASE_MAP } from '@/types/bmad'

// =============================================================================
// Types
// =============================================================================

export interface BmadArtifactChecklistProps {
  artifacts: BmadArtifactInfo[]
  className?: string
}

// =============================================================================
// Artifact Display Helpers
// =============================================================================

const ARTIFACT_LABELS: Record<string, string> = {
  'product-brief': 'Product Brief',
  'project-context': 'Project Context',
  prd: 'PRD',
  architecture: 'Architecture',
  'ux-spec': 'UX Spec',
  epic: 'Epic',
  story: 'Story',
  'sprint-status': 'Sprint Status',
}

function ArtifactIcon({ type, className }: { type: string; className?: string }) {
  const iconClass = cn('h-4 w-4', className)
  switch (type) {
    case 'prd':
      return <FileText className={iconClass} />
    case 'architecture':
      return <FileCode className={iconClass} />
    case 'ux-spec':
      return <Layout className={iconClass} />
    case 'product-brief':
      return <Briefcase className={iconClass} />
    case 'project-context':
      return <BookOpen className={iconClass} />
    default:
      return <FileText className={iconClass} />
  }
}

// =============================================================================
// Component
// =============================================================================

function BmadArtifactChecklistComponent({ artifacts, className }: BmadArtifactChecklistProps) {
  // Group artifacts by phase
  const groupedByPhase: Record<BmadPhase, BmadArtifactInfo[]> = {
    analysis: [],
    planning: [],
    solutioning: [],
    implementation: [],
  }

  for (const artifact of artifacts) {
    const phase = ARTIFACT_PHASE_MAP[artifact.type]
    if (phase) {
      groupedByPhase[phase].push(artifact)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-sm font-semibold text-foreground">Artifacts</h3>

      {BMAD_PHASES.map((phase) => {
        const phaseArtifacts = groupedByPhase[phase]
        if (phaseArtifacts.length === 0) return null

        const completed = phaseArtifacts.filter((a) => a.exists).length
        const total = phaseArtifacts.length

        return (
          <div key={phase} className="space-y-1">
            {/* Phase header */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium uppercase tracking-wider">
                {BMAD_PHASE_LABELS[phase]}
              </span>
              <span>
                {completed}/{total}
              </span>
            </div>

            {/* Artifact items */}
            <div className="space-y-0.5">
              {phaseArtifacts.map((artifact, index) => (
                <div
                  key={`${artifact.type}-${index}`}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                    artifact.exists
                      ? 'text-foreground'
                      : 'text-muted-foreground opacity-60'
                  )}
                >
                  {artifact.exists ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <ArtifactIcon type={artifact.type} className="shrink-0" />
                  <span className={cn('truncate', artifact.exists && 'font-medium')}>
                    {ARTIFACT_LABELS[artifact.type] ?? artifact.type}
                    {(artifact.type === 'epic' || artifact.type === 'story') && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({artifact.filename})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {artifacts.length === 0 && (
        <p className="text-sm text-muted-foreground">No BMAD artifacts found</p>
      )}
    </div>
  )
}

export const BmadArtifactChecklist = memo(BmadArtifactChecklistComponent)
