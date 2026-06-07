import type { ExerciseLog } from './types'

/**
 * MET (Metabolic Equivalent of Task) values by WGER category + intensity.
 * Sources: Compendium of Physical Activities (Ainsworth et al.)
 */
const MET_BY_CATEGORY: Record<string, Record<ExerciseLog['intensity'], number>> = {
  Cardio:    { light: 5.0, moderate: 8.0, vigorous: 12.0 },
  Legs:      { light: 3.5, moderate: 5.0, vigorous:  7.0 },
  Back:      { light: 3.0, moderate: 4.5, vigorous:  6.0 },
  Chest:     { light: 3.0, moderate: 4.5, vigorous:  6.0 },
  Arms:      { light: 2.5, moderate: 4.0, vigorous:  5.5 },
  Shoulders: { light: 2.5, moderate: 4.0, vigorous:  5.5 },
  Abs:       { light: 2.5, moderate: 3.5, vigorous:  5.0 },
  Calves:    { light: 2.5, moderate: 3.5, vigorous:  5.0 }
}

const MET_DEFAULT: Record<ExerciseLog['intensity'], number> = {
  light: 3.0,
  moderate: 4.5,
  vigorous: 6.5
}

/**
 * Returns estimated calories burned.
 * Formula: kcal = MET × weight_kg × duration_hours
 */
export function estimateCalories(
  durationMin: number,
  intensity: ExerciseLog['intensity'],
  weightKg: number,
  category?: string
): number {
  const mets = (category && MET_BY_CATEGORY[category]) ?? MET_DEFAULT
  const met = mets[intensity]
  return Math.round(met * weightKg * (durationMin / 60))
}

export function metForCategory(category: string | undefined, intensity: ExerciseLog['intensity']): number {
  const mets = (category && MET_BY_CATEGORY[category]) ?? MET_DEFAULT
  return mets[intensity]
}
