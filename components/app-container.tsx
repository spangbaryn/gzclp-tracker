'use client'

import { NavTabs } from './nav-tabs'

interface AppContainerProps {
  children: React.ReactNode
}

export function AppContainer({ children }: AppContainerProps) {
  return (
    <div className="app-container">
      <div className="px-4 pt-safe py-6 pb-[120px] max-w-2xl mx-auto">
        {children}
      </div>
      <NavTabs />
    </div>
  )
}