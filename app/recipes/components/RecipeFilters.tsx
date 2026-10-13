/**
 * RecipeFilters Component
 *
 * Filter dropdowns for the recipe library, tucked behind one "Filters" line so
 * the recipes come first. The line says how many filters are on.
 */

import type { RecipeFilters as RecipeFiltersType } from '@/types'
import type { DishTypeOption } from '@/lib/dishTypeConfig'

interface RecipeFiltersProps {
  filters: RecipeFiltersType
  onFilterChange: (filterName: keyof RecipeFiltersType, value: string) => void
  proteinOptions: DishTypeOption[]
  carbOptions: DishTypeOption[]
}

const selectClass = 'w-full min-h-11 px-3 bg-surface border border-line rounded-card'

export default function RecipeFilters({ filters, onFilterChange, proteinOptions, carbOptions }: RecipeFiltersProps) {
  const activeCount = Object.values(filters).filter((value) => value !== undefined && value !== 'all').length

  return (
    <details className="bg-surface rounded-2xl mb-4 group">
      <summary className="min-h-12 px-4 flex items-center justify-between cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
        <span>Filters{activeCount > 0 ? ` · ${activeCount} on` : ''}</span>
        <span aria-hidden="true" className="text-ink-soft group-open:rotate-180 transition-transform">
          &#9662;
        </span>
      </summary>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 pt-1">
        {/* Tier Filter */}
        <div>
          <label className="block text-sm font-semibold text-ink-soft mb-1">Tier</label>
          <select
            value={filters.tier || 'all'}
            onChange={e => onFilterChange('tier', e.target.value)}
            className={selectClass}
          >
            <option value="all">All</option>
            <option value="favorite">Favorite</option>
            <option value="non-regular">Non-Regular</option>
            <option value="new">New</option>
          </select>
        </div>

        {/* Kind Filter */}
        <div>
          <label htmlFor="filter-kind" className="block text-sm font-semibold text-ink-soft mb-1">Type</label>
          <select
            id="filter-kind"
            value={filters.kind || 'all'}
            onChange={e => onFilterChange('kind', e.target.value)}
            className={selectClass}
          >
            <option value="all">All</option>
            <option value="full">Full recipes</option>
            <option value="quick">Quick</option>
          </select>
        </div>

        {/* Protein Filter */}
        <div>
          <label className="block text-sm font-semibold text-ink-soft mb-1">Protein</label>
          <select
            value={filters.proteinType || 'all'}
            onChange={e => onFilterChange('proteinType', e.target.value)}
            className={selectClass}
          >
            {proteinOptions.map(opt => (
              <option key={opt.value || 'all'} value={opt.value || 'all'}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Carb Filter */}
        <div>
          <label className="block text-sm font-semibold text-ink-soft mb-1">Carb</label>
          <select
            value={filters.carbType || 'all'}
            onChange={e => onFilterChange('carbType', e.target.value)}
            className={selectClass}
          >
            {carbOptions.map(opt => (
              <option key={opt.value || 'all'} value={opt.value || 'all'}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Prep Time Filter */}
        <div>
          <label className="block text-sm font-semibold text-ink-soft mb-1">Prep Time</label>
          <select
            value={filters.prepTime || 'all'}
            onChange={e => onFilterChange('prepTime', e.target.value)}
            className={selectClass}
          >
            <option value="all">All</option>
            <option value="quick">Quick</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>

        {/* Lunch Filter */}
        <div>
          <label className="block text-sm font-semibold text-ink-soft mb-1">Lunch</label>
          <select
            value={filters.isLunchAppropriate === undefined ? 'all' : filters.isLunchAppropriate ? 'true' : 'false'}
            onChange={e => onFilterChange('isLunchAppropriate', e.target.value)}
            className={selectClass}
          >
            <option value="all">All</option>
            <option value="true">Lunch Only</option>
            <option value="false">Not for Lunch</option>
          </select>
        </div>
      </div>
    </details>
  )
}
