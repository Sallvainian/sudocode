/**
 * BmadDashboardPage - Main BMAD landing page
 * Shows phase tracker, artifact checklist, active agent, and next step advisory
 */

import { Loader2 } from 'lucide-react'
import { useBmadPipeline } from '@/hooks/useBmadPipeline'
import { useBmadPersonas } from '@/hooks/useBmadPersonas'
import { BmadPhaseTracker } from '@/components/bmad/BmadPhaseTracker'
import { BmadArtifactChecklist } from '@/components/bmad/BmadArtifactChecklist'
import { BmadActiveAgentPanel } from '@/components/bmad/BmadActiveAgentPanel'
import { BmadNextStepPanel } from '@/components/bmad/BmadNextStepPanel'
import { Badge } from '@/components/ui/badge'

export default function BmadDashboardPage() {
  const {
    installed,
    currentPhase,
    phases,
    artifacts,
    completionPercentage,
    nextArtifact,
    isLoading,
    error,
  } = useBmadPipeline()

  const { getPersonaForPhase, isLoading: personasLoading } = useBmadPersonas()

  // Active persona based on current phase
  const activePersona = currentPhase ? getPersonaForPhase(currentPhase) : undefined

  if (isLoading || personasLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive">Failed to load BMAD data</p>
          <p className="text-xs text-muted-foreground">{String(error)}</p>
        </div>
      </div>
    )
  }

  if (!installed) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <h2 className="mb-2 text-lg font-medium">BMAD Not Installed</h2>
        <p className="mb-4 max-w-md text-muted-foreground">
          This project does not have BMAD configured. Create a{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">_bmad/</code> directory with
          configuration to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">BMAD</h1>
          <Badge variant="secondary">
            {currentPhase ? currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1) : 'Setup'}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">{completionPercentage}% complete</div>
      </div>

      {/* Phase Tracker */}
      <div className="border-b px-4 py-4">
        <BmadPhaseTracker phases={phases} currentPhase={currentPhase} />
      </div>

      {/* Main content: sidebar + center panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: artifact checklist */}
        <div className="w-64 shrink-0 overflow-y-auto border-r p-4">
          <BmadArtifactChecklist artifacts={artifacts} />
        </div>

        {/* Center content: active agent + next step */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-6">
            <BmadActiveAgentPanel persona={activePersona} />
            <BmadNextStepPanel
              currentPhase={currentPhase}
              nextArtifact={nextArtifact}
              completionPercentage={completionPercentage}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
