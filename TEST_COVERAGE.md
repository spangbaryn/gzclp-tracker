# GZCLP Tracker - Test Coverage Summary

## Overview
Comprehensive test suite covering all GZCLP (GZCL Linear Progression) logic and application flow.

## Test Files

### 1. `__tests__/gzclp-logic.test.ts`
**Unit tests for core GZCLP rules:**
- Workout cycle progression (A1 → B1 → A2 → B2 → A1)
- T1 progression logic (5×3+, 6×2+, 10×1+)
- T2 progression logic (3×10, 3×8, 3×6) with volume requirements
- T3 progression logic (25+ reps AMRAP)
- Weight calculations (T2 = 65% of T1)
- Reset functionality
- Exercise order in workouts

### 2. `__tests__/api/workout-completion-logic.test.ts`
**Detailed workout completion logic:**
- T1 weight progression on success
- T1 stage advancement on failure
- T1 stage 3 failure reset (90% weight, stage 1)
- T2 volume-based progression
- T2 minimum volume requirements per stage
- T3 AMRAP progression rules
- Weight increment rules (5 lbs upper, 10 lbs lower)

### 3. `__tests__/e2e/workout-flow.integration.test.ts`
**Integration tests for complete flows:**
- Full workout progression flow
- Weight and stage management
- Setup and reset logic
- Workout order management
- Data integrity checks

### 4. `__tests__/api/routes.test.ts`
**API route logic validation:**
- Workout completion calculations
- Setup weights calculations
- Reset state management
- Workout navigation

### 5. `__tests__/workout-progression.test.ts`
**Workout order and mapping:**
- Correct workout sequence
- Index to workout name mapping
- Cycle completion

### 6. `__tests__/reset-flow.test.ts`
**Reset functionality:**
- Data clearing
- Initial state restoration
- Progression reset

## GZCLP Rules Tested

### T1 (Main Lifts) Progression
1. **Stage 1**: 5×3+ → Success: +weight, Failure: Stage 2
2. **Stage 2**: 6×2+ → Success: +weight, Failure: Stage 3
3. **Stage 3**: 10×1+ → Success: +weight, Failure: Reset to Stage 1 @ 90%

### T2 (Secondary Lifts) Progression
1. **Stage 1**: 3×10 (30 reps min) → Success: +weight, Failure: Stage 2
2. **Stage 2**: 3×8 (24 reps min) → Success: +weight, Failure: Stage 3
3. **Stage 3**: 3×6 (18 reps min) → Success: +weight, Failure: Reset to Stage 1 @ 90%

### T3 (Accessories) Progression
- 3×15+ → 25+ reps on AMRAP = increase weight next time

### Weight Increments
- Upper body (Bench, OHP): +5 lbs
- Lower body (Squat, Deadlift): +10 lbs

### Workout Rotation
- **A1**: Squat (T1), Bench (T2), Lat Pulldown (T3)
- **B1**: OHP (T1), Deadlift (T2), Dumbbell Row (T3)
- **A2**: Bench (T1), Squat (T2), Lat Pulldown (T3)
- **B2**: Deadlift (T1), OHP (T2), Dumbbell Row (T3)

## Test Results
All 58 tests passing across 6 test suites, ensuring the GZCLP logic is correctly implemented.