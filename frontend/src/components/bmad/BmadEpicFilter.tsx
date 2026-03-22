/**
 * BmadEpicFilter - Epic filter/grouping bar above the sprint board
 *
 * Shows a horizontal row of epic badges that can be toggled to filter
 * the kanban board by epic.
 */

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getColorFromId } from '@/utils/colors'
import { Filter, X } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface EpicInfo {
  id: string
  title: string
  storyCount: number
}

export interface BmadEpicFilterProps {
  epics: EpicInfo[]
  selectedEpicIds: Set<string>
  onToggleEpic: (epicId: string) => void
  onClearFilter: () => void
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function BmadEpicFilter({
  epics,
  selectedEpicIds,
  onToggleEpic,
  onClearFilter,
  className,
}: BmadEpicFilterProps) {
  const hasFilter = selectedEpicIds.size > 0

  if (epics.length === 0) return null

  return (
    <div className={cn('flex items-center gap-2 px-4 py-2 border-b bg-muted/30', className)}>
      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground shrink-0">Epics:</span>

      <div className="flex flex-wrap items-center gap-1.5">
        {epics.map((epic) => {
          const isSelected = selectedEpicIds.has(epic.id)
          const color = getColorFromId(epic.id)

          return (
            <button
              key={epic.id}
              onClick={() => onToggleEpic(epic.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                'hover:bg-accent',
                isSelected
                  ? 'bg-accent ring-1 ring-ring font-medium'
                  : 'bg-background border border-border'
              )}
            >
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="truncate max-w-[120px]">{epic.title}</span>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[18px]">
                {epic.storyCount}
              </Badge>
            </button>
          )
        })}
      </div>

      {hasFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilter}
          className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground ml-auto"
        >
          <X className="h-3 w-3 mr-0.5" />
          Clear
        </Button>
      )}
    </div>
  )
}

export default BmadEpicFilter
