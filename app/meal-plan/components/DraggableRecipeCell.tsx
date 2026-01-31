/**
 * DraggableRecipeCell Component
 *
 * A cell in the meal plan grid that can be dragged to swap recipes between days.
 * Uses @dnd-kit for drag and drop functionality.
 *
 * Tooltip: Uses Radix UI Tooltip to show full recipe name on hover.
 * Radix attaches directly to the DOM and works around react-select's
 * internal event handling that breaks native title attributes.
 *
 * === HOW DND-KIT WORKS ===
 *
 * dnd-kit is built around a few key concepts:
 *
 * 1. DndContext - The parent component that manages all drag state. It tracks:
 *    - Which item is being dragged (active)
 *    - Which droppable zone it's over (over)
 *    - Provides callbacks for drag events (onDragStart, onDragEnd, etc.)
 *
 * 2. useDraggable - Hook that makes an element draggable. Returns:
 *    - attributes: ARIA attributes for accessibility
 *    - listeners: Event handlers (onPointerDown, etc.) to attach to the drag handle
 *    - setNodeRef: Ref to attach to the draggable element
 *    - transform: Current drag position offset { x, y }
 *    - isDragging: Boolean indicating if this item is being dragged
 *
 * 3. useDroppable - Hook that makes an element a drop target. Returns:
 *    - setNodeRef: Ref to attach to the droppable element
 *    - isOver: Boolean indicating if a draggable is currently over this target
 *
 * 4. Sensors - Define how drags are initiated (pointer, keyboard, touch).
 *    We use PointerSensor with an activation constraint (distance: 8) to
 *    distinguish between clicks and drags.
 *
 * === DATA FLOW ===
 *
 * Each cell has a unique ID: `${column}-${dayIndex}` (e.g., "protein-0" for Monday's protein)
 *
 * When a drag ends:
 * 1. DndContext fires onDragEnd with { active, over }
 * 2. We parse the IDs to get column and dayIndex for both cells
 * 3. If they're in the same column, we call handleSwapRecipes to swap values
 *
 * === WHY SEPARATE DRAGGABLE AND DROPPABLE? ===
 *
 * Each cell is BOTH draggable (you can pick it up) AND droppable (you can drop onto it).
 * This allows swapping: you drag cell A and drop it on cell B, they swap values.
 */

'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import * as Tooltip from '@radix-ui/react-tooltip'

interface DraggableRecipeCellProps {
  /** Unique identifier for this cell: `${column}-${dayIndex}` */
  id: string
  /** The recipe name to display, or empty string if no recipe selected */
  recipeName: string
  /** Whether this cell is currently being dragged over by another cell */
  isOver?: boolean
  /** The SearchableSelect component to render inside the cell */
  children: React.ReactNode
}

export default function DraggableRecipeCell({
  id,
  recipeName,
  children,
}: DraggableRecipeCellProps) {
  /**
   * useDraggable hook - makes this cell draggable
   *
   * - id: Unique identifier passed to onDragEnd as active.id
   * - attributes: ARIA attributes for screen readers
   * - listeners: Pointer/touch event handlers for initiating drag
   * - setNodeRef: Callback ref to attach to the DOM element
   * - transform: Current drag offset { x, y, scaleX, scaleY }
   * - isDragging: True while this specific element is being dragged
   */
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    // Data payload available in onDragEnd event
    data: {
      recipeName,
    },
  })

  /**
   * useDroppable hook - makes this cell a valid drop target
   *
   * - id: Same ID as draggable (a cell can be both)
   * - setNodeRef: Ref for the droppable area (same element as draggable)
   * - isOver: True when another draggable is hovering over this cell
   */
  const {
    setNodeRef: setDroppableRef,
    isOver,
  } = useDroppable({
    id,
  })

  /**
   * Combine refs - the same DOM element needs both refs
   *
   * We use a callback ref that calls both setNodeRef functions.
   * This allows the element to be both draggable AND a drop target.
   */
  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node)
    setDroppableRef(node)
  }

  /**
   * Transform style - moves the element while dragging
   *
   * CSS.Transform.toString converts { x, y, scaleX, scaleY } to a CSS transform string.
   * This creates the visual effect of the element following the cursor.
   */
  const style = {
    transform: CSS.Transform.toString(transform),
    // Lift the dragging element above others
    zIndex: isDragging ? 50 : undefined,
    // Visual feedback while dragging
    opacity: isDragging ? 0.8 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative
        transition-colors
        ${isOver ? 'ring-2 ring-blue-500 dark:ring-fuchsia-500 ring-offset-2 dark:ring-offset-neutral-900 rounded' : ''}
        ${isDragging ? 'cursor-grabbing' : ''}
      `}
    >
      {/*
        Drag handle - the area you can grab to start dragging

        We put listeners on a separate handle element so the SearchableSelect
        dropdown still works normally. If we put listeners on the whole cell,
        clicking the dropdown would start a drag instead.

        The handle is positioned at the left edge of the cell.
      */}
      <div
        {...listeners}
        {...attributes}
        className={`
          absolute left-0 top-0 bottom-0 w-6
          flex items-center justify-center
          cursor-grab active:cursor-grabbing
          text-gray-400 dark:text-neutral-600
          hover:text-gray-600 dark:hover:text-neutral-400
          transition-colors
          ${isDragging ? 'cursor-grabbing' : ''}
        `}
        title="Drag to swap with another day"
      >
        {/* Drag handle icon (6 dots pattern) */}
        <svg
          width="12"
          height="16"
          viewBox="0 0 12 16"
          fill="currentColor"
          className="pointer-events-none"
        >
          <circle cx="3" cy="2" r="1.5" />
          <circle cx="9" cy="2" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="14" r="1.5" />
          <circle cx="9" cy="14" r="1.5" />
        </svg>
      </div>

      {/*
        Content area - offset to make room for drag handle
        Contains the SearchableSelect dropdown wrapped in a tooltip
      */}
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className="pl-6">
              {children}
            </div>
          </Tooltip.Trigger>
          {recipeName && (
            <Tooltip.Portal>
              <Tooltip.Content
                className="z-50 px-3 py-2 text-sm bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded shadow-lg max-w-xs"
                sideOffset={5}
              >
                {recipeName}
                <Tooltip.Arrow className="fill-neutral-900 dark:fill-neutral-100" />
              </Tooltip.Content>
            </Tooltip.Portal>
          )}
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  )
}
