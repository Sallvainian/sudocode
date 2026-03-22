/**
 * BmadPipelineDAG - React Flow DAG visualization for the BMAD 4-phase pipeline
 *
 * Renders phase group nodes, workflow step nodes, and quality gate nodes
 * in a dagre-layouted directed acyclic graph.
 */

import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  MarkerType,
  Position,
} from '@xyflow/react'
import dagre from 'dagre'
import '@xyflow/react/dist/style.css'

import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import type {
  BmadPhase,
  BmadPhaseStatus,
  BmadGateResult,
  BmadPipelineStep,
} from '@/types/bmad'
import {
  BMAD_PHASES,
  BMAD_PHASE_LABELS,
  BMAD_PHASE_DESCRIPTIONS,
} from '@/types/bmad'
import { BmadPhaseGroupNode } from './BmadPhaseGroupNode'
import { BmadWorkflowNode } from './BmadWorkflowNode'
import { BmadGateNode } from './BmadGateNode'

// =============================================================================
// Types
// =============================================================================

export interface BmadPipelineDAGProps {
  /** Pipeline steps to render */
  steps: BmadPipelineStep[]
  /** Currently selected step ID */
  selectedStepId?: string
  /** Callback when a step is clicked */
  onStepSelect?: (stepId: string) => void
  /** Callback when pane is clicked (deselect) */
  onPaneClick?: () => void
  /** Show minimap */
  showMinimap?: boolean
  /** Show controls */
  showControls?: boolean
  /** Custom class name */
  className?: string
}

// Node dimensions by type
const NODE_DIMS: Record<string, { width: number; height: number }> = {
  bmadPhaseGroup: { width: 280, height: 100 },
  bmadWorkflow: { width: 200, height: 80 },
  bmadGate: { width: 100, height: 100 },
}

// =============================================================================
// Custom Node Types Registry
// =============================================================================

const nodeTypes = {
  bmadPhaseGroup: BmadPhaseGroupNode,
  bmadWorkflow: BmadWorkflowNode,
  bmadGate: BmadGateNode,
}

// =============================================================================
// Layout
// =============================================================================

function layoutElements(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'TB',
    nodesep: 60,
    ranksep: 80,
    marginx: 30,
    marginy: 30,
  })

  for (const node of nodes) {
    const dims = NODE_DIMS[node.type ?? 'bmadWorkflow'] ?? NODE_DIMS.bmadWorkflow
    g.setNode(node.id, { width: dims.width, height: dims.height })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const layouted = nodes.map((node) => {
    const pos = g.node(node.id)
    const dims = NODE_DIMS[node.type ?? 'bmadWorkflow'] ?? NODE_DIMS.bmadWorkflow
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: pos.x - dims.width / 2,
        y: pos.y - dims.height / 2,
      },
    }
  })

  return { nodes: layouted, edges }
}

// =============================================================================
// Build DAG elements from pipeline steps
// =============================================================================

function buildDAGElements(
  steps: BmadPipelineStep[],
  selectedStepId?: string,
  onStepSelect?: (id: string) => void
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  for (const step of steps) {
    const isSelected = step.id === selectedStepId

    if (step.type === 'phase-group') {
      const phaseSteps = steps.filter(
        (s) => s.phase === step.phase && s.type === 'workflow'
      )
      const completedSteps = phaseSteps.filter(
        (s) => s.status === 'completed'
      ).length
      const phaseNumber = BMAD_PHASES.indexOf(step.phase) + 1

      nodes.push({
        id: step.id,
        type: 'bmadPhaseGroup',
        position: { x: 0, y: 0 },
        data: {
          label: BMAD_PHASE_LABELS[step.phase] ?? step.name,
          phaseNumber,
          status: step.status,
          description: BMAD_PHASE_DESCRIPTIONS[step.phase],
          stepCount: phaseSteps.length,
          completedSteps,
          isSelected,
          onSelect: onStepSelect,
        },
      })
    } else if (step.type === 'gate') {
      nodes.push({
        id: step.id,
        type: 'bmadGate',
        position: { x: 0, y: 0 },
        data: {
          label: step.name,
          result: step.gateResult ?? null,
          isSelected,
          onSelect: onStepSelect,
        },
      })
    } else {
      nodes.push({
        id: step.id,
        type: 'bmadWorkflow',
        position: { x: 0, y: 0 },
        data: {
          label: step.name,
          status: step.status,
          agentName: step.agentName,
          artifactType: step.artifactType,
          isSelected,
          onSelect: onStepSelect,
        },
      })
    }

    // Create edges from dependencies
    for (const depId of step.dependencies) {
      const dep = steps.find((s) => s.id === depId)
      const isCompleted = dep?.status === 'completed'
      const isActive = step.status === 'active'

      edges.push({
        id: `${depId}-${step.id}`,
        source: depId,
        target: step.id,
        type: 'smoothstep',
        animated: isActive,
        style: {
          stroke: isCompleted ? '#22c55e' : '#94a3b8',
          strokeWidth: 2,
          opacity: isCompleted ? 0.6 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCompleted ? '#22c55e' : '#94a3b8',
        },
      })
    }
  }

  return { nodes, edges }
}

// =============================================================================
// Default pipeline steps builder
// =============================================================================

/**
 * Build default BMAD pipeline steps from current phase and existing artifacts.
 *
 * @param currentPhase - The currently active BMAD phase (or null)
 * @param existingArtifactTypes - Array of artifact type strings that already exist
 * @returns Pipeline steps with statuses derived from phase/artifact state
 */
export function buildDefaultPipelineSteps(
  currentPhase: BmadPhase | null,
  existingArtifactTypes: string[]
): BmadPipelineStep[] {
  const existing = new Set(existingArtifactTypes)

  function phaseStatus(phase: BmadPhase): BmadPhaseStatus {
    if (!currentPhase) return 'upcoming'
    const phaseIdx = BMAD_PHASES.indexOf(phase)
    const currentIdx = BMAD_PHASES.indexOf(currentPhase)
    if (phaseIdx < currentIdx) return 'completed'
    if (phaseIdx === currentIdx) return 'active'
    return 'upcoming'
  }

  function stepStatus(phase: BmadPhase, artifactType?: string): BmadPhaseStatus {
    if (artifactType && existing.has(artifactType)) return 'completed'
    const ps = phaseStatus(phase)
    if (ps === 'completed') return 'completed'
    return ps
  }

  function gateResult(phase: BmadPhase): BmadGateResult | undefined {
    const ps = phaseStatus(phase)
    if (ps === 'completed') return 'pass'
    return undefined
  }

  return [
    // Phase 1: Analysis
    { id: 'phase-1', name: 'Analysis', phase: 'analysis', type: 'phase-group', status: phaseStatus('analysis'), dependencies: [] },
    { id: 'brainstorming', name: 'Brainstorming', phase: 'analysis', type: 'workflow', status: stepStatus('analysis'), dependencies: ['phase-1'], agentName: 'analyst' },
    { id: 'research', name: 'Research', phase: 'analysis', type: 'workflow', status: stepStatus('analysis'), dependencies: ['brainstorming'], agentName: 'analyst' },
    { id: 'product-brief', name: 'Product Brief', phase: 'analysis', type: 'workflow', status: stepStatus('analysis', 'product-brief'), dependencies: ['research'], agentName: 'pm', artifactType: 'product-brief' },
    { id: 'gate-1', name: 'Discovery Gate', phase: 'analysis', type: 'gate', status: phaseStatus('analysis'), dependencies: ['product-brief'], gateResult: gateResult('analysis') },

    // Phase 2: Planning
    { id: 'phase-2', name: 'Planning', phase: 'planning', type: 'phase-group', status: phaseStatus('planning'), dependencies: ['gate-1'] },
    { id: 'prd', name: 'PRD', phase: 'planning', type: 'workflow', status: stepStatus('planning', 'prd'), dependencies: ['phase-2'], agentName: 'pm', artifactType: 'prd' },
    { id: 'architecture', name: 'Architecture', phase: 'planning', type: 'workflow', status: stepStatus('planning', 'architecture'), dependencies: ['prd'], agentName: 'architect', artifactType: 'architecture' },
    { id: 'gate-2', name: 'Planning Gate', phase: 'planning', type: 'gate', status: phaseStatus('planning'), dependencies: ['architecture'], gateResult: gateResult('planning') },

    // Phase 3: Solutioning
    { id: 'phase-3', name: 'Solutioning', phase: 'solutioning', type: 'phase-group', status: phaseStatus('solutioning'), dependencies: ['gate-2'] },
    { id: 'ux-spec', name: 'UX Design', phase: 'solutioning', type: 'workflow', status: stepStatus('solutioning', 'ux-spec'), dependencies: ['phase-3'], agentName: 'ux-designer', artifactType: 'ux-spec' },
    { id: 'epics', name: 'Epics & Stories', phase: 'solutioning', type: 'workflow', status: stepStatus('solutioning', 'epic'), dependencies: ['ux-spec'], agentName: 'sm' },
    { id: 'gate-3', name: 'Readiness Gate', phase: 'solutioning', type: 'gate', status: phaseStatus('solutioning'), dependencies: ['epics'], gateResult: gateResult('solutioning') },

    // Phase 4: Implementation
    { id: 'phase-4', name: 'Implementation', phase: 'implementation', type: 'phase-group', status: phaseStatus('implementation'), dependencies: ['gate-3'] },
    { id: 'sprint-planning', name: 'Sprint Planning', phase: 'implementation', type: 'workflow', status: stepStatus('implementation', 'sprint-status'), dependencies: ['phase-4'], agentName: 'sm' },
    { id: 'dev-cycle', name: 'Dev Cycle', phase: 'implementation', type: 'workflow', status: stepStatus('implementation'), dependencies: ['sprint-planning'], agentName: 'dev' },
    { id: 'code-review', name: 'Code Review', phase: 'implementation', type: 'workflow', status: stepStatus('implementation'), dependencies: ['dev-cycle'], agentName: 'dev' },
    { id: 'retrospective', name: 'Retrospective', phase: 'implementation', type: 'workflow', status: stepStatus('implementation'), dependencies: ['code-review'], agentName: 'sm' },
  ]
}

