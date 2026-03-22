/**
 * BmadNextStepPanel - Advisory panel showing the next recommended workflow/action
 * Similar to bmad-help — suggests what to do next based on artifact state
 */

import { memo } from 'react'
import { ArrowRight, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BmadPhase } from '@/types/bmad'
import { BMAD_PHASE_LABELS } from '@/types/bmad'
import { Button } from '@/components/ui/button'

// =============================================================================
// Types
// =============================================================================

export interface BmadNextStepPanelProps {
  currentPhase: BmadPhase | null
  nextArtifact: string | null
  completionPercentage: number
  className?: string
}

// =============================================================================
// Next Step Recommendations
// =============================================================================

interface NextStepRecommendation {
  title: string
  description: string
  skill: string
  agent: string
}

const ARTIFACT_RECOMMENDATIONS: Record<string, NextStepRecommendation> = {
  'product-brief': {
    title: 'Create Product Brief',
    description: 'Start with a product brief to capture the vision, target users, and key goals.',
    skill: 'bmad-product-brief',
    agent: 'Mary (Analyst)',
  },
  'project-context': {
    title: 'Generate Project Context',
    description: 'Document the project for AI context — structure, conventions, and rules.',
    skill: 'bmad-generate-project-context',
    agent: 'Paige (Tech Writer)',
  },
  prd: {
    title: 'Create PRD',
    description: 'Define detailed product requirements, features, and acceptance criteria.',
    skill: 'bmad-create-prd',
    agent: 'John (PM)',
  },
  architecture: {
    title: 'Create Architecture',
    description: 'Design the system architecture, technology choices, and integration patterns.',
    skill: 'bmad-create-architecture',
    agent: 'Winston (Architect)',
  },
  'ux-spec': {
    title: 'Create UX Design',
    description: 'Plan UX patterns, user flows, and interface specifications.',
    skill: 'bmad-create-ux-design',
    agent: 'Sally (UX Designer)',
  },
}

const PHASE_NEXT_STEPS: Record<BmadPhase, NextStepRecommendation> = {
  analysis: {
    title: 'Continue Analysis',
    description: 'Complete discovery and requirements gathering before moving to planning.',
    skill: 'bmad-help',
    agent: 'Mary (Analyst)',
  },
  planning: {
    title: 'Continue Planning',
    description: 'Finish PRD and architecture before moving to solutioning.',
    skill: 'bmad-help',
    agent: 'John (PM)',
  },
  solutioning: {
    title: 'Create Epics & Stories',
    description: 'Break down requirements into epics and user stories for implementation.',
    skill: 'bmad-create-epics-and-stories',
    agent: 'Bob (Scrum Master)',
  },
  implementation: {
    title: 'Start Sprint Planning',
    description: 'Plan sprints and begin story implementation.',
    skill: 'bmad-sprint-planning',
    agent: 'Bob (Scrum Master)',
  },
}

// =============================================================================
// Component
// =============================================================================

function BmadNextStepPanelComponent({
  currentPhase,
  nextArtifact,
  completionPercentage,
  className,
}: BmadNextStepPanelProps) {
  // Determine recommendation
  const recommendation = nextArtifact
    ? ARTIFACT_RECOMMENDATIONS[nextArtifact]
    : currentPhase
      ? PHASE_NEXT_STEPS[currentPhase]
      : null

  if (!recommendation) {
    return (
      <div className={cn('rounded-lg border bg-card p-4', className)}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Next Step</h3>
        <p className="text-sm text-muted-foreground">
          Initialize BMAD to get started with AI-driven development.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Next Step</h3>
        {currentPhase && (
          <span className="ml-auto text-xs text-muted-foreground">
            {BMAD_PHASE_LABELS[currentPhase]} phase
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <h4 className="text-sm font-medium">{recommendation.title}</h4>
          <p className="text-xs text-muted-foreground">{recommendation.description}</p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Agent: {recommendation.agent}</span>
          <span>Skill: {recommendation.skill}</span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall Progress</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full">
          <ArrowRight className="mr-2 h-3 w-3" />
          Run {recommendation.title}
        </Button>
      </div>
    </div>
  )
}

export const BmadNextStepPanel = memo(BmadNextStepPanelComponent)
