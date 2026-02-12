'use client'

/**
 * Editable List Item
 *
 * Shared row component with view/edit modes for settings lists.
 * Used by MasterListsTab, DishTypesTab, and CategoriesTab.
 */

import type { ReactNode } from 'react'

interface EditableListItemProps {
  id: string
  isEditing: boolean
  editValue: string
  isPending: boolean
  onEditValueChange: (value: string) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  deleteDisabled?: boolean
  deleteTitle?: string
  /** Content to display in view mode (name, subtitle, badges, etc.) */
  children: ReactNode
}

export default function EditableListItem({
  id,
  isEditing,
  editValue,
  isPending,
  onEditValueChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  deleteDisabled = false,
  deleteTitle = 'Delete',
  children,
}: EditableListItemProps) {
  return (
    <li
      key={id}
      className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      {isEditing ? (
        <>
          <input
            type="text"
            value={editValue}
            onChange={e => onEditValueChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onSaveEdit()
              if (e.key === 'Escape') onCancelEdit()
            }}
            className="flex-1 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600"
            autoFocus
          />
          <button
            onClick={onSaveEdit}
            disabled={isPending}
            className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
            title="Save"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={onCancelEdit}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Cancel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      ) : (
        <>
          {children}
          <button
            onClick={onStartEdit}
            disabled={isPending}
            className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50"
            title="Edit"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            disabled={isPending || deleteDisabled}
            className={`p-1 disabled:opacity-50 ${
              deleteDisabled
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-red-600'
            }`}
            title={deleteTitle}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </>
      )}
    </li>
  )
}
