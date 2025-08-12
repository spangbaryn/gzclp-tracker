'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const tabs = [
  { id: 'workout', label: 'Workout', href: '/' },
  { id: 'progress', label: 'Progress', href: '/progress' },
  { id: 'history', label: 'History', href: '/history' },
  { id: 'settings', label: 'Settings', href: '/settings' }
]

export function NavTabs() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] glass-heavy border-t border-white/10 pb-safe">
      <div className="flex">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            prefetch={true}
            className={`
              flex-1 py-4 text-center border-none bg-transparent
              text-xs font-bold cursor-pointer transition-colors
              uppercase tracking-[1px] relative no-underline
              focus:outline-2 focus:outline-ring focus:-outline-offset-2
              active:bg-white/10
              ${pathname === tab.href ? 'text-foreground' : 'text-muted hover:text-foreground/70'}
              before:content-[''] before:absolute before:top-0
              before:left-0 before:right-0 before:h-[2px] before:bg-foreground
              before:transition-transform before:duration-200
              ${pathname === tab.href ? 'before:scale-x-100' : 'before:scale-x-0'}
            `}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  )
}