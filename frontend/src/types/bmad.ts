/**
 * Frontend BMAD type definitions
 * Mirrors server API response shapes from server/src/routes/bmad.ts
 */

// =============================================================================
// BMAD Phases
// =============================================================================

export type BmadPhase = 'analysis' | 'planning' | 'solutioning' | 'implementation'

export const BMAD_PHASES: BmadPhase[] = ['analysis', 'planning', 'solutioning', 'implementation']

export const BMAD_PHASE_LABELS: Record<BmadPhase, string> = {
  analysis: 'Analysis',
  planning: 'Planning',
  solutioning: 'Solutioning',
  implementation: 'Implementation',
}

export const BMAD_PHASE_DESCRIPTIONS: Record<BmadPhase, string> = {
  analysis: 'Discovery, research, and requirements gathering',
  planning: 'PRD creation, architecture design',
  solutioning: 'UX design, epic/story breakdown',
  implementation: 'Sprint execution and development',
}

/**
 * Phase status for the stepper visualization
 */
export type BmadPhaseStatus = 'completed' | 'active' | 'upcoming'

export const BMAD_PHASE_STATUS_STYLES: Record<
  BmadPhaseStatus,
  { border: string; background: string; text: string; icon: string }
> = {
  completed: {
    border: 'border-green-500',
    background: 'bg-green-500/10',
    text: 'text-green-700 dark:text-green-300',
    icon: 'text-green-500',
  },
  active: {
    border: 'border-blue-500',
    background: 'bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-500',
  },
  upcoming: {
    border: 'border-muted',
    background: 'bg-muted/20',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground',
  },
}

// =============================================================================
// BMAD Artifacts
// =============================================================================

export interface BmadArtifactInfo {
  type: string
  filename: string
  exists: boolean
  filePath?: string
  size?: number
  modifiedAt?: string
}

/**
 * Artifact types mapped to their expected BMAD phase
 */
export const ARTIFACT_PHASE_MAP: Record<string, BmadPhase> = {
  'product-brief': 'analysis',
  'project-context': 'analysis',
  prd: 'planning',
  architecture: 'planning',
  'ux-spec': 'solutioning',
  epic: 'solutioning',
  story: 'implementation',
  'sprint-status': 'implementation',
}

// =============================================================================
// BMAD Agent Personas
// =============================================================================

export interface BmadAgentPersona {
  name: string
  displayName: string
  role: string
  capabilities: string[]
}

/**
 * Agent persona mapped to their primary phase
 */
export const AGENT_PHASE_MAP: Record<string, BmadPhase> = {
  analyst: 'analysis',
  pm: 'planning',
  architect: 'planning',
  'ux-designer': 'solutioning',
  sm: 'solutioning',
  dev: 'implementation',
  qa: 'implementation',
  'tech-writer': 'implementation',
  'quick-flow-solo-dev': 'implementation',
}

/**
 * Avatar colors for each agent persona
 */
export const AGENT_AVATAR_COLORS: Record<string, string> = {
  analyst: 'bg-purple-500',
  pm: 'bg-blue-500',
  architect: 'bg-indigo-500',
  'ux-designer': 'bg-pink-500',
  sm: 'bg-amber-500',
  dev: 'bg-green-500',
  qa: 'bg-orange-500',
  'tech-writer': 'bg-teal-500',
  'quick-flow-solo-dev': 'bg-cyan-500',
}

// =============================================================================
// BMAD Status API Response
// =============================================================================

export interface BmadStatusResponse {
  installed: boolean
  hasConfig: boolean
  hasOutput: boolean
  currentPhase: BmadPhase | null
  artifactSummary: {
    total: number
    existing: number
    types: string[]
  }
}

// =============================================================================
// BMAD Artifacts API Response
// =============================================================================

export interface BmadArtifactsResponse {
  artifacts: BmadArtifactInfo[]
  currentPhase: BmadPhase
}

// =============================================================================
// BMAD Agents API Response
// =============================================================================

export interface BmadAgentsResponse {
  agents: BmadAgentPersona[]
}

// =============================================================================
// Quality Gates
// =============================================================================

export type BmadGateResult = 'pass' | 'concerns' | 'fail'

export const BMAD_GATE_STYLES: Record<
  BmadGateResult,
  { border: string; background: string; text: string; icon: string }
> = {
  pass: {
    border: 'border-green-500',
    background: 'bg-green-500/10',
    text: 'text-green-700 dark:text-green-300',
    icon: 'text-green-500',
  },
  concerns: {
    border: 'border-yellow-500',
    background: 'bg-yellow-500/10',
    text: 'text-yellow-700 dark:text-yellow-300',
    icon: 'text-yellow-500',
  },
  fail: {
    border: 'border-red-500',
    background: 'bg-red-500/10',
    text: 'text-red-700 dark:text-red-300',
    icon: 'text-red-500',
  },
}

// =============================================================================
// Pipeline DAG Node Types
// =============================================================================

export type BmadNodeType = 'phase-group' | 'workflow' | 'gate'

export interface BmadPipelineStep {
  id: string
  name: string
  phase: BmadPhase
  type: BmadNodeType
  status: BmadPhaseStatus
  dependencies: string[]
  gateResult?: BmadGateResult
  artifactType?: string
  agentName?: string
}
