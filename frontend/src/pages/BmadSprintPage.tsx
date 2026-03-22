/**
 * BmadSprintPage - Sprint board for BMAD story execution
 *
 * Kanban-style board showing stories by BMAD status columns.
 * Stories are issues imported from BMAD with epic/persona metadata.
 * Drag-and-drop updates issue status and syncs to sprint-status.yaml.
 */

import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIssues, useUpdateIssueStatus } from '@/hooks/useIssues'
import { useQuery } from '@tanstack/react-query'
import { useProjectRoutes } from '@/hooks/useProjectRoutes'
import { executionsApi } from '@/lib/api'
import { useProject } from '@/hooks/useProject'
import type { Issue, IssueStatus } from '@/types/api'
import type { DragEndEvent } from '@/components/ui/kanban'
import { BmadSprintBoard, BMAD_COLUMN_ORDER } from '@/components/bmad/BmadSprintBoard'
import type { BmadColumnId, StoryMeta } from '@/components/bmad/BmadSprintBoard'
import { BmadStoryDetailPanel } from '@/components/bmad/BmadStoryDetailPanel'
import { BmadEpicFilter } from '@/components/bmad/BmadEpicFilter'
import type { EpicInfo } from '@/components/bmad/BmadEpicFilter'
import { Badge } from '@/components/ui/badge'
import { LayoutList } from 'lucide-react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'

// =============================================================================
// Status Mapping: sudocode Issue status → BMAD sprint column
// =============================================================================

/** Map sudocode IssueStatus to BMAD column ID */
function issueStatusToColumn(status: IssueStatus): BmadColumnId {
  switch (status) {
    case 'open':
      return 'ready-for-dev'
    case 'in_progress':
      return 'in-progress'
    case 'needs_review':
      return 'review'
    case 'closed':
      return 'done'
    case 'blocked':
      return 'backlog'
    default:
      return 'backlog'
  }
}

/** Map BMAD column ID back to IssueStatus for drag-and-drop */
function columnToIssueStatus(columnId: BmadColumnId): IssueStatus {
  switch (columnId) {
    case 'backlog':
      return 'blocked'
    case 'ready-for-dev':
      return 'open'
    case 'in-progress':
      return 'in_progress'
    case 'review':
      return 'needs_review'
    case 'done':
      return 'closed'
    default:
      return 'open'
  }
}

/** Derive story cycle step from issue status */
function getCycleStep(status: IssueStatus): 'create' | 'dev' | 'review' {
  switch (status) {
    case 'in_progress':
      return 'dev'
    case 'needs_review':
      return 'review'
    default:
      return 'create'
  }
}

// =============================================================================
// Helpers: Extract epic info from BMAD-imported issues
// =============================================================================

/**
 * Extract epic ID from an issue's metadata.
 * BMAD issues store their epic parent in the `parent` field.
 */
function getEpicId(issue: Issue): string | undefined {
  return issue.parent_id || undefined
}

// =============================================================================
// Page Component
// =============================================================================

