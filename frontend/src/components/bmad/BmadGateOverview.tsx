/**
 * BmadGateOverview - Quality gate status indicator
 * Shows PASS/CONCERNS/FAIL result with a progress bar of checked items.
 */

import { memo } from 'react'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BmadGateResult } from '@/types/bmad'
import { BMAD_GATE_STYLES } from '@/types/bmad'

// =============================================================================
// Types
// =============================================================================

export interface BmadGateOverviewProps {
  result: BmadGateResult
  label: string
  checkedCount: number
  totalCount: number
  className?: string
}

// =============================================================================
// Helpers
// =============================================================================

const GATE_ICONS: Record<BmadGateResult, typeof CheckCircle2> = {
  pass: CheckCircle2,
  concerns: AlertTriangle,
  fail: XCircle,
}

const GATE_LABELS: Record<BmadGateResult, string> = {
  pass: 'PASS',
  concerns: 'CONCERNS',
  fail: 'FAIL',
}

const PROGRESS_COLORS: Record<BmadGateResult, string> = {
  pass: 'bg-green-500',
  concerns: 'bg-yellow-500',
  fail: 'bg-red-500',
}

// =============================================================================
// Component
// =============================================================================

function BmadGateOverviewComponent({
  result,
  label,
  checkedCount,
  totalCount,
  className,
}: BmadGateOverviewProps) {
  const styles = BMAD_GATE_STYLES[result]
  const Icon = GATE_ICONS[result]
  const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  return (
    <div className={cn('rounded-lg border-2 p-4', styles.border, styles.background, className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', styles.icon)} />
          <span className={cn('text-sm font-semibold', styles.text)}>{label}</span>
        </div>
        <span className={cn('text-xs font-bold', styles.text)}>{GATE_LABELS[result]}</span>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {checkedCount}/{totalCount} checks
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', PROGRESS_COLORS[result])}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export const BmadGateOverview = memo(BmadGateOverviewComponent)
