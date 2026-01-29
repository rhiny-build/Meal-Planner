/**
 * Reusable Button Component
 *
 * Supports light and dark themes with variants and sizes
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
    'font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    primary: 'bg-blue-600 dark:bg-fuchsia-600 text-white hover:bg-blue-700 dark:hover:bg-fuchsia-500 focus:ring-blue-500 dark:focus:ring-fuchsia-500',
    secondary: 'bg-gray-200 dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 hover:bg-gray-300 dark:hover:bg-neutral-600 focus:ring-gray-500 dark:focus:ring-neutral-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-500 focus:ring-red-500',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  )
}
