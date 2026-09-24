import { useLanguage } from '../../i18n/LanguageContext'

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  type = 'button',
  children,
  ref,
  ...props
}) {
  const { tf } = useLanguage()
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    secondary: 'border border-gray-300 bg-white text-gray-700 hover:border-gray-400',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    danger: 'bg-danger-text text-white hover:bg-[#9b1c1c]',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-sm',
  }
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-[8px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? tf('admin.ui.envoi') : children}
    </button>
  )
}
