'use client'

import { NavTabs } from './nav-tabs'

interface AppContainerProps {
  children: React.ReactNode
}

export function AppContainer({ children }: AppContainerProps) {
  return (
    <div className="app-container">
      <NavTabs />
      <div className="px-4 py-6 pb-[100px] max-w-2xl mx-auto">
        {children}
      </div>
    </div>
  )
}