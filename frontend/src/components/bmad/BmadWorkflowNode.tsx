/**
 * BmadWorkflowNode - Individual workflow step node for the BMAD pipeline DAG
 * Displays step name, agent, and status with styling from WorkflowStepNode patterns
 */

import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BmadPhaseStatus } from '@/types/bmad'
import { BMAD_PHASE_STATUS_STYLES, AGENT_AVATAR_COLORS } from '@/types/bmad'

// =============================================================================
// Types
// =============================================================================

export interface BmadWorkflowNodeData {
  label: string
  status: BmadPhaseStatus
  agentName?: string
  agentDisplayName?: string
  artifactType?: string
  isSelected?: boolean
  onSelect?: (id: string) => void
  [key: string]: unknown
}

// =============================================================================
// Component
// =============================================================================

function BmadWorkflowNodeComponent({ id, data }: NodeProps) {
  const {
    label,
    status,
    agentName,
    agentDisplayName,
    artifactType,
    isSelected,
    onSelect,
  } = data as unknown as BmadWorkflowNodeData

  const styles = BMAD_PHASE_STATUS_STYLES[status]

  const handleClick = useCallback(() => {
    onSelect?.(id)
  }, [onSelect, id])

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          '!h-2 !w-2 !border-2 !border-background !rounded-full',
          status === 'completed' ? '!bg-green-500' : '!bg-muted-foreground'
        )}
      />

      <div
        onClick={handleClick}
        className={cn(
          'rounded-lg border-2 bg-background p-3 shadow-sm',
          'min-w-[180px] max-w-[220px]',
          'cursor-pointer select-none',
          'hover:bg-muted/50',
          styles.border,
          styles.background,
          isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        )}
      >
        {/* Status + label */}
        <div className="flex items-center gap-2">
          {status === 'completed' && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />}
          {status === 'active' && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />
          )}
          {status === 'upcoming' && (
            <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className={cn('text-sm font-medium leading-tight', styles.text)}>{label}</span>
        </div>

        {/* Agent badge */}
        {agentName && (
          <div className="mt-2 flex items-center gap-1.5">
            <div
              className={cn(
                'h-4 w-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center',
                AGENT_AVATAR_COLORS[agentName] ?? 'bg-gray-500'
              )}
            >
              {(agentDisplayName ?? agentName).charAt(0)}
            </div>
            <span className="text-xs text-muted-foreground">
              {agentDisplayName ?? agentName}
            </span>
          </div>
        )}

        {/* Artifact type */}
        {artifactType && (
          <div className="mt-1">
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {artifactType}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          '!h-2 !w-2 !border-2 !border-background !rounded-full',
          status === 'completed' ? '!bg-green-500' : '!bg-muted-foreground'
        )}
      />
    </>
  )
}

export const BmadWorkflowNode = memo(BmadWorkflowNodeComponent)
