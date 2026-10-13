/**
 * Reusable Button Component
 *
 * Variants and sizes in the app's one visual style. Every size is at least
 * 44px tall so it is easy to tap.
 */

import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'font-semibold rounded-card transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-sunken text-ink hover:bg-line',
    danger: 'bg-danger text-white hover:bg-danger-dark',
  }

  const sizeStyles = {
    sm: 'px-3 min-h-11 text-sm',
    md: 'px-4 min-h-11 text-base',
    lg: 'px-6 min-h-12 text-lg',
  }

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  )
}
