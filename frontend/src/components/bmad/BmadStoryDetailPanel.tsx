/**
 * BmadStoryDetailPanel - Right-side panel showing story details
 *
 * Displays acceptance criteria, tasks, story cycle ring, and actions.
 * Pattern follows WorkflowStepPanel.
 */

import { X, CheckCircle2, Circle, ExternalLink, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { getColorFromId } from '@/utils/colors'
import type { Issue } from '@/types/api'
import type { Execution } from '@/types/execution'
import BmadStoryCycleRing from './BmadStoryCycleRing'

// =============================================================================
// Types
// =============================================================================

export interface AcceptanceCriterion {
  id: string
  given: string
  when: string
  then: string
}

export interface StoryTask {
  id: string
  title: string
  completed: boolean
}

export interface BmadStoryDetailPanelProps {
  issue: Issue
  onClose?: () => void
  onViewIssue?: () => void
  onViewExecution?: () => void
  latestExecution?: Execution | null
  epicId?: string
  epicTitle?: string
  acceptanceCriteria?: AcceptanceCriterion[]
  tasks?: StoryTask[]
  /** Current story cycle step: 'create' | 'dev' | 'review' */
  cycleStep?: 'create' | 'dev' | 'review'
  className?: string
}

// =============================================================================
// Subcomponents
// =============================================================================

function Section({ title, children, className }: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export function BmadStoryDetailPanel({
  issue,
  onClose,
  onViewIssue,
  onViewExecution,
  latestExecution,
  epicId,
  epicTitle,
  acceptanceCriteria = [],
  tasks = [],
  cycleStep = 'create',
  className,
}: BmadStoryDetailPanelProps) {
  const epicColor = epicId ? getColorFromId(epicId) : undefined
  const completedTasks = tasks.filter((t) => t.completed).length

  return (
    <div className={cn('flex h-full flex-col bg-background border-l', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 border-b">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="font-mono font-medium">{issue.id}</span>
            {epicId && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {epicColor && (
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: epicColor }}
                    />
                  )}
                  {epicTitle || epicId}
                </span>
              </>
            )}
          </div>
          <h3 className="font-semibold text-lg leading-tight">{issue.title}</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Status badge */}
          <Section title="Status">
            <Badge
              variant="outline"
              className={cn(
                'text-sm',
                issue.status === 'closed' && 'border-green-500 text-green-600 dark:text-green-400',
                issue.status === 'in_progress' && 'border-blue-500 text-blue-600 dark:text-blue-400',
                issue.status === 'needs_review' && 'border-yellow-500 text-yellow-600 dark:text-yellow-400',
              )}
            >
              {issue.status.replace('_', ' ')}
            </Badge>
          </Section>

          {/* Story Cycle Ring */}
          <Section title="Story Cycle">
            <div className="flex justify-center py-2">
              <BmadStoryCycleRing activeStep={cycleStep} size={120} />
            </div>
          </Section>

          {/* Description */}
          {issue.content && (
            <Section title="Description">
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {issue.content.length > 500
                  ? issue.content.slice(0, 500) + '...'
                  : issue.content}
              </div>
            </Section>
          )}

          {/* Acceptance Criteria */}
          {acceptanceCriteria.length > 0 && (
            <Section title={`Acceptance Criteria (${acceptanceCriteria.length})`}>
              <div className="space-y-3">
                {acceptanceCriteria.map((ac) => (
                  <div
                    key={ac.id}
                    className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1"
                  >
                    <div>
                      <span className="font-medium text-muted-foreground">Given </span>
                      {ac.given}
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">When </span>
                      {ac.when}
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Then </span>
                      {ac.then}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <Section title={`Tasks (${completedTasks}/${tasks.length})`}>
              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    {task.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={cn(
                        task.completed && 'line-through text-muted-foreground'
                      )}
                    >
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Execution Link */}
          {latestExecution && onViewExecution && (
            <Section title="Latest Execution">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onViewExecution}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Execution
                <span className="ml-auto text-xs text-muted-foreground font-mono">
                  {latestExecution.id.slice(0, 8)}...
                </span>
              </Button>
            </Section>
          )}

          {/* View Full Issue */}
          {onViewIssue && (
            <Section title="Issue">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onViewIssue}
              >
                View Full Issue
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            </Section>
          )}
        </div>
      </ScrollArea>

      {/* Task progress footer */}
      {tasks.length > 0 && (
        <>
          <Separator />
          <div className="p-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${(completedTasks / tasks.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {completedTasks}/{tasks.length}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default BmadStoryDetailPanel
