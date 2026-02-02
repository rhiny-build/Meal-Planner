/**
 * SearchableSelect Component
 *
 * Reusable searchable dropdown with theme support
 */

'use client'

import ReactSelect, { SingleValue } from 'react-select'
import { useTheme } from './ThemeProvider'
import { AccentColor, getAccentStyles } from '@/lib/selectThemeConfig'

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
  accent?: AccentColor
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
  const styles = getAccentStyles(isDark, accent)

  const handleChange = (selected: SingleValue<SelectOption>) => {
    onChange(selected ? selected.value : '')
  }

  // Theme-specific class values
  const themeClasses = isDark
    ? {
        controlBg: '!bg-neutral-800',
        menuBg: '!bg-neutral-800 !border !border-neutral-700',
        optionSelected: '!bg-neutral-700 ' + styles.text,
        optionFocused: '!bg-neutral-700/50 !text-neutral-100',
        optionDefault: '!bg-transparent !text-neutral-300',
        input: '!text-neutral-100',
        placeholder: '!text-neutral-500',
        separator: '!bg-neutral-700',
        indicator: '!text-neutral-500 hover:!text-neutral-300',
      }
    : {
        controlBg: '!bg-white',
        menuBg: '!bg-white !border !border-gray-200 !shadow-lg',
        optionSelected: '!bg-blue-500 !text-white',
        optionFocused: '!bg-gray-100 !text-gray-900',
        optionDefault: '!bg-transparent !text-gray-700',
        input: '!text-gray-900',
        placeholder: '!text-gray-400',
        separator: '!bg-gray-300',
        indicator: '!text-gray-400 hover:!text-gray-600',
      }

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
          `${themeClasses.controlBg} !rounded ${styles.border} !min-h-[38px] !shadow-none ${
            state.isFocused ? styles.focus : ''
          }`,
        menu: () => `${themeClasses.menuBg} !rounded`,
        option: (state) =>
          state.isSelected
            ? themeClasses.optionSelected
            : state.isFocused
            ? themeClasses.optionFocused
            : themeClasses.optionDefault,
        singleValue: () => styles.text,
        input: () => themeClasses.input,
        placeholder: () => themeClasses.placeholder,
        indicatorSeparator: () => themeClasses.separator,
        dropdownIndicator: () => themeClasses.indicator,
        clearIndicator: () => themeClasses.indicator,
      }}
    />
  )
}
