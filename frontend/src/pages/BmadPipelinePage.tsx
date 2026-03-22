/**
 * BmadPipelinePage - BMAD Pipeline DAG visualization page
 * Shows the 4-phase pipeline as an interactive directed acyclic graph
 */

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useBmadPipeline } from '@/hooks/useBmadPipeline'
import { BmadPipelineDAG, buildDefaultPipelineSteps } from '@/components/bmad/BmadPipelineDAG'
import { Badge } from '@/components/ui/badge'

export default function BmadPipelinePage() {
  const { currentPhase, artifacts, isLoading, error } = useBmadPipeline()
  const [selectedStepId, setSelectedStepId] = useState<string | undefined>()

  if (isLoading) {
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
          <p className="text-sm text-destructive">Failed to load pipeline data</p>
          <p className="text-xs text-muted-foreground">{String(error)}</p>
        </div>
      </div>
    )
  }

  // Build pipeline steps from artifact state
  const artifactTypes = artifacts.filter((a) => a.exists).map((a) => a.type)
  const steps = buildDefaultPipelineSteps(currentPhase, artifactTypes)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">BMAD Pipeline</h1>
          <Badge variant="secondary">
            {currentPhase ? currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1) : 'Setup'}
          </Badge>
        </div>
        {selectedStepId && (
          <span className="text-sm text-muted-foreground">Selected: {selectedStepId}</span>
        )}
      </div>

      {/* DAG */}
      <div className="flex-1">
        <BmadPipelineDAG
          steps={steps}
          selectedStepId={selectedStepId}
          onStepSelect={setSelectedStepId}
          onPaneClick={() => setSelectedStepId(undefined)}
        />
      </div>
    </div>
  )
}
