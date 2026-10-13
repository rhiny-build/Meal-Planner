/**
 * SearchableSelect Component
 *
 * Reusable searchable dropdown in the app's look.
 */

'use client'

import ReactSelect, { SingleValue } from 'react-select'

interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  isClearable?: boolean
  /** Accessible name for the control (it has no visible label of its own). */
  ariaLabel?: string
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  isClearable = true,
  ariaLabel,
}: SearchableSelectProps) {
  const selectedOption = options.find((opt) => opt.value === value) || null

  const handleChange = (selected: SingleValue<SelectOption>) => {
    onChange(selected ? selected.value : '')
  }

  return (
    <ReactSelect<SelectOption, false>
      options={options}
      value={selectedOption}
      onChange={handleChange}
      placeholder={placeholder}
      isClearable={isClearable}
      isSearchable
      aria-label={ariaLabel}
      menuPlacement="auto"
      menuPortalTarget={document.body}
      styles={{
        container: (base) => ({ ...base, width: '100%' }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        singleValue: (base) => ({
          ...base,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }),
        valueContainer: (base) => ({ ...base, overflow: 'hidden' }),
      }}
      classNames={{
        control: (state) =>
          `!bg-surface !rounded-card !min-h-11 !shadow-none !border ${
            state.isFocused ? '!border-primary' : '!border-line'
          }`,
        menu: () => '!bg-surface !rounded-card !border !border-line !shadow-lg',
        option: (state) =>
          state.isSelected
            ? '!bg-primary !text-white'
            : state.isFocused
            ? '!bg-primary-soft !text-ink'
            : '!bg-transparent !text-ink',
        singleValue: () => '!text-ink',
        input: () => '!text-ink',
        placeholder: () => '!text-ink-soft',
        indicatorSeparator: () => '!bg-line',
        dropdownIndicator: () => '!text-ink-soft',
        clearIndicator: () => '!text-ink-soft',
      }}
    />
  )
}
