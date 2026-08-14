type IconProps = { className?: string }

const common = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function HomeIcon({ className }: IconProps) {
  return <svg {...common} className={className}><path d="m3 11 9-8 9 8"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></svg>
}

export function ProgressIcon({ className }: IconProps) {
  return <svg {...common} className={className}><path d="M4 18 9 13l3 3 8-10"/><path d="M15 6h5v5"/></svg>
}

export function PlanIcon({ className }: IconProps) {
  return <svg {...common} className={className}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>
}

export function MaterialsIcon({ className }: IconProps) {
  return <svg {...common} className={className}><path d="M6 2h9l4 4v16H6z"/><path d="M15 2v5h4M9 12h6M9 16h6"/></svg>
}

export function BuddyIcon({ className }: IconProps) {
  return <svg {...common} className={className}><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v8a3.5 3.5 0 0 1-3.5 3.5H10l-5 4v-5.2A3.5 3.5 0 0 1 4 13.5z"/><path d="M8.5 9h.01M15.5 9h.01M9 13c1.8 1.3 4.2 1.3 6 0"/></svg>
}

export function CalendarIcon({ className }: IconProps) {
  return <svg {...common} className={className}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>
}

export function ChevronIcon({ className }: IconProps) {
  return <svg {...common} className={className}><path d="m9 5 7 7-7 7"/></svg>
}

export function BuildingIcon({ className }: IconProps) {
  return <svg {...common} className={className}><path d="M4 21V7l8-4 8 4v14M8 9h1M8 13h1M8 17h1M15 9h1M15 13h1M15 17h1M2 21h20"/></svg>
}

export function InfoIcon({ className }: IconProps) {
  return <svg {...common} className={className}><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>
}
