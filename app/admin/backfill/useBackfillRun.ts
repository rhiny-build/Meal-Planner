'use client'

/**
 * State and loops for the admin backfill page: the dry run and the apply, each one recipe per request.
 * The report lives in this page (and a browser copy, so a closed tab can carry on). No database tables.
 * Rows already done stay done: every request finishes on its own, and apply only fills empty fields.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { BackfillRecipeRef } from '@/lib/agents/recipeBackfill/adminSteps'
import type { ReportEntry } from '@/lib/agents/recipeBackfill/types'
import { fetchBackfillRecipes, requestEntryApply, requestRecipePlan } from './backfillApi'
import { isTickedByDefault, listRowsToApply, type RowApplyState } from './backfillSelection'

export type Phase = 'idle' | 'planning' | 'applying'
export type RunTotals = { runs: number; inputTokens: number; outputTokens: number; costUsd: number }
type Progress = { done: number; total: number }
type SavedReport = { recipes: BackfillRecipeRef[]; entries: Record<string, ReportEntry>; totals: RunTotals }

const STORAGE_KEY = 'backfill-report-v1'
const NO_TOTALS: RunTotals = { runs: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }

function loadSavedReport(): SavedReport | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedReport) : null
  } catch {
    return null
  }
}

function saveReport(report: SavedReport | null) {
  try {
    if (report) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(report))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked; the page works without it.
  }
}

export function useBackfillRun() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [recipes, setRecipes] = useState<BackfillRecipeRef[]>([])
  const [entries, setEntries] = useState<Record<string, ReportEntry>>({})
  const [failures, setFailures] = useState<Record<string, string>>({})
  const [ticked, setTicked] = useState<Record<string, boolean>>({})
  const [applied, setApplied] = useState<Record<string, RowApplyState>>({})
  const [totals, setTotals] = useState<RunTotals>(NO_TOTALS)
  const [progress, setProgress] = useState<Progress>({ done: 0, total: 0 })
  const [fatalError, setFatalError] = useState<string | null>(null)
  const shouldStop = useRef(false)

  useEffect(() => {
    const saved = loadSavedReport()
    if (!saved) return
    setRecipes(saved.recipes)
    setEntries(saved.entries)
    setTotals(saved.totals)
    setTicked(Object.fromEntries(Object.values(saved.entries).map((entry) => [entry.recipeId, isTickedByDefault(entry)])))
  }, [])

  const runDryRun = useCallback(async () => {
    setPhase('planning')
    setFatalError(null)
    shouldStop.current = false
    try {
      const list = recipes.length ? recipes : await fetchBackfillRecipes()
      setRecipes(list)
      let nextEntries = { ...entries }
      let nextTotals = { ...totals }
      const remaining = list.filter((recipe) => !nextEntries[recipe.id])
      setProgress({ done: list.length - remaining.length, total: list.length })

      for (const recipe of remaining) {
        if (shouldStop.current) break
        try {
          const result = await requestRecipePlan(recipe.id)
          nextEntries = { ...nextEntries, [recipe.id]: result.entry }
          nextTotals = {
            runs: nextTotals.runs + (result.usage.inputTokens + result.usage.outputTokens > 0 ? 1 : 0),
            inputTokens: nextTotals.inputTokens + result.usage.inputTokens + result.usage.cacheCreationTokens + result.usage.cacheReadTokens,
            outputTokens: nextTotals.outputTokens + result.usage.outputTokens,
            costUsd: nextTotals.costUsd + (result.estimatedCostUsd ?? 0),
          }
          setEntries(nextEntries)
          setTotals(nextTotals)
          setTicked((current) => ({ ...current, [recipe.id]: isTickedByDefault(result.entry) }))
          setFailures((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== recipe.id)))
          saveReport({ recipes: list, entries: nextEntries, totals: nextTotals })
        } catch (error) {
          setFailures((current) => ({ ...current, [recipe.id]: error instanceof Error ? error.message : String(error) }))
        }
        setProgress((current) => ({ ...current, done: current.done + 1 }))
      }
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : String(error))
    } finally {
      setPhase('idle')
    }
  }, [recipes, entries, totals])

  const runApply = useCallback(async () => {
    const rows = listRowsToApply(recipes.flatMap((recipe) => entries[recipe.id] ?? []), ticked, applied)
    setPhase('applying')
    setFatalError(null)
    shouldStop.current = false
    setProgress({ done: 0, total: rows.length })
    for (const entry of rows) {
      if (shouldStop.current) break
      try {
        const outcome = await requestEntryApply(entry)
        setApplied((current) => ({ ...current, [entry.recipeId]: outcome }))
      } catch (error) {
        setApplied((current) => ({ ...current, [entry.recipeId]: { status: 'failed', detail: error instanceof Error ? error.message : String(error) } }))
      }
      setProgress((current) => ({ ...current, done: current.done + 1 }))
    }
    setPhase('idle')
  }, [recipes, entries, ticked, applied])

  const toggleTick = (recipeId: string) => setTicked((current) => ({ ...current, [recipeId]: !current[recipeId] }))
  const stop = () => {
    shouldStop.current = true
  }
  const startOver = () => {
    saveReport(null)
    setRecipes([])
    setEntries({})
    setFailures({})
    setTicked({})
    setApplied({})
    setTotals(NO_TOTALS)
    setProgress({ done: 0, total: 0 })
  }

  return { phase, recipes, entries, failures, ticked, applied, totals, progress, fatalError, runDryRun, runApply, toggleTick, stop, startOver }
}
