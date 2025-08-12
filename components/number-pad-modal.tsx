'use client'

import { useState, useEffect } from 'react'

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

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue.toString())
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, initialValue])

  if (!isOpen) return null

  const handleNumberPress = (num: string) => {
    if (value === '0') {
      setValue(num)
    } else {
      setValue(value + num)
    }
  }

  const handleDecimalPress = () => {
    if (!value.includes('.')) {
      setValue(value + '.')
    }
  }

  const handleClear = () => {
    setValue('0')
  }

  const handleBackspace = () => {
    if (value.length > 1) {
      setValue(value.slice(0, -1))
    } else {
      setValue('0')
    }
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

  return (
    <div className="fixed inset-0 z-[1001] bg-background flex flex-col h-[100vh] h-[100dvh] w-full overflow-hidden overscroll-none touch-none">
      {/* Header */}
      <div className="glass-heavy border-b border-white/10 px-4 py-4 flex items-center justify-between safe-top">
        <button
          onClick={onClose}
          className="text-muted hover:text-foreground transition-colors text-sm font-semibold uppercase tracking-wider"
        >
          Cancel
        </button>
        <h2 className="text-sm font-bold uppercase tracking-[2px] text-foreground">
          {title}
        </h2>
        <button
          onClick={handleSave}
          className="text-foreground hover:text-primary transition-colors text-sm font-semibold uppercase tracking-wider"
        >
          Save
        </button>
      </div>

      {/* Display */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="text-center mb-12">
          <div className="text-6xl font-bold text-foreground mb-2 tracking-wider">
            {value}
          </div>
          <div className="text-xl text-muted uppercase tracking-[2px]">
            {unit}
          </div>
        </div>

        {/* Clear button */}
        <button
          onClick={handleClear}
          className="mb-8 px-6 py-2 rounded-full glass border border-white/20 text-sm uppercase tracking-wider text-muted hover:text-foreground hover:bg-white/10 transition-all"
        >
          Clear
        </button>
      </div>

      {/* Number pad */}
      <div className="glass-heavy border-t border-white/10 p-4 pb-8 safe-bottom">
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {buttons.map((button) => (
            <button
              key={button.label}
              onClick={button.action}
              className={`
                h-16 rounded-xl glass border-2 border-white/10 
                text-2xl font-semibold text-foreground
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
  )
}