/** EcoSense mark: a sensing node held between two brackets. */
export function Logo({ className = 'size-5', tone = 'var(--color-ink)' }: { className?: string; tone?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path d="M6 3.5a8 8 0 0 0 0 13" fill="none" stroke={tone} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M14 3.5a8 8 0 0 1 0 13" fill="none" stroke={tone} strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="10" cy="10" r="2.6" fill="var(--color-accent)" />
    </svg>
  )
}
