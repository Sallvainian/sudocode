/**
 * BmadPhaseGroupNode - Group node for phases in the BMAD pipeline DAG
 * Colored header bar with progress, used as a compound group node
 */

import { memo, useCallback, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BmadPhaseStatus } from '@/types/bmad'
import { BMAD_PHASE_STATUS_STYLES } from '@/types/bmad'

// =============================================================================
// Types
// =============================================================================

export interface BmadPhaseGroupNodeData {
  label: string
  phaseNumber: number
  status: BmadPhaseStatus
  description?: string
  stepCount: number
  completedSteps: number
  isSelected?: boolean
  onSelect?: (id: string) => void
  [key: string]: unknown
}

// =============================================================================
// Phase color mapping
// =============================================================================

const PHASE_HEADER_COLORS: Record<number, string> = {
  1: 'bg-purple-600 dark:bg-purple-700',
  2: 'bg-blue-600 dark:bg-blue-700',
  3: 'bg-amber-600 dark:bg-amber-700',
  4: 'bg-green-600 dark:bg-green-700',
}

// =============================================================================
// Component
// =============================================================================

function BmadPhaseGroupNodeComponent({ id, data }: NodeProps) {
  const {
    label,
    phaseNumber,
    status,
    description,
    stepCount,
    completedSteps,
    isSelected,
    onSelect,
  } = data as unknown as BmadPhaseGroupNodeData

  const [collapsed, setCollapsed] = useState(false)
  const styles = BMAD_PHASE_STATUS_STYLES[status]

  const handleClick = useCallback(() => {
    onSelect?.(id)
  }, [onSelect, id])

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setCollapsed((prev) => !prev)
    },
    []
  )

  const progress = stepCount > 0 ? Math.round((completedSteps / stepCount) * 100) : 0

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-background !rounded-full !bg-muted-foreground"
      />

      <div
        onClick={handleClick}
        className={cn(
          'rounded-lg border-2 shadow-sm overflow-hidden',
          'min-w-[240px] max-w-[300px]',
          'cursor-pointer select-none',
          styles.border,
          isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        )}
      >
        {/* Colored header bar */}
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2 text-white',
            PHASE_HEADER_COLORS[phaseNumber] ?? 'bg-gray-600'
          )}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              className="rounded p-0.5 hover:bg-white/20"
              aria-label={collapsed ? 'Expand phase' : 'Collapse phase'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <span className="text-sm font-semibold">{label}</span>
          </div>
          <span className="text-xs font-medium opacity-80">
            {completedSteps}/{stepCount}
          </span>
        </div>

        {/* Content area */}
        {!collapsed && (
          <div className={cn('bg-background px-3 py-2', styles.background)}>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}

            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  status === 'completed'
                    ? 'bg-green-500'
                    : status === 'active'
                      ? 'bg-blue-500'
                      : 'bg-muted-foreground/30'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-background !rounded-full !bg-muted-foreground"
      />
    </>
  )
}

export const BmadPhaseGroupNode = memo(BmadPhaseGroupNodeComponent)
