export type DietPhaseKey = 'cut' | 'bulk' | 'refeed' | 'rest';

export interface DietPhaseConfig {
  /** Grams of protein per kg of lean body mass */
  proteinPerKgLean: number;
  /** Grams of fat per kg of body weight */
  fatPerKgBody: number;
  /** Calorie offset from maintenance (kcal/day) */
  calorieOffset: number;
}

export const DIET_PHASES_CONFIG: Record<DietPhaseKey, DietPhaseConfig> = {
  cut: {
    proteinPerKgLean: 2.1,
    fatPerKgBody: 0.25,
    calorieOffset: -1500,
  },
  bulk: {
    proteinPerKgLean: 1.8,
    fatPerKgBody: 0.3,
    calorieOffset: 500,
  },
  refeed: {
    proteinPerKgLean: 1.9,
    fatPerKgBody: 0.25,
    calorieOffset: 200,
  },
  rest: {
    proteinPerKgLean: 1.9,
    fatPerKgBody: 0.3,
    calorieOffset: -600,
  },
};

/**
 * Carbs can be derived later as:
 *   carbs_kcal = total_kcal - (prot_g * 4 + fat_g * 9)
 *   carbs_g   = carbs_kcal / 4
 */
