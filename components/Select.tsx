/**
 * Select Component
 *
 * Reusable select dropdown with consistent styling
 */

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: SelectOption[]
  label?: string
  required?: boolean
  className?: string
}

export default function Select({
  name,
  value,
  onChange,
  options,
  label,
  required = false,
  className = '',
}: SelectProps) {
  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium mb-1">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full min-h-11 px-3 border border-line bg-surface rounded-card ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
