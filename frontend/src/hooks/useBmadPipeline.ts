/**
 * useBmadPipeline - Hook for fetching BMAD status, artifacts, and computed phase data
 * Aggregates /api/bmad/status and /api/bmad/artifacts into a unified BMAD view
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  BmadPhase,
  BmadPhaseStatus,
  BmadStatusResponse,
  BmadArtifactsResponse,
  BmadArtifactInfo,
} from '@/types/bmad'
import { BMAD_PHASES, ARTIFACT_PHASE_MAP } from '@/types/bmad'
import { useProject } from '@/hooks/useProject'

// API helpers (using the same axios instance pattern as the rest of the app)
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// =============================================================================
// Query Keys
// =============================================================================

export const bmadKeys = {
  all: ['bmad'] as const,
  status: () => [...bmadKeys.all, 'status'] as const,
  artifacts: () => [...bmadKeys.all, 'artifacts'] as const,
  agents: () => [...bmadKeys.all, 'agents'] as const,
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchBmadStatus(projectId: string): Promise<BmadStatusResponse> {
  const response = await api.get('/bmad/status', {
    headers: { 'X-Project-ID': projectId },
  })
  return response.data?.data ?? response.data
}

async function fetchBmadArtifacts(projectId: string): Promise<BmadArtifactsResponse> {
  const response = await api.get('/bmad/artifacts', {
    headers: { 'X-Project-ID': projectId },
  })
  return response.data?.data ?? response.data
}

// =============================================================================
// Computed Types
// =============================================================================

export interface PhaseInfo {
  phase: BmadPhase
  status: BmadPhaseStatus
  artifacts: BmadArtifactInfo[]
  completedArtifacts: number
  totalArtifacts: number
}

export interface BmadPipelineData {
  /** Whether BMAD is installed in the project */
  installed: boolean
  /** Current active phase */
  currentPhase: BmadPhase | null
  /** Phase info for the 4-phase stepper */
  phases: PhaseInfo[]
  /** All artifacts with existence info */
  artifacts: BmadArtifactInfo[]
  /** Artifacts that exist */
  existingArtifacts: BmadArtifactInfo[]
  /** Overall completion percentage */
  completionPercentage: number
  /** Recommended next artifact to create */
  nextArtifact: string | null
}

// =============================================================================
// Hook
// =============================================================================

export function useBmadPipeline() {
  const { currentProjectId } = useProject()

  const statusQuery = useQuery({
    queryKey: [...bmadKeys.status(), currentProjectId],
    queryFn: () => fetchBmadStatus(currentProjectId!),
    enabled: !!currentProjectId,
    staleTime: 30_000,
  })

  const artifactsQuery = useQuery({
    queryKey: [...bmadKeys.artifacts(), currentProjectId],
    queryFn: () => fetchBmadArtifacts(currentProjectId!),
    enabled: !!currentProjectId,
    staleTime: 30_000,
  })

  const pipeline: BmadPipelineData = useMemo(() => {
    const status = statusQuery.data
    const artifactsData = artifactsQuery.data
    const artifacts = artifactsData?.artifacts ?? []
    const currentPhase = status?.currentPhase ?? artifactsData?.currentPhase ?? null

    // Group artifacts by phase
    const phaseArtifacts: Record<BmadPhase, BmadArtifactInfo[]> = {
      analysis: [],
      planning: [],
      solutioning: [],
      implementation: [],
    }

    for (const artifact of artifacts) {
      const phase = ARTIFACT_PHASE_MAP[artifact.type]
      if (phase) {
        phaseArtifacts[phase].push(artifact)
      }
    }

    // Compute phase statuses
    const currentPhaseIndex = currentPhase ? BMAD_PHASES.indexOf(currentPhase) : -1

    const phases: PhaseInfo[] = BMAD_PHASES.map((phase, index) => {
      const phaseArts = phaseArtifacts[phase]
      const completed = phaseArts.filter((a) => a.exists).length

      let phaseStatus: BmadPhaseStatus
      if (index < currentPhaseIndex) {
        phaseStatus = 'completed'
      } else if (index === currentPhaseIndex) {
        phaseStatus = 'active'
      } else {
        phaseStatus = 'upcoming'
      }

      return {
        phase,
        status: phaseStatus,
        artifacts: phaseArts,
        completedArtifacts: completed,
        totalArtifacts: phaseArts.length,
      }
    })

    const existingArtifacts = artifacts.filter((a) => a.exists)
    // Use planning artifacts (not epics/stories which are variable count) for completion
    const planningArtifactTypes = new Set([
      'prd',
      'architecture',
      'ux-spec',
      'product-brief',
      'project-context',
    ])
    const planningArtifacts = artifacts.filter((a: BmadArtifactInfo) => planningArtifactTypes.has(a.type))
    const completedPlanning = planningArtifacts.filter((a: BmadArtifactInfo) => a.exists).length
    const completionPercentage =
      planningArtifacts.length > 0
        ? Math.round((completedPlanning / planningArtifacts.length) * 100)
        : 0

    // Find next missing artifact in order
    const artifactOrder = ['product-brief', 'project-context', 'prd', 'architecture', 'ux-spec']
    const nextArtifact =
      artifactOrder.find((type: string) => {
        const art = artifacts.find((a: BmadArtifactInfo) => a.type === type)
        return !art || !art.exists
      }) ?? null

    return {
      installed: status?.installed ?? false,
      currentPhase,
      phases,
      artifacts,
      existingArtifacts,
      completionPercentage,
      nextArtifact,
    }
  }, [statusQuery.data, artifactsQuery.data])

  return {
    ...pipeline,
    isLoading: statusQuery.isLoading || artifactsQuery.isLoading,
    error: statusQuery.error || artifactsQuery.error,
    refetch: () => {
      statusQuery.refetch()
      artifactsQuery.refetch()
    },
  }
}
