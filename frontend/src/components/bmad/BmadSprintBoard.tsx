/**
 * BmadSprintBoard - Kanban board for BMAD sprint stories
 *
 * Columns: Backlog → Ready for Dev → In Progress → Review → Done
 * Reuses existing KanbanProvider/KanbanBoard/KanbanCard infrastructure.
 */

import { memo } from 'react'
import {
  type DragEndEvent,
  KanbanBoard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/ui/kanban'
import { BmadStoryCard } from './BmadStoryCard'
import type { Issue } from '@/types/api'
import type { Execution } from '@/types/execution'

// =============================================================================
// Types
// =============================================================================

export type BmadColumnId = 'backlog' | 'ready-for-dev' | 'in-progress' | 'review' | 'done'

export interface StoryMeta {
  epicId?: string
  personaName?: string
  personaColor?: string
}

export interface BmadSprintBoardProps {
  groupedStories: Record<BmadColumnId, Issue[]>
  onDragEnd: (event: DragEndEvent) => void
  onSelectStory: (issue: Issue) => void
  selectedStory?: Issue
  latestExecutions?: Record<string, Execution | null>
  storyMeta?: Record<string, StoryMeta>
  collapsedColumns?: Set<BmadColumnId>
  onToggleColumnCollapse?: (columnId: BmadColumnId) => void
}

// =============================================================================
// Constants
// =============================================================================

export const BMAD_COLUMN_ORDER: BmadColumnId[] = [
  'backlog',
  'ready-for-dev',
  'in-progress',
  'review',
  'done',
]

const COLUMN_LABELS: Record<BmadColumnId, string> = {
  'backlog': 'Backlog',
  'ready-for-dev': 'Ready for Dev',
  'in-progress': 'In Progress',
  'review': 'Review',
  'done': 'Done',
}

const COLUMN_COLORS: Record<BmadColumnId, string> = {
  'backlog': '--chart-5',
  'ready-for-dev': '--chart-3',
  'in-progress': '--chart-2',
  'review': '--chart-4',
  'done': '--chart-1',
}

// =============================================================================
// Component
// =============================================================================

function BmadSprintBoardInner({
  groupedStories,
  onDragEnd,
  onSelectStory,
  selectedStory,
  latestExecutions,
  storyMeta,
  collapsedColumns = new Set(),
  onToggleColumnCollapse,
}: BmadSprintBoardProps) {
  const renderDragOverlay = (activeId: string | null) => {
    if (!activeId) return null

    for (const [columnId, stories] of Object.entries(groupedStories)) {
      const story = stories.find((s) => s.id === activeId)
      if (story) {
        const index = stories.indexOf(story)
        const meta = storyMeta?.[story.id]
        return (
          <BmadStoryCard
            issue={story}
            index={index}
            columnId={columnId}
            isSelected={false}
            latestExecution={latestExecutions?.[story.id]}
            epicId={meta?.epicId}
            personaName={meta?.personaName}
            personaColor={meta?.personaColor}
          />
        )
      }
    }
    return null
  }

  return (
    <KanbanProvider
      onDragEnd={onDragEnd}
      renderDragOverlay={renderDragOverlay}
      collapsedColumns={collapsedColumns as Set<string>}
      totalColumns={BMAD_COLUMN_ORDER.length}
    >
      {BMAD_COLUMN_ORDER.map((columnId) => {
        const stories = groupedStories[columnId] || []
        const isCollapsed = collapsedColumns.has(columnId)

        return (
          <KanbanBoard key={columnId} id={columnId} collapsed={isCollapsed}>
            <KanbanHeader
              name={COLUMN_LABELS[columnId]}
              color={COLUMN_COLORS[columnId]}
              count={stories.length}
              collapsed={isCollapsed}
              onToggleCollapse={
                onToggleColumnCollapse ? () => onToggleColumnCollapse(columnId) : undefined
              }
            />
            <KanbanCards collapsed={isCollapsed}>
              {stories.map((story, index) => {
                const meta = storyMeta?.[story.id]
                return (
                  <BmadStoryCard
                    key={story.id}
                    issue={story}
                    index={index}
                    columnId={columnId}
                    isSelected={selectedStory?.id === story.id}
                    onClick={() => onSelectStory(story)}
                    latestExecution={latestExecutions?.[story.id]}
                    epicId={meta?.epicId}
                    personaName={meta?.personaName}
                    personaColor={meta?.personaColor}
                  />
                )
              })}
            </KanbanCards>
          </KanbanBoard>
        )
      })}
    </KanbanProvider>
  )
}

export const BmadSprintBoard = memo(BmadSprintBoardInner)
export default BmadSprintBoard
