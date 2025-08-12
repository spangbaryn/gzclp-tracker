'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface NumberPadModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (value: number) => void
  initialValue: number
  title?: string
  unit?: string
}

export function NumberPadModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialValue, 
  title = 'Enter Weight',
  unit = 'lbs'
}: NumberPadModalProps) {
  const [value, setValue] = useState(initialValue.toString())
  const [isFirstInput, setIsFirstInput] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue.toString())
      setIsFirstInput(true) // Reset the flag when modal opens
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      return () => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
      }
    }
  }, [isOpen, initialValue])

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen || !mounted) return null

  const handleNumberPress = (num: string) => {
    if (value === '0' || isFirstInput) {
      setValue(num)
      setIsFirstInput(false)
    } else {
      setValue(value + num)
    }
  }

  const handleDecimalPress = () => {
    if (isFirstInput) {
      setValue('0.')
      setIsFirstInput(false)
    } else if (!value.includes('.')) {
      setValue(value + '.')
    }
  }

  const handleClear = () => {
    setValue('0')
    setIsFirstInput(false) // User explicitly cleared, so don't auto-clear on next input
  }

  const handleBackspace = () => {
    if (value.length > 1) {
      setValue(value.slice(0, -1))
    } else {
      setValue('0')
    }
    setIsFirstInput(false) // User is editing, so don't auto-clear
  }

  const handleSave = () => {
    const numValue = parseFloat(value) || 0
    onSave(numValue)
    onClose()
  }

  const buttons = [
    { label: '7', action: () => handleNumberPress('7') },
    { label: '8', action: () => handleNumberPress('8') },
    { label: '9', action: () => handleNumberPress('9') },
    { label: '4', action: () => handleNumberPress('4') },
    { label: '5', action: () => handleNumberPress('5') },
    { label: '6', action: () => handleNumberPress('6') },
    { label: '1', action: () => handleNumberPress('1') },
    { label: '2', action: () => handleNumberPress('2') },
    { label: '3', action: () => handleNumberPress('3') },
    { label: '.', action: handleDecimalPress },
    { label: '0', action: () => handleNumberPress('0') },
    { label: '⌫', action: handleBackspace }
  ]

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" />
      
      {/* Modal */}
      <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] bg-background flex flex-col w-screen h-screen overflow-hidden overscroll-none touch-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', WebkitBackfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
        {/* Header with just title */}
        <div className="glass-heavy border-b border-white/10 px-4 pb-6 flex items-center justify-center flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
          <h2 className="text-sm font-bold uppercase tracking-[2px] text-foreground">
            {title}
          </h2>
        </div>

        {/* Display */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 min-h-0">
        <div className="text-center">
          <div className="text-5xl sm:text-6xl font-bold text-foreground mb-2 tracking-wider">
            {value}
          </div>
          <div className="text-lg sm:text-xl text-muted uppercase tracking-[2px]">
            {unit}
          </div>
        </div>

        {/* Clear button */}
        <button
          onClick={handleClear}
          className="mt-4 mb-4 px-6 py-2 rounded-full glass border border-white/20 text-sm uppercase tracking-wider text-muted hover:text-foreground hover:bg-white/10 transition-all"
        >
          Clear
        </button>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex gap-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex-1 py-4 rounded-xl glass border-2 border-white/20 text-sm font-bold uppercase tracking-wider text-muted hover:text-foreground hover:bg-white/10 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-4 rounded-xl glass border-2 border-primary/50 bg-primary/10 text-sm font-bold uppercase tracking-wider text-foreground hover:bg-primary/20 hover:border-primary transition-all"
        >
          Save
        </button>
      </div>

      {/* Number pad */}
      <div className="glass-heavy border-t border-white/10 p-3 flex-shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {buttons.map((button) => (
            <button
              key={button.label}
              onClick={button.action}
              className={`
                h-14 sm:h-16 rounded-xl glass border-2 border-white/10 
                text-xl sm:text-2xl font-semibold text-foreground
                hover:bg-white/10 hover:border-white/20
                active:scale-95 transition-all
                ${button.label === '⌫' ? 'text-muted' : ''}
              `}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
      </div>
    </>,
    document.body
  )
}