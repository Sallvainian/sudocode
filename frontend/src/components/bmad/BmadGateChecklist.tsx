/**
 * BmadGateChecklist - Expandable quality gate checklist
 * Uses Radix Collapsible for expand/collapse with check items.
 */

import { memo, useState } from 'react'
import { ChevronRight, Check, X, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

// =============================================================================
// Types
// =============================================================================

export type GateCheckStatus = 'pass' | 'fail' | 'skipped'

export interface GateCheckItem {
  id: string
  label: string
  status: GateCheckStatus
  detail?: string
}

export interface GateCheckGroup {
  id: string
  label: string
  items: GateCheckItem[]
}

export interface BmadGateChecklistProps {
  groups: GateCheckGroup[]
  className?: string
}

// =============================================================================
// Helpers
// =============================================================================

const CHECK_ICONS: Record<GateCheckStatus, typeof Check> = {
  pass: Check,
  fail: X,
  skipped: Minus,
}

const CHECK_COLORS: Record<GateCheckStatus, string> = {
  pass: 'text-green-500',
  fail: 'text-red-500',
  skipped: 'text-muted-foreground',
}

const CHECK_BG: Record<GateCheckStatus, string> = {
  pass: 'bg-green-500/10',
  fail: 'bg-red-500/10',
  skipped: 'bg-muted/50',
}

// =============================================================================
// Component
// =============================================================================

function BmadGateChecklistComponent({ groups, className }: BmadGateChecklistProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className={cn('space-y-2', className)}>
      {groups.map((group) => {
        const passCount = group.items.filter((i) => i.status === 'pass').length
        const isOpen = openGroups.has(group.id)

        return (
          <Collapsible key={group.id} open={isOpen} onOpenChange={() => toggleGroup(group.id)}>
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-accent/50">
                <ChevronRight
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    isOpen && 'rotate-90'
                  )}
                />
                <span className="flex-1 text-sm font-medium">{group.label}</span>
                <span className="text-xs text-muted-foreground">
                  {passCount}/{group.items.length}
                </span>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="ml-6 mt-1 space-y-1">
                {group.items.map((item) => {
                  const Icon = CHECK_ICONS[item.status]

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-start gap-2 rounded-md px-3 py-1.5',
                        CHECK_BG[item.status]
                      )}
                    >
                      <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', CHECK_COLORS[item.status])} />
                      <div className="min-w-0">
                        <span className="text-xs">{item.label}</span>
                        {item.detail && (
                          <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
}

export const BmadGateChecklist = memo(BmadGateChecklistComponent)
