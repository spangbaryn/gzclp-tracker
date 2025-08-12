'use client'

import { usePathname, useRouter } from 'next/navigation'

const tabs = [
  { id: 'workout', label: 'Workout', href: '/' },
  { id: 'progress', label: 'Progress', href: '/progress' },
  { id: 'history', label: 'History', href: '/history' },
  { id: 'settings', label: 'Settings', href: '/settings' }
]

export function NavTabs() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] glass-heavy border-t border-white/10 pb-safe">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => router.push(tab.href)}
            className={`
              flex-1 py-4 text-center border-none bg-transparent
              text-xs font-bold cursor-pointer transition-all
              uppercase tracking-[1px] relative
              focus:outline-2 focus:outline-ring focus:-outline-offset-2
              active:bg-white/10
              ${pathname === tab.href ? 'text-foreground' : 'text-muted'}
              before:content-[''] before:absolute before:top-0
              before:left-0 before:right-0 before:h-[2px] before:bg-foreground
              before:transition-transform
              ${pathname === tab.href ? 'before:scale-x-100' : 'before:scale-x-0'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}