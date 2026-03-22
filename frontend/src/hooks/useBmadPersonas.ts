/**
 * useBmadPersonas - Hook for BMAD agent persona data
 * Fetches from /api/bmad/agents and enriches with phase/color metadata
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { BmadAgentPersona, BmadAgentsResponse, BmadPhase } from '@/types/bmad'
import { AGENT_PHASE_MAP, AGENT_AVATAR_COLORS } from '@/types/bmad'
import { bmadKeys } from '@/hooks/useBmadPipeline'
import { useProject } from '@/hooks/useProject'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// =============================================================================
// Types
// =============================================================================

export interface EnrichedPersona extends BmadAgentPersona {
  phase: BmadPhase
  avatarColor: string
  initials: string
}

// =============================================================================
// API
// =============================================================================

async function fetchBmadAgents(projectId: string): Promise<BmadAgentsResponse> {
  const response = await api.get('/bmad/agents', {
    headers: { 'X-Project-ID': projectId },
  })
  return response.data?.data ?? response.data
}

// =============================================================================
// Hook
// =============================================================================

export function useBmadPersonas() {
  const { currentProjectId } = useProject()

  const query = useQuery({
    queryKey: [...bmadKeys.agents(), currentProjectId],
    queryFn: () => fetchBmadAgents(currentProjectId!),
    enabled: !!currentProjectId,
    staleTime: 300_000, // 5 min — personas are static
  })

  const personas: EnrichedPersona[] = useMemo(() => {
    const agents = query.data?.agents ?? []
    return agents.map((agent: BmadAgentPersona) => ({
      ...agent,
      phase: AGENT_PHASE_MAP[agent.name] ?? 'implementation',
      avatarColor: AGENT_AVATAR_COLORS[agent.name] ?? 'bg-gray-500',
      initials: agent.displayName
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    }))
  }, [query.data])

  /**
   * Get the recommended persona for a given phase
   */
  const getPersonaForPhase = (phase: BmadPhase): EnrichedPersona | undefined => {
    return personas.find((p) => p.phase === phase)
  }

  return {
    personas,
    getPersonaForPhase,
    isLoading: query.isLoading,
    error: query.error,
  }
}
