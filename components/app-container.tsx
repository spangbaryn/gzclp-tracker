'use client'

import { NavTabs } from './nav-tabs'

interface AppContainerProps {
  children: React.ReactNode
}

export function AppContainer({ children }: AppContainerProps) {
  return (
    <div className="app-container">
      {/* Status bar safe area spacer */}
      <div className="pt-safe min-h-[env(safe-area-inset-top,20px)]" />
      
      {/* Main content with additional top padding */}
      <div className="px-4 pt-6 pb-[120px] max-w-2xl mx-auto">
        {children}
      </div>
      <NavTabs />
    </div>
  )
}