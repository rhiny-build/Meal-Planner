/**
 * SearchableSelect Component
 *
 * Reusable searchable dropdown with theme support
 */

'use client'

import ReactSelect, { SingleValue } from 'react-select'
import { useTheme } from './ThemeProvider'

interface SelectOption {
  value: string
  label: string
}

type AccentColor = 'amber' | 'fuchsia' | 'cyan' | 'lime' | 'default'

interface SearchableSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  isClearable?: boolean
  accent?: AccentColor
}

// Dark mode accent styles (neon colors)
const darkAccentStyles = {
  amber: {
    border: '!border-l-4 !border-l-amber-500 !border-y-0 !border-r-0',
    text: '!text-amber-400',
    focus: '!border-l-amber-400',
  },
  fuchsia: {
    border: '!border-l-4 !border-l-fuchsia-500 !border-y-0 !border-r-0',
    text: '!text-fuchsia-400',
    focus: '!border-l-fuchsia-400',
  },
  cyan: {
    border: '!border-l-4 !border-l-cyan-500 !border-y-0 !border-r-0',
    text: '!text-cyan-400',
    focus: '!border-l-cyan-400',
  },
  lime: {
    border: '!border-l-4 !border-l-lime-500 !border-y-0 !border-r-0',
    text: '!text-lime-400',
    focus: '!border-l-lime-400',
  },
  default: {
    border: '!border !border-neutral-700',
    text: '!text-neutral-100',
    focus: '!border-blue-500',
  },
}

// Light mode accent styles
const lightAccentStyles = {
  amber: {
    border: '!border-l-4 !border-l-amber-500 !border-y !border-r !border-y-gray-300 !border-r-gray-300',
    text: '!text-amber-600',
    focus: '!border-l-amber-600',
  },
  fuchsia: {
    border: '!border-l-4 !border-l-fuchsia-500 !border-y !border-r !border-y-gray-300 !border-r-gray-300',
    text: '!text-fuchsia-600',
    focus: '!border-l-fuchsia-600',
  },
  cyan: {
    border: '!border-l-4 !border-l-cyan-500 !border-y !border-r !border-y-gray-300 !border-r-gray-300',
    text: '!text-cyan-600',
    focus: '!border-l-cyan-600',
  },
  lime: {
    border: '!border-l-4 !border-l-lime-500 !border-y !border-r !border-y-gray-300 !border-r-gray-300',
    text: '!text-lime-600',
    focus: '!border-l-lime-600',
  },
  default: {
    border: '!border !border-gray-300',
    text: '!text-gray-900',
    focus: '!border-blue-500',
  },
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  isClearable = true,
  accent = 'default',
}: SearchableSelectProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const selectedOption = options.find(opt => opt.value === value) || null
  const styles = isDark ? darkAccentStyles[accent] : lightAccentStyles[accent]

  const handleChange = (selected: SingleValue<SelectOption>) => {
    onChange(selected ? selected.value : '')
  }

  if (isDark) {
    return (
      <ReactSelect<SelectOption, false>
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        isClearable={isClearable}
        isSearchable
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
          valueContainer: (base) => ({
            ...base,
            overflow: 'hidden',
          }),
        }}
        classNames={{
          control: (state) =>
            `!bg-neutral-800 !rounded ${styles.border} !min-h-[38px] !shadow-none ${
              state.isFocused ? styles.focus : ''
            }`,
          menu: () => '!bg-neutral-800 !border !border-neutral-700 !rounded',
          option: (state) =>
            `${
              state.isSelected
                ? '!bg-neutral-700 ' + styles.text
                : state.isFocused
                ? '!bg-neutral-700/50 !text-neutral-100'
                : '!bg-transparent !text-neutral-300'
            }`,
          singleValue: () => `${styles.text}`,
          input: () => '!text-neutral-100',
          placeholder: () => '!text-neutral-500',
          indicatorSeparator: () => '!bg-neutral-700',
          dropdownIndicator: () => '!text-neutral-500 hover:!text-neutral-300',
          clearIndicator: () => '!text-neutral-500 hover:!text-neutral-300',
        }}
      />
    )
  }

  // Light mode
  return (
    <ReactSelect<SelectOption, false>
      options={options}
      value={selectedOption}
      onChange={handleChange}
      placeholder={placeholder}
      isClearable={isClearable}
      isSearchable
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
        valueContainer: (base) => ({
          ...base,
          overflow: 'hidden',
        }),
      }}
      classNames={{
        control: (state) =>
          `!bg-white !rounded ${styles.border} !min-h-[38px] !shadow-none ${
            state.isFocused ? styles.focus : ''
          }`,
        menu: () => '!bg-white !border !border-gray-200 !rounded !shadow-lg',
        option: (state) =>
          `${
            state.isSelected
              ? '!bg-blue-500 !text-white'
              : state.isFocused
              ? '!bg-gray-100 !text-gray-900'
              : '!bg-transparent !text-gray-700'
          }`,
        singleValue: () => `${styles.text}`,
        input: () => '!text-gray-900',
        placeholder: () => '!text-gray-400',
        indicatorSeparator: () => '!bg-gray-300',
        dropdownIndicator: () => '!text-gray-400 hover:!text-gray-600',
        clearIndicator: () => '!text-gray-400 hover:!text-gray-600',
      }}
    />
  )
}
