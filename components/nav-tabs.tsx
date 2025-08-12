'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const tabs = [
  { 
    id: 'workout', 
    label: 'Workout', 
    href: '/',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )
  },
  { 
    id: 'progress', 
    label: 'Progress', 
    href: '/progress',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { 
    id: 'history', 
    label: 'History', 
    href: '/history',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    id: 'settings', 
    label: 'Settings', 
    href: '/settings',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
]

export function NavTabs() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] glass-heavy border-t border-white/10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex" style={{ height: '48px' }}>
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            prefetch={true}
            className={`
              flex-1 text-center border-none bg-transparent
              text-xs font-bold cursor-pointer transition-colors
              uppercase tracking-[1px] relative no-underline
              focus:outline-2 focus:outline-ring focus:-outline-offset-2
              active:bg-white/10 flex flex-col items-center justify-center gap-1
              ${pathname === tab.href ? 'text-foreground' : 'text-muted hover:text-foreground/70'}
              before:content-[''] before:absolute before:top-0
              before:left-0 before:right-0 before:h-[2px] before:bg-foreground
              before:transition-transform before:duration-200
              ${pathname === tab.href ? 'before:scale-x-100' : 'before:scale-x-0'}
            `}
          >
            {tab.icon}
            <span className="text-[10px]">{tab.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}