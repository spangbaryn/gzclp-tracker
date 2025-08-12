import { stageConfig } from './constants'

interface ProgressionInput {
  exercise: string
  tier: number
  currentWeight: number
  currentStage: number
  allSetsCompleted: boolean
  amrapReps: number
  totalReps?: number // For T2 volume tracking
}

interface ProgressionResult {
  weight: number
  stage: number
  sets: number
  reps: number
  progression: string
}

export function calculateNextWorkout(input: ProgressionInput): ProgressionResult {
  const { exercise, tier, currentWeight, currentStage, allSetsCompleted, amrapReps, totalReps } = input
  
  // Determine if it's an upper body movement (smaller increments)
  const isUpperBody = exercise === 'bench' || exercise === 'ohp'
  const increment = isUpperBody ? 5 : 10
  
  if (tier === 1) {
    return calculateT1Progression(currentWeight, currentStage, allSetsCompleted, increment)
  } else if (tier === 2) {
    return calculateT2Progression(currentWeight, currentStage, totalReps || 0, increment)
  } else if (tier === 3) {
    return calculateT3Progression(currentWeight, amrapReps)
  }
  
  // Default fallback
  return {
    weight: currentWeight,
    stage: currentStage,
    sets: 3,
    reps: 15,
    progression: 'Unknown'
  }
}

function calculateT1Progression(
  currentWeight: number, 
  currentStage: number, 
  allSetsCompleted: boolean,
  increment: number
): ProgressionResult {
  const stages = stageConfig.t1
  
  if (allSetsCompleted) {
    // Success - increase weight, stay at same stage
    return {
      weight: currentWeight + increment,
      stage: currentStage,
      sets: stages[currentStage as 1 | 2 | 3].sets,
      reps: stages[currentStage as 1 | 2 | 3].reps,
      progression: `+${increment}lbs`
    }
  } else {
    // Failure - check stage progression
    if (currentStage < 3) {
      // Move to next stage with same weight
      const nextStage = (currentStage + 1) as 1 | 2 | 3
      return {
        weight: currentWeight,
        stage: nextStage,
        sets: stages[nextStage].sets,
        reps: stages[nextStage].reps,
        progression: `Stage ${nextStage}`
      }
    } else {
      // Failed stage 3 - reset to 90% and stage 1
      const resetWeight = Math.round(currentWeight * 0.9)
      return {
        weight: resetWeight,
        stage: 1,
        sets: stages[1].sets,
        reps: stages[1].reps,
        progression: `Reset to ${resetWeight}lbs`
      }
    }
  }
}

function calculateT2Progression(
  currentWeight: number,
  currentStage: number,
  totalReps: number,
  increment: number
): ProgressionResult {
  const stages = stageConfig.t2
  const currentStageConfig = stages[currentStage as 1 | 2 | 3]
  const minVolume = currentStageConfig.minVolume
  
  if (totalReps >= minVolume) {
    // Met volume requirement - increase weight
    return {
      weight: currentWeight + increment,
      stage: currentStage,
      sets: currentStageConfig.sets,
      reps: currentStageConfig.reps,
      progression: `+${increment}lbs`
    }
  } else {
    // Failed volume requirement
    if (currentStage < 3) {
      // Move to next stage with same weight
      const nextStage = (currentStage + 1) as 1 | 2 | 3
      return {
        weight: currentWeight,
        stage: nextStage,
        sets: stages[nextStage].sets,
        reps: stages[nextStage].reps,
        progression: `Stage ${nextStage}`
      }
    } else {
      // Failed stage 3 - reset to 90% and stage 1
      const resetWeight = Math.round(currentWeight * 0.9)
      return {
        weight: resetWeight,
        stage: 1,
        sets: stages[1].sets,
        reps: stages[1].reps,
        progression: `Reset to ${resetWeight}lbs`
      }
    }
  }
}

function calculateT3Progression(
  currentWeight: number,
  amrapReps: number
): ProgressionResult {
  const shouldIncrease = amrapReps >= 25
  
  return {
    weight: shouldIncrease ? currentWeight + 5 : currentWeight,
    stage: 1, // T3 doesn't have stages
    sets: stageConfig.t3.sets,
    reps: stageConfig.t3.reps,
    progression: shouldIncrease ? '+5lbs' : 'Same weight'
  }
}