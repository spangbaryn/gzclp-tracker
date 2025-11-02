'use client'

import { useState } from 'react'
import { ProgressGraphModal } from './progress-graph-modal'
import type { Progression, UserSettings } from '@prisma/client'

interface ProgressViewProps {
  progressions: Progression[]
  settings: UserSettings
}

export function ProgressView({ progressions, settings }: ProgressViewProps) {
  const [selectedLift, setSelectedLift] = useState<{
    liftType: string
    liftName: string
  } | null>(null)

  const handleLiftClick = (liftType: string) => {
    const liftName = liftType === 'ohp' ? 'OHP' :
      liftType.charAt(0).toUpperCase() + liftType.slice(1)
    setSelectedLift({ liftType, liftName })
  }

  const handleCloseModal = () => {
    setSelectedLift(null)
  }

  return (
    <>
      <div className="space-y-2">
        {progressions.map((prog) => {
          const liftName = prog.liftType === 'ohp' ? 'OHP' :
            prog.liftType.charAt(0).toUpperCase() + prog.liftType.slice(1)
          const t1Weight = prog.t1Weight || (settings[`${prog.liftType}Max` as keyof typeof settings] as number)
          const t2Weight = prog.t2Weight || (settings[`${prog.liftType}Max` as keyof typeof settings] as number)

          return (
            <div
              key={prog.id}
              onClick={() => handleLiftClick(prog.liftType)}
              className="rounded-lg bg-white/[0.02] border border-white/5 p-4 cursor-pointer transition-all active:scale-[0.98] hover:bg-white/[0.04] hover:border-white/10"
            >
              <div className="grid grid-cols-[1fr,120px,120px] items-center gap-4">
                <span className="text-foreground font-semibold text-base">
                  {liftName}
                </span>
                <div className="text-right">
                  <span className="text-xs text-muted uppercase tracking-wider">T1: </span>
                  <span className="text-foreground text-lg font-bold">
                    {t1Weight} {settings.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted uppercase tracking-wider">T2: </span>
                  <span className="text-foreground text-lg font-bold">
                    {t2Weight} {settings.unit}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedLift && (
        <ProgressGraphModal
          isOpen={true}
          onClose={handleCloseModal}
          liftType={selectedLift.liftType}
          liftName={selectedLift.liftName}
          unit={settings.unit}
        />
      )}
    </>
  )
}
