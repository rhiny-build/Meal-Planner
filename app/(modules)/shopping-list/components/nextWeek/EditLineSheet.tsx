'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Button from '@/components/Button'
import { AISLES } from '@/lib/nextWeek/aisles'
import type { ListLine } from '@/lib/nextWeek/buildList'
import { correctProduct } from '../../nextWeekActions'

interface EditLineSheetProps {
  line: ListLine
  onClose: () => void
  onSaved: () => void
}

/** Correct the item or aisle of the product on a line. Corrections stick. */
export default function EditLineSheet({ line, onClose, onSaved }: EditLineSheetProps) {
  const [itemName, setItemName] = useState(line.item ?? '')
  const [aisle, setAisle] = useState(line.aisle ?? 'Other')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await correctProduct({ productName: line.label, itemName, aisle })
      toast.success('Saved')
      onSaved()
    } catch {
      toast.error('Could not save')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" role="dialog" aria-label="Edit item">
      <div className="w-full max-w-sm bg-surface rounded-card p-4 flex flex-col gap-3">
        <p className="font-display text-lg font-bold">{line.label}</p>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Item
          <input
            value={itemName}
            onChange={e => setItemName(e.target.value)}
            className="min-h-11 px-3 rounded-card border border-line font-normal text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Aisle
          <select
            value={aisle}
            onChange={e => setAisle(e.target.value)}
            className="min-h-11 px-3 rounded-card border border-line font-normal text-base bg-surface"
          >
            {AISLES.map(a => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !itemName.trim()}>Save</Button>
        </div>
      </div>
    </div>
  )
}
