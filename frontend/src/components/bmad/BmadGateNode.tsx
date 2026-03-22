/**
 * BmadGateNode - Quality gate node for the BMAD pipeline DAG
 * Diamond shape with three-state coloring: PASS / CONCERNS / FAIL
 */

import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BmadGateResult } from '@/types/bmad'
import { BMAD_GATE_STYLES } from '@/types/bmad'

// =============================================================================
// Types
// =============================================================================

export interface BmadGateNodeData {
  label: string
  result: BmadGateResult | null
  isSelected?: boolean
  onSelect?: (id: string) => void
  [key: string]: unknown
}

// =============================================================================
// Gate Icon
// =============================================================================

function GateIcon({ result, className }: { result: BmadGateResult | null; className?: string }) {
  const iconClass = cn('h-5 w-5', className)

  switch (result) {
    case 'pass':
      return <ShieldCheck className={cn(iconClass, 'text-green-500')} />
    case 'concerns':
      return <ShieldAlert className={cn(iconClass, 'text-yellow-500')} />
    case 'fail':
      return <ShieldX className={cn(iconClass, 'text-red-500')} />
    default:
      return <Shield className={cn(iconClass, 'text-muted-foreground')} />
  }
}

// =============================================================================
// Component
// =============================================================================

function BmadGateNodeComponent({ id, data }: NodeProps) {
  const { label, result, isSelected, onSelect } = data as unknown as BmadGateNodeData
  const styles = result ? BMAD_GATE_STYLES[result] : null

  const handleClick = useCallback(() => {
    onSelect?.(id)
  }, [onSelect, id])

  const resultLabel = result ? result.toUpperCase() : 'PENDING'

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-2 !border-background !rounded-full !bg-muted-foreground"
      />

      {/* Diamond-shaped container via rotated square */}
      <div
        onClick={handleClick}
        className={cn(
          'cursor-pointer select-none',
          isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-md'
        )}
      >
        <div
          className={cn(
            'rotate-45 rounded-sm border-2 p-1 shadow-sm',
            styles?.border ?? 'border-muted',
            styles?.background ?? 'bg-muted/20'
          )}
        >
          <div className="-rotate-45 flex flex-col items-center justify-center px-3 py-2">
            <GateIcon result={result} />
            <span
              className={cn(
                'mt-1 text-[10px] font-bold uppercase tracking-wider',
                styles?.text ?? 'text-muted-foreground'
              )}
            >
              {resultLabel}
            </span>
          </div>
        </div>
        {/* Label below the diamond */}
        <div className="mt-1 text-center">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-2 !border-background !rounded-full !bg-muted-foreground"
      />
    </>
  )
}

export const BmadGateNode = memo(BmadGateNodeComponent)
