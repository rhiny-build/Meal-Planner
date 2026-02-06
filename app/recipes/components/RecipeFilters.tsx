/**
 * RecipeFilters Component
 *
 * Filter dropdowns for the recipe library
 */

import type { RecipeFilters as RecipeFiltersType } from '@/types'
import type { DishTypeOption } from '@/lib/dishTypeConfig'

interface RecipeFiltersProps {
  filters: RecipeFiltersType
  onFilterChange: (filterName: keyof RecipeFiltersType, value: string) => void
  proteinOptions: DishTypeOption[]
  carbOptions: DishTypeOption[]
}

export default function RecipeFilters({ filters, onFilterChange, proteinOptions, carbOptions }: RecipeFiltersProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-semibold mb-3">Filters</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Tier Filter */}
        <div>
          <label className="block text-sm font-medium mb-1">Tier</label>
          <select
            value={filters.tier || 'all'}
            onChange={e => onFilterChange('tier', e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="all">All</option>
            <option value="favorite">Favorite</option>
            <option value="non-regular">Non-Regular</option>
            <option value="new">New</option>
          </select>
        </div>

        {/* Protein Filter */}
        <div>
          <label className="block text-sm font-medium mb-1">Protein</label>
          <select
            value={filters.proteinType || 'all'}
            onChange={e => onFilterChange('proteinType', e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
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
          <label className="block text-sm font-medium mb-1">Carb</label>
          <select
            value={filters.carbType || 'all'}
            onChange={e => onFilterChange('carbType', e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
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
          <label className="block text-sm font-medium mb-1">Prep Time</label>
          <select
            value={filters.prepTime || 'all'}
            onChange={e => onFilterChange('prepTime', e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="all">All</option>
            <option value="quick">Quick</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>

        {/* Lunch Filter */}
        <div>
          <label className="block text-sm font-medium mb-1">Lunch</label>
          <select
            value={filters.isLunchAppropriate === undefined ? 'all' : filters.isLunchAppropriate ? 'true' : 'false'}
            onChange={e => onFilterChange('isLunchAppropriate', e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="all">All</option>
            <option value="true">Lunch Only</option>
            <option value="false">Not for Lunch</option>
          </select>
        </div>
      </div>
    </div>
  )
}