export default function BmadSprintPage() {
  const navigate = useNavigate()
  const { paths } = useProjectRoutes()
  const { currentProjectId } = useProject()
  const { issues, isLoading, isError, error } = useIssues()
  const updateStatus = useUpdateIssueStatus()

  // Selection state
  const [selectedStory, setSelectedStory] = useState<Issue | undefined>()

  // Epic filter state
  const [selectedEpicIds, setSelectedEpicIds] = useState<Set<string>>(new Set())

  // Collapsed columns
  const [collapsedColumns, setCollapsedColumns] = useState<Set<BmadColumnId>>(() => {
    try {
      const saved = localStorage.getItem('bmadSprint.collapsedColumns')
      if (saved) return new Set(JSON.parse(saved))
    } catch { /* ignore */ }
    return new Set()
  })

  // Fetch recent executions for status display
  const since24h = useMemo(() => {
    const date = new Date()
    date.setHours(date.getHours() - 24)
    return date.toISOString()
  }, [])

  const { data: recentExecutionsData } = useQuery({
    queryKey: ['executions', currentProjectId, 'bmad-recent', since24h],
    queryFn: () =>
      executionsApi.listAll({
        since: since24h,
        includeRunning: true,
        limit: 500,
        sortBy: 'created_at',
        order: 'desc',
      }),
    enabled: !!currentProjectId,
    staleTime: 30000,
  })

  // Map executions by issue ID (latest per issue)
  const latestExecutions = useMemo(() => {
    if (!recentExecutionsData?.executions) return undefined
    const byIssueId: Record<string, any> = {}
    for (const execution of recentExecutionsData.executions) {
      if (execution.issue_id && !byIssueId[execution.issue_id]) {
        byIssueId[execution.issue_id] = execution
      }
    }
    return byIssueId
  }, [recentExecutionsData?.executions])

  // Extract epics from issues (parent issues that have children)
  const { epics, storyMeta, epicMap } = useMemo(() => {
    const epicMapLocal = new Map<string, { title: string; childCount: number }>()
    const metaLocal: Record<string, StoryMeta> = {}

    // First pass: find all parent issues (epics) and build metadata
    const parentIds = new Set<string>()
    for (const issue of issues) {
      const epicId = getEpicId(issue)
      if (epicId) {
        parentIds.add(epicId)
        metaLocal[issue.id] = { epicId }
      }
    }

    // Second pass: count children per epic and get epic titles
    for (const issue of issues) {
      if (parentIds.has(issue.id)) {
        epicMapLocal.set(issue.id, { title: issue.title, childCount: 0 })
      }
    }

    for (const issue of issues) {
      const epicId = getEpicId(issue)
      if (epicId && epicMapLocal.has(epicId)) {
        const epic = epicMapLocal.get(epicId)!
        epic.childCount++
      }
    }

    const epicsLocal: EpicInfo[] = Array.from(epicMapLocal.entries()).map(
      ([id, { title, childCount }]) => ({
        id,
        title,
        storyCount: childCount,
      })
    )

    return { epics: epicsLocal, storyMeta: metaLocal, epicMap: epicMapLocal }
  }, [issues])

  // Filter and group stories into BMAD columns
  const groupedStories = useMemo(() => {
    const groups: Record<BmadColumnId, Issue[]> = {
      'backlog': [],
      'ready-for-dev': [],
      'in-progress': [],
      'review': [],
      'done': [],
    }

    // Only show child issues (stories), not parent issues (epics)
    const stories = issues.filter((issue) => {
      // Skip epic-level issues (those that have children pointing to them)
      if (epicMap.has(issue.id)) return false

      // Apply epic filter
      if (selectedEpicIds.size > 0) {
        const epicId = getEpicId(issue)
        if (!epicId || !selectedEpicIds.has(epicId)) return false
      }

      return true
    })

    for (const story of stories) {
      const columnId = issueStatusToColumn(story.status as IssueStatus)
      groups[columnId].push(story)
    }

    return groups
  }, [issues, selectedEpicIds, epicMap])

  // Total story count
  const totalStories = useMemo(
    () => BMAD_COLUMN_ORDER.reduce((sum, col) => sum + (groupedStories[col]?.length || 0), 0),
    [groupedStories]
  )

  // Handle drag-and-drop
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || !active.data.current) return

      const draggedId = active.id as string
      const newColumnId = over.id as BmadColumnId
      const newStatus = columnToIssueStatus(newColumnId)
      const issue = issues.find((i) => i.id === draggedId)

      if (!issue || issue.status === newStatus) return

      updateStatus.mutate({ id: draggedId, status: newStatus })
    },
    [issues, updateStatus]
  )

  const handleSelectStory = useCallback((issue: Issue) => {
    setSelectedStory(issue)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedStory(undefined)
  }, [])

  const handleToggleEpic = useCallback((epicId: string) => {
    setSelectedEpicIds((prev) => {
      const next = new Set(prev)
      if (next.has(epicId)) {
        next.delete(epicId)
      } else {
        next.add(epicId)
      }
      return next
    })
  }, [])

  const handleClearFilter = useCallback(() => {
    setSelectedEpicIds(new Set())
  }, [])

  const handleToggleColumnCollapse = useCallback((columnId: BmadColumnId) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      try {
        localStorage.setItem('bmadSprint.collapsedColumns', JSON.stringify(Array.from(next)))
      } catch { /* ignore */ }
      return next
    })
  }, [])

  const handleViewIssue = useCallback(() => {
    if (selectedStory) {
      navigate(paths.issue(selectedStory.id))
    }
  }, [selectedStory, navigate, paths])

  const handleViewExecution = useCallback(() => {
    if (selectedStory && latestExecutions?.[selectedStory.id]) {
      navigate(paths.execution(latestExecutions[selectedStory.id].id))
    }
  }, [selectedStory, latestExecutions, navigate, paths])

  // Loading / error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading sprint board...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">
          Error loading stories: {error?.message || 'Unknown error'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background p-4">
        <div className="flex items-center gap-3">
          <LayoutList className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Sprint Board</h1>
          <Badge variant="secondary">{totalStories} stories</Badge>
        </div>
      </div>

      {/* Epic filter bar */}
      <BmadEpicFilter
        epics={epics}
        selectedEpicIds={selectedEpicIds}
        onToggleEpic={handleToggleEpic}
        onClearFilter={handleClearFilter}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {selectedStory ? (
          <PanelGroup
            direction="horizontal"
            className="h-full min-h-0"
            onLayout={(layout) => {
              if (layout.length === 2) {
                try {
                  localStorage.setItem('bmadSprint.panelSizes', JSON.stringify(layout))
                } catch { /* ignore */ }
              }
            }}
          >
            {/* Kanban Board Panel */}
            <Panel
              id="bmad-kanban"
              order={1}
              defaultSize={(() => {
                try {
                  const saved = localStorage.getItem('bmadSprint.panelSizes')
                  if (saved) {
                    const parsed = JSON.parse(saved)
                    if (Array.isArray(parsed) && parsed.length === 2) return parsed[0]
                  }
                } catch { /* ignore */ }
                return 66
              })()}
              minSize={30}
              className="min-h-0 min-w-0 overflow-auto"
            >
              <BmadSprintBoard
                groupedStories={groupedStories}
                onDragEnd={handleDragEnd}
                onSelectStory={handleSelectStory}
                selectedStory={selectedStory}
                latestExecutions={latestExecutions}
                storyMeta={storyMeta}
                collapsedColumns={collapsedColumns}
                onToggleColumnCollapse={handleToggleColumnCollapse}
              />
            </Panel>

            {/* Resize Handle */}
            <PanelResizeHandle className="group relative z-30 w-1 cursor-col-resize touch-none bg-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background">
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full border border-border bg-muted/90 px-1.5 py-3 opacity-70 shadow-sm transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
              </div>
            </PanelResizeHandle>

            {/* Story Detail Panel */}
            <Panel
              id="bmad-details"
              order={2}
              defaultSize={(() => {
                try {
                  const saved = localStorage.getItem('bmadSprint.panelSizes')
                  if (saved) {
                    const parsed = JSON.parse(saved)
                    if (Array.isArray(parsed) && parsed.length === 2) return parsed[1]
                  }
                } catch { /* ignore */ }
                return 34
              })()}
              minSize={20}
              className="min-h-0 min-w-0 overflow-hidden border-l bg-background shadow-lg"
            >
              <BmadStoryDetailPanel
                issue={selectedStory}
                onClose={handleClosePanel}
                onViewIssue={handleViewIssue}
                onViewExecution={handleViewExecution}
                latestExecution={latestExecutions?.[selectedStory.id]}
                epicId={storyMeta[selectedStory.id]?.epicId}
                epicTitle={
                  storyMeta[selectedStory.id]?.epicId
                    ? epicMap.get(storyMeta[selectedStory.id].epicId!)?.title
                    : undefined
                }
                cycleStep={getCycleStep(selectedStory.status as IssueStatus)}
              />
            </Panel>
          </PanelGroup>
        ) : (
          <div className="flex-1 overflow-auto">
            <BmadSprintBoard
              groupedStories={groupedStories}
              onDragEnd={handleDragEnd}
              onSelectStory={handleSelectStory}
              selectedStory={selectedStory}
              latestExecutions={latestExecutions}
              storyMeta={storyMeta}
              collapsedColumns={collapsedColumns}
              onToggleColumnCollapse={handleToggleColumnCollapse}
            />
          </div>
        )}
      </div>
    </div>
  )
}