// =============================================================================
// Component
// =============================================================================

export function BmadPipelineDAG({
  steps,
  selectedStepId,
  onStepSelect,
  onPaneClick,
  showMinimap = true,
  showControls = true,
  className,
}: BmadPipelineDAGProps) {
  const { actualTheme } = useTheme()
  const isDark = actualTheme === 'dark'

  const initial = useMemo(() => {
    const { nodes: rawNodes, edges: rawEdges } = buildDAGElements(steps, selectedStepId, onStepSelect)
    return layoutElements(rawNodes, rawEdges)
  }, [steps, selectedStepId, onStepSelect])

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildDAGElements(
      steps,
      selectedStepId,
      onStepSelect
    )
    const laid = layoutElements(newNodes, newEdges)
    setNodes(laid.nodes)
    setEdges(laid.edges)
  }, [steps, selectedStepId, onStepSelect, setNodes, setEdges])

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onStepSelect?.(node.id)
    },
    [onStepSelect]
  )

  if (steps.length === 0) {
    return (
      <div
        className={cn(
          'flex h-full items-center justify-center text-muted-foreground',
          className
        )}
      >
        <p>No pipeline steps configured</p>
      </div>
    )
  }

  return (
    <div className={cn('h-full w-full', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        colorMode={actualTheme}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.4, maxZoom: 1.5 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={isDark ? '#334155' : '#e2e8f0'} gap={16} size={1} />
        {showControls && <Controls showInteractive={false} />}
        {showMinimap && (
          <MiniMap
            nodeColor={(node) => {
              const nodeData = node.data as Record<string, unknown> | undefined
              const status = nodeData?.status as BmadPhaseStatus | undefined
              const result = nodeData?.result as BmadGateResult | undefined

              if (result === 'pass') return '#22c55e'
              if (result === 'concerns') return '#eab308'
              if (result === 'fail') return '#ef4444'

              if (status === 'completed') return '#22c55e'
              if (status === 'active') return '#3b82f6'
              return '#94a3b8'
            }}
            maskColor={isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.1)'}
            className="rounded-lg border bg-background"
          />
        )}
      </ReactFlow>
    </div>
  )
}

export default BmadPipelineDAG
