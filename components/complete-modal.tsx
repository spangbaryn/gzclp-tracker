'use client'

interface CompleteModalProps {
  completedSets: number
  onClose: () => void
}

export function CompleteModal({ completedSets, onClose }: CompleteModalProps) {
  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] p-5 flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="glass-heavy rounded-xl p-8 max-w-[90%] max-h-[80vh] overflow-y-auto text-center animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-[60px] h-[60px] mx-auto mb-5 rounded-full border-2 border-foreground/50 bg-white/5 flex items-center justify-center text-[30px] text-foreground">
          ✓
        </div>
        <div className="text-sm font-bold tracking-[2px] uppercase text-foreground mb-[15px]">
          Workout Complete
        </div>
        <p className="text-muted text-sm my-5 leading-relaxed">
          Great work! You completed {completedSets} sets.
        </p>
        <button
          onClick={onClose}
          className="w-full py-[18px] rounded-lg glass border-2 border-white/20 text-sm tracking-[2px] uppercase font-bold text-foreground cursor-pointer mt-5 transition-all min-h-[56px] hover:bg-white/10 hover:border-white/30 focus:outline-2 focus:outline-ring focus:-outline-offset-2 active:scale-[0.99]"
        >
          Continue
        </button>
      </div>
    </div>
  )
}