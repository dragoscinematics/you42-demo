import { clsx } from 'clsx'

export default function Badge({ children, color, className = '' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
        className,
      )}
      style={color ? { backgroundColor: color, color: '#fff' } : undefined}
    >
      {children}
    </span>
  )
}
