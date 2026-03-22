/**
 * BmadStoryCycleRing - SVG 3-node ring showing story lifecycle
 *
 * Displays: Create → Dev → Review cycle as a circular diagram
 * with the active step highlighted.
 */

import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export type CycleStep = 'create' | 'dev' | 'review'

export interface BmadStoryCycleRingProps {
  activeStep: CycleStep
  size?: number
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const STEPS: { key: CycleStep; label: string; angle: number }[] = [
  { key: 'create', label: 'Create', angle: -90 },   // top
  { key: 'dev', label: 'Dev', angle: 30 },           // bottom-right
  { key: 'review', label: 'Review', angle: 150 },    // bottom-left
]

const NODE_RADIUS = 14
const RING_RADIUS_FACTOR = 0.32

// =============================================================================
// Component
// =============================================================================

export function BmadStoryCycleRing({
  activeStep,
  size = 120,
  className,
}: BmadStoryCycleRingProps) {
  const center = size / 2
  const ringRadius = size * RING_RADIUS_FACTOR

  // Calculate node positions
  const nodes = STEPS.map((step) => {
    const rad = (step.angle * Math.PI) / 180
    return {
      ...step,
      x: center + ringRadius * Math.cos(rad),
      y: center + ringRadius * Math.sin(rad),
    }
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('select-none', className)}
    >
      {/* Arrow lines between nodes */}
      {nodes.map((node, i) => {
        const next = nodes[(i + 1) % nodes.length]
        const isActive = node.key === activeStep

        // Shorten line to avoid overlap with circles
        const dx = next.x - node.x
        const dy = next.y - node.y
        const len = Math.sqrt(dx * dx + dy * dy)
        const ux = dx / len
        const uy = dy / len
        const startX = node.x + ux * (NODE_RADIUS + 2)
        const startY = node.y + uy * (NODE_RADIUS + 2)
        const endX = next.x - ux * (NODE_RADIUS + 4)
        const endY = next.y - uy * (NODE_RADIUS + 4)

        return (
          <line
            key={`line-${node.key}`}
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'}
            strokeWidth={isActive ? 2 : 1.5}
            markerEnd={`url(#arrow-${isActive ? 'active' : 'inactive'})`}
          />
        )
      })}

      {/* Arrow markers */}
      <defs>
        <marker
          id="arrow-active"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M 0 0 L 6 3 L 0 6 Z" fill="hsl(var(--primary))" />
        </marker>
        <marker
          id="arrow-inactive"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M 0 0 L 6 3 L 0 6 Z" fill="hsl(var(--muted-foreground) / 0.3)" />
        </marker>
      </defs>

      {/* Nodes */}
      {nodes.map((node) => {
        const isActive = node.key === activeStep
        return (
          <g key={node.key}>
            <circle
              cx={node.x}
              cy={node.y}
              r={NODE_RADIUS}
              fill={isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
              stroke={isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
              strokeWidth={1.5}
            />
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(
                'text-[9px] font-medium pointer-events-none',
                isActive ? 'fill-primary-foreground' : 'fill-muted-foreground'
              )}
            >
              {node.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default BmadStoryCycleRing
