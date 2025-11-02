'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts'

interface ProgressDataPoint {
  date: string
  weight: number
  tier: number
  stage: string | null
  completedSets: number
  totalSets: number
  volume: number
  workoutType: string
}

interface ProgressGraphModalProps {
  isOpen: boolean
  onClose: () => void
  liftType: string
  liftName: string
  unit: string
}

export function ProgressGraphModal({ isOpen, onClose, liftType, liftName, unit }: ProgressGraphModalProps) {
  const [data, setData] = useState<ProgressDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'weight' | 'volume'>('weight')

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'

      // Fetch progress data
      fetchProgressData()
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [isOpen, onClose, liftType])

  const fetchProgressData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/progress/${liftType}`)
      if (response.ok) {
        const progressData = await response.json()
        setData(progressData)
      }
    } catch (error) {
      console.error('Error fetching progress:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || typeof window === 'undefined') return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Transform data for chart
  const chartData = data.map(point => ({
    ...point,
    formattedDate: formatDate(point.date),
    displayWeight: viewMode === 'weight' ? point.weight : point.volume
  }))

  // Calculate stats
  const totalWorkouts = data.length
  const latestWeight = data.length > 0 ? data[data.length - 1].weight : 0
  const startWeight = data.length > 0 ? data[0].weight : 0
  const weightGain = latestWeight - startWeight
  const percentGain = startWeight > 0 ? ((weightGain / startWeight) * 100).toFixed(1) : '0'

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="glass-heavy rounded-lg p-4 border border-white/20">
          <p className="text-foreground font-bold mb-2">{data.formattedDate}</p>
          <p className="text-sm text-muted mb-1">
            Weight: <span className="text-foreground font-semibold">{data.weight} {unit}</span>
          </p>
          <p className="text-sm text-muted mb-1">
            Volume: <span className="text-foreground font-semibold">{data.volume} {unit}</span>
          </p>
          <p className="text-sm text-muted mb-1">
            Sets: <span className="text-foreground font-semibold">{data.completedSets}/{data.totalSets}</span>
          </p>
          <p className="text-sm text-muted">
            Stage: <span className="text-foreground font-semibold">{data.stage || 'N/A'}</span>
          </p>
        </div>
      )
    }
    return null
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-ring-dark">
      <div className="absolute inset-0 flex flex-col h-full w-full">
        {/* Header */}
        <div className="border-b border-white/10 p-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-foreground">
              {liftName} Progress
            </h2>
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-lg border-2 border-white/10 bg-white/5 text-muted text-2xl flex items-center justify-center cursor-pointer transition-all active:scale-90"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted">Loading progress data...</div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted">No workout history yet</div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass rounded-lg p-5 border border-white/10">
                  <div className="text-xs uppercase tracking-wider text-muted mb-2">Total Workouts</div>
                  <div className="text-3xl font-bold text-foreground">{totalWorkouts}</div>
                </div>
                <div className="glass rounded-lg p-5 border border-white/10">
                  <div className="text-xs uppercase tracking-wider text-muted mb-2">Current Weight</div>
                  <div className="text-3xl font-bold text-foreground">{latestWeight} {unit}</div>
                </div>
                <div className="glass rounded-lg p-5 border border-white/10">
                  <div className="text-xs uppercase tracking-wider text-muted mb-2">Weight Gained</div>
                  <div className="text-3xl font-bold text-green-500">+{weightGain} {unit}</div>
                </div>
                <div className="glass rounded-lg p-5 border border-white/10">
                  <div className="text-xs uppercase tracking-wider text-muted mb-2">Percent Gain</div>
                  <div className="text-3xl font-bold text-green-500">+{percentGain}%</div>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('weight')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'weight'
                      ? 'bg-white text-black'
                      : 'border border-white/20 text-muted bg-white/5'
                  }`}
                >
                  Weight
                </button>
                <button
                  onClick={() => setViewMode('volume')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'volume'
                      ? 'bg-white text-black'
                      : 'border border-white/20 text-muted bg-white/5'
                  }`}
                >
                  Volume
                </button>
              </div>

              {/* Chart */}
              <div className="glass rounded-lg p-4 border border-white/10">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4a9eff" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4a9eff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="formattedDate"
                      stroke="#949494"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#949494"
                      style={{ fontSize: '12px' }}
                      label={{
                        value: viewMode === 'weight' ? `Weight (${unit})` : `Volume (${unit})`,
                        angle: -90,
                        position: 'insideLeft',
                        style: { fill: '#949494', fontSize: '12px' }
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="displayWeight"
                      stroke="#4a9eff"
                      strokeWidth={3}
                      fill="url(#colorWeight)"
                      dot={{ fill: '#4a9eff', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#4a9eff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Recent Workouts List */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold tracking-[2px] uppercase text-muted mb-3">
                  Recent Workouts
                </h3>
                {data.slice(-10).reverse().map((workout, idx) => (
                  <div key={idx} className="glass rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted">
                        {new Date(workout.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-white/10 text-muted font-mono">
                        {workout.workoutType}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted text-xs mb-1">Weight</div>
                        <div className="text-foreground font-bold">{workout.weight} {unit}</div>
                      </div>
                      <div>
                        <div className="text-muted text-xs mb-1">Sets</div>
                        <div className="text-foreground font-bold">{workout.completedSets}/{workout.totalSets}</div>
                      </div>
                      <div>
                        <div className="text-muted text-xs mb-1">Volume</div>
                        <div className="text-foreground font-bold">{workout.volume}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
