/**
 * BmadStoryCard - Kanban card for a BMAD story
 *
 * Displays story title, persona badge, execution status, and epic color bar.
 * Used inside BmadSprintBoard kanban columns.
 */

import { memo } from 'react'
import { KanbanCard } from '@/components/ui/kanban'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Loader2, CheckCircle2, XCircle, Circle } from 'lucide-react'
import type { Issue } from '@/types/api'
import type { Execution } from '@/types/execution'
import { getColorFromId } from '@/utils/colors'

// =============================================================================
// Types
// =============================================================================

export type BmadStoryStatus = 'backlog' | 'ready-for-dev' | 'in-progress' | 'review' | 'done'

export interface BmadStoryCardProps {
  issue: Issue
  index: number
  columnId: string
  isSelected?: boolean
  onClick?: () => void
  latestExecution?: Execution | null
  /** Epic ID for color bar (e.g., "bme-1") */
  epicId?: string
  /** Persona name to display as badge */
  personaName?: string
  personaColor?: string
}

// =============================================================================
// Helpers
// =============================================================================

function getExecutionStatusIcon(status: string) {
  switch (status) {
    case 'running':
    case 'preparing':
    case 'pending':
      return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
    case 'completed':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />
    case 'failed':
      return <XCircle className="h-3 w-3 text-red-500" />
    case 'paused':
      return <Circle className="h-3 w-3 text-yellow-500" />
    default:
      return null
  }
}

// =============================================================================
// Component
// =============================================================================

function BmadStoryCardInner({
  issue,
  index,
  columnId,
  isSelected,
  onClick,
  latestExecution,
  epicId,
  personaName,
  personaColor,
}: BmadStoryCardProps) {
  const epicColor = epicId ? getColorFromId(epicId) : undefined

  return (
    <KanbanCard
      id={issue.id}
      name={issue.title}
      index={index}
      parent={columnId}
      isOpen={isSelected}
      onClick={onClick}
      className="relative overflow-hidden"
    >
      {/* Epic color bar (left edge) */}
      {epicColor && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
          style={{ backgroundColor: epicColor }}
        />
      )}

      <div className="pl-2">
        {/* Story ID */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono">{issue.id}</span>
          {latestExecution && (
            <span className="flex items-center gap-1">
              {getExecutionStatusIcon(latestExecution.status)}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="mt-1 text-sm font-medium leading-snug">{issue.title}</p>

        {/* Footer: persona badge + epic label */}
        <div className="mt-2 flex items-center gap-1.5">
          {personaName && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 font-normal border-0',
                personaColor ?? 'bg-gray-500/10'
              )}
            >
              {personaName}
            </Badge>
          )}
          {epicId && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              {epicId}
            </Badge>
          )}
        </div>
      </div>
    </KanbanCard>
  )
}

export const BmadStoryCard = memo(BmadStoryCardInner)
export default BmadStoryCard
