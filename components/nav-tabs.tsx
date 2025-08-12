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
    <div className="sticky top-0 z-[100] flex glass-heavy border-b border-white/10">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.href)}
          className={`
            flex-1 py-4 text-center border-none bg-transparent
            text-xs font-bold cursor-pointer transition-all
            uppercase tracking-[1.5px] relative
            focus:outline-2 focus:outline-ring focus:-outline-offset-2
            hover:bg-white/5
            ${pathname === tab.href ? 'text-foreground' : 'text-muted'}
            after:content-[''] after:absolute after:bottom-[-1px]
            after:left-0 after:right-0 after:h-[2px] after:bg-foreground
            after:transition-transform
            ${pathname === tab.href ? 'after:scale-x-100' : 'after:scale-x-0'}
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}