
import { z } from 'zod';
import {
  activityLevels as allActivityLevels,
  genders,
  preferredDiets,
  smartPlannerDietGoals,
} from './constants';

export function preprocessDataForFirestore(data: any): any {
  if (typeof data === 'number' && isNaN(data)) {
    return null;
  }
  if (data === undefined) {
    return null;
  }
  if (data === null || typeof data !== 'object' || data instanceof Date) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(preprocessDataForFirestore);
  }

  const processedData: Record<string, any> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      processedData[key] = preprocessDataForFirestore(data[key]);
    }
  }
  return processedData;
}

const preprocessOptionalNumber = (val: unknown) => {
  if (val === '' || val === null || val === undefined) {
    return undefined;
  }
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

export const ProfileFormSchema = z.object({
  name: z.string().min(1, 'Name is required.').optional(),
  subscriptionStatus: z.string().optional(),
  goalWeight: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return val === '' ? undefined : Number(val);
      return undefined;
    })
    .refine((val) => val === undefined || (!isNaN(val) && val > 0), {
      message: 'Goal weight must be a positive number',
    })
    .optional(),
  painMobilityIssues: z.string().optional(),
  injuries: z.array(z.string()).optional(),
  surgeries: z.array(z.string()).optional(),
  exerciseGoals: z.array(z.string()).optional(),
  exercisePreferences: z.array(z.string()).optional(),
  exerciseFrequency: z.string().optional(),
  exerciseIntensity: z.string().optional(),
  equipmentAccess: z.array(z.string()).optional(),
});
export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

export interface GlobalCalculatedTargets {
  bmr?: number | null;
  tdee?: number | null;
  finalTargetCalories?: number | null;
  estimatedWeeklyWeightChangeKg?: number | null;
  proteinTargetPct?: number | null;
  proteinGrams?: number | null;
  proteinCalories?: number | null;
  carbTargetPct?: number | null;
  carbGrams?: number | null;
  carbCalories?: number | null;
  fatTargetPct?: number | null;
  fatGrams?: number | null;
  fatCalories?: number | null;
  current_weight_for_custom_calc?: number | null;
}

export interface CustomCalculatedTargets {
  finalTargetCalories: number;
  proteinTargetPct: number;
  proteinGrams: number;
  proteinCalories: number;
  carbTargetPct: number;
  carbGrams: number;
  carbCalories: number;
  fatTargetPct: number;
  fatGrams: number;
  fatCalories: number;
}
export interface FullProfileType {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  height_cm?: number | null;
  current_weight?: number | null;
  goal_weight_1m?: number | null;
  ideal_goal_weight?: number | null;
  activity_factor_key?: string | null;
  dietGoal?: string | null; 
  dietGoalOnboarding?: string | null;
  preferredDiet?: string | null;
  allergies?: string[] | null;
  preferredCuisines?: string[] | null;
  dispreferredCuisines?: string[] | null;
  preferredIngredients?: string[] | null;
  dispreferredIngredients?: string[] | null;
  preferredMicronutrients?: string[] | null;
  medicalConditions?: string[] | null;
  medications?: string[] | null;
  bf_current?: number | null;
  bf_target?: number | null;
  bf_ideal?: number | null;
  mm_current?: number | null;
  mm_target?: number | null;
  mm_ideal?: number | null;
  bw_current?: number | null;
  bw_target?: number | null;
  bw_ideal?: number | null;
  waist_current?: number | null;
  waist_goal_1m?: number | null;
  waist_ideal?: number | null;
  hips_current?: number | null;
  hips_goal_1m?: number | null;
  hips_ideal?: number | null;
  right_leg_current?: number | null;
  right_leg_goal_1m?: number | null;
  right_leg_ideal?: number | null;
  left_leg_current?: number | null;
  left_leg_goal_1m?: number | null;
  left_leg_ideal?: number | null;
  right_arm_current?: number | null;
  right_arm_goal_1m?: number | null;
  right_arm_ideal?: number | null;
  left_arm_current?: number | null;
  left_arm_goal_1m?: number | null;
  left_arm_ideal?: number | null;
  typicalMealsDescription?: string | null;
  onboardingComplete?: boolean;
  subscriptionStatus?: string | null;
  painMobilityIssues?: string | null;
  injuries?: string[] | null;
  surgeries?: string[] | null;
  exerciseGoals?: string[] | null;
  exercisePreferences?: string[] | null;
  exerciseFrequency?: string | null;
  exerciseIntensity?: string | null;
  equipmentAccess?: string[] | null;
  goalWeight?: number | null;
  custom_total_calories?: number | null;
  activityLevel?: string | null;
  custom_protein_per_kg?: number | null;
  remaining_calories_carb_pct?: number | null;
  smartPlannerData?: {
    formValues?: Partial<SmartCaloriePlannerFormValues> | null;
    results?: GlobalCalculatedTargets | null;
  } | null;
  mealDistributions?: MealMacroDistribution[] | null;
  currentWeeklyPlan?: WeeklyMealPlan | null;
  aiGeneratedMealPlan?: GeneratePersonalizedMealPlanOutput | null;
}

export const IngredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required'),
  quantity: z.preprocess(
    preprocessOptionalNumber,
    z.coerce.number().min(0, 'Quantity must be non-negative').nullable().default(null)
  ),
  unit: z.string().min(1, 'Unit is required (e.g., g, ml, piece)'),
  calories: z.preprocess(
    preprocessOptionalNumber,
    z.coerce.number().min(0).nullable().default(null)
  ),
  protein: z.preprocess(
    preprocessOptionalNumber,
    z.coerce.number().min(0).nullable().default(null)
  ),
  carbs: z.preprocess(
    preprocessOptionalNumber,
    z.coerce.number().min(0).nullable().default(null)
  ),
  fat: z.preprocess(
    preprocessOptionalNumber,
    z.coerce.number().min(0).nullable().default(null)
  ),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

export const MealSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Meal name is required'),
  customName: z.string().optional().default(''),
  ingredients: z.array(IngredientSchema).default([]),
  totalCalories: z.preprocess(
    preprocessOptionalNumber,
    z.coerce.number().min(0).nullable().default(null)
  ),
  totalProtein: z.preprocess(
    preprocessOptionalNumber,
    z.coerce.number().min(0).nullable().default(null)
  ),
  totalCarbs: z.preprocess(
    preprocessOptionalNumber,
    z.coerce.number().min(0).nullable().default(null)
  ),
  totalFat: z.preprocess(
    preprocessOptionalNumber,
    z.coerce.number().min(0).nullable().default(null)
  ),
});
export type Meal = z.infer<typeof MealSchema>;

export const DailyMealPlanSchema = z.object({
  dayOfWeek: z.string(),
  meals: z.array(MealSchema),
});
export type DailyMealPlan = z.infer<typeof DailyMealPlanSchema>;

export const WeeklyMealPlanSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.date().optional(),
  days: z.array(DailyMealPlanSchema),
  weeklySummary: z
    .object({
      totalCalories: z.number(),
      totalProtein: z.number(),
      totalCarbs: z.number(),
      totalFat: z.number(),
    })
    .optional(),
});
export type WeeklyMealPlan = z.infer<typeof WeeklyMealPlanSchema>;

export const MealMacroDistributionSchema = z.object({
  mealName: z.string(),
  calories_pct: z.coerce.number().min(0, '% must be >= 0').max(100, '% must be <= 100').default(0),
  protein_pct: z.coerce.number().min(0, '% must be >= 0').max(100, '% must be <= 100').default(0),
  carbs_pct: z.coerce.number().min(0, '% must be >= 0').max(100, '% must be <= 100').default(0),
  fat_pct: z.coerce.number().min(0, '% must be >= 0').max(100, '% must be <= 100').default(0),
});
export type MealMacroDistribution = z.infer<typeof MealMacroDistributionSchema>;

export const MacroSplitterFormSchema = z.object({
    mealDistributions: z.array(MealMacroDistributionSchema).length(6, `Must have 6 meal entries.`),
  }).superRefine((data, ctx) => {
    const checkSum = (macroKey: keyof Omit<MealMacroDistribution, 'mealName'>, macroName: string) => {
      const sum = data.mealDistributions.reduce((acc, meal) => acc + (Number(meal[macroKey]) || 0), 0);
      if (Math.abs(sum - 100) > 0.1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Total ${macroName} percentages must sum to 100%. Current sum: ${sum.toFixed(1)}%`,
          path: ['mealDistributions', 'root'],
        });
      }
    };
    checkSum('calories_pct', 'Calorie');
    checkSum('protein_pct', 'Protein');
    checkSum('carbs_pct', 'Carbohydrate');
    checkSum('fat_pct', 'Fat');
  });
export type MacroSplitterFormValues = z.infer<typeof MacroSplitterFormSchema>;

export const SmartCaloriePlannerFormSchema = z.object({
  age: z.coerce.number().int('Age must be a whole number.').positive('Age must be positive.').optional(),
  gender: z.enum(genders.map((g) => g.value) as [string, ...string[]]).optional(),
  height_cm: z.coerce.number().positive('Height must be positive.').optional(),
  current_weight: z.coerce.number().positive('Weight must be positive.').optional(),
  goal_weight_1m: z.coerce.number().positive('Goal weight must be positive.').optional(),
  ideal_goal_weight: z.preprocess(preprocessOptionalNumber, z.coerce.number().positive().optional()),
  activity_factor_key: z.enum(allActivityLevels.map((al) => al.value) as [string, ...string[]]).optional(),
  dietGoal: z.enum(smartPlannerDietGoals.map((g) => g.value) as [string, ...string[]]).optional(),
  bf_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bf_target: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bf_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  mm_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  mm_target: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  mm_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bw_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bw_target: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  bw_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).max(100).optional()),
  waist_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  waist_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  waist_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  hips_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  hips_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  hips_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_leg_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_leg_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_leg_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_leg_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_leg_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_leg_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_arm_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_arm_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  right_arm_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_arm_current: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_arm_goal_1m: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  left_arm_ideal: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  custom_total_calories: z.preprocess(preprocessOptionalNumber, z.coerce.number().int().positive().optional()),
  custom_protein_per_kg: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  remaining_calories_carb_pct: z.coerce.number().int().min(0).max(100).default(50), // optional() حذف شد
});
export type SmartCaloriePlannerFormValues = z.infer<typeof SmartCaloriePlannerFormSchema>;

export const MealSuggestionPreferencesSchema = z.object({
  preferredDiet: z.enum(preferredDiets.map((pd) => pd.value) as [string, ...string[]]).optional(),
  preferredCuisines: z.array(z.string()).optional(),
  dispreferredCuisines: z.array(z.string()).optional(),
  preferredIngredients: z.array(z.string()).optional(),
  dispreferredIngredients: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  preferredMicronutrients: z.array(z.string()).optional(),
  medicalConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
});
export type MealSuggestionPreferencesValues = z.infer<typeof MealSuggestionPreferencesSchema>;

export const OnboardingFormSchema = z.object({
  age: z.coerce.number().int('Age must be a whole number.').min(1, 'Age is required').max(120),
  gender: z.enum(genders.map((g) => g.value) as [string, ...string[]], { required_error: 'Gender is required.' }),
  height_cm: z.coerce.number().min(50, 'Height must be at least 50cm').max(300),
  current_weight: z.coerce.number().min(20, 'Weight must be at least 20kg').max(500),
  goal_weight_1m: z.coerce.number().min(20, 'Target weight must be at least 20kg').max(500).optional(),
  ideal_goal_weight: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0).optional()),
  activityLevel: z.enum(allActivityLevels.map((al) => al.value) as [string, ...string[]], { required_error: 'Activity level is required.' }),
  dietGoalOnboarding: z.enum(smartPlannerDietGoals.map((g) => g.value) as [string, ...string[]], { required_error: 'Diet goal is required.' }),
  custom_total_calories: z.preprocess(preprocessOptionalNumber, z.coerce.number().positive('Custom calories must be positive if provided.').optional()),
  custom_protein_per_kg: z.preprocess(preprocessOptionalNumber, z.coerce.number().min(0, 'Protein per kg must be non-negative if provided.').optional()),
  remaining_calories_carb_pct: z.preprocess(preprocessOptionalNumber, z.coerce.number().int('Carb % must be a whole number.').min(0).max(100).optional().default(50)),
});
export type OnboardingFormValues = z.infer<typeof OnboardingFormSchema>;

export const AIServiceIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});
export type AIServiceIngredient = z.infer<typeof AIServiceIngredientSchema>;

export const AIServiceMealSchema = z.object({
  name: z.string(),
  customName: z.string().optional(),
  ingredients: z.array(AIServiceIngredientSchema),
  totalCalories: z.number(),
  totalProtein: z.number(),
  totalCarbs: z.number(),
  totalFat: z.number(),
});
export type AIServiceMeal = z.infer<typeof AIServiceMealSchema>;

export const AdjustMealIngredientsInputSchema = z.object({
  originalMeal: AIServiceMealSchema,
  targetMacros: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }),
  userProfile: z.object({
    age: z.number().optional(),
    gender: z.string().optional(),
    activityLevel: z.string().optional(),
    dietGoal: z.string().optional(),
    preferredDiet: z.string().optional(),
    allergies: z.array(z.string()).optional(),
    dispreferredIngredients: z.array(z.string()).optional(),
    preferredIngredients: z.array(z.string()).optional(),
  }),
});
export type AdjustMealIngredientsInput = z.infer<typeof AdjustMealIngredientsInputSchema>;

export const AdjustMealIngredientsOutputSchema = z.object({
  adjustedMeal: AIServiceMealSchema,
  explanation: z.string(),
});
export type AdjustMealIngredientsOutput = z.infer<typeof AdjustMealIngredientsOutputSchema>;

export const AIDailyMealSchema = z.object({
  meal_title: z.string().describe("A short, appetizing name for the meal. E.g., 'Sunrise Scramble' or 'Zesty Salmon Salad'."),
  ingredients: z.array(z.object({
    name: z.string().describe("The name of the ingredient, e.g., 'Large Egg' or 'Rolled Oats'."),
    calories: z.number().describe("Total calories for the quantity of this ingredient."),
    protein: z.number().describe("Grams of protein."),
    carbs: z.number().describe("Grams of carbohydrates."),
    fat: z.number().describe("Grams of fat."),
  })).min(1, "Each meal must have at least one ingredient."),
});

export const AIDailyPlanOutputSchema = z.object({
  meals: z.array(AIDailyMealSchema).describe("An array of all meals for this one day."),
});
export type AIDailyPlanOutput = z.infer<typeof AIDailyPlanOutputSchema>;

export const GeneratePersonalizedMealPlanInputSchema = z.object({
  age: z.number().optional(),
  gender: z.string().optional(),
  height_cm: z.number().optional(),
  current_weight: z.number().optional(),
  goal_weight_1m: z.number().optional(),
  activityLevel: z.string().optional(),
  dietGoalOnboarding: z.string().optional(),
  ideal_goal_weight: z.number().optional(),
  bf_current: z.number().optional(),
  bf_target: z.number().optional(),
  bf_ideal: z.number().optional(),
  mm_current: z.number().optional(),
  mm_target: z.number().optional(),
  mm_ideal: z.number().optional(),
  bw_current: z.number().optional(),
  bw_target: z.number().optional(),
  bw_ideal: z.number().optional(),
  waist_current: z.number().optional(),
  waist_goal_1m: z.number().optional(),
  waist_ideal: z.number().optional(),
  hips_current: z.number().optional(),
  hips_goal_1m: z.number().optional(),
  hips_ideal: z.number().optional(),
  right_leg_current: z.number().optional(),
  right_leg_goal_1m: z.number().optional(),
  right_leg_ideal: z.number().optional(),
  left_leg_current: z.number().optional(),
  left_leg_goal_1m: z.number().optional(),
  left_leg_ideal: z.number().optional(),
  right_arm_current: z.number().optional(),
  right_arm_goal_1m: z.number().optional(),
  right_arm_ideal: z.number().optional(),
  left_arm_current: z.number().optional(),
  left_arm_goal_1m: z.number().optional(),
  left_arm_ideal: z.number().optional(),
  preferredDiet: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  dispreferredCuisines: z.array(z.string()).optional(),
  preferredCuisines: z.array(z.string()).optional(),
  dispreferredIngredients: z.array(z.string()).optional(),
  preferredIngredients: z.array(z.string()).optional(),
  medicalConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  preferredMicronutrients: z.array(z.string()).optional(),
  typicalMealsDescription: z.string().optional(),
  mealTargets: z.array(
    z.object({
      mealName: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
    })
  ),
});
export type GeneratePersonalizedMealPlanInput = z.infer<typeof GeneratePersonalizedMealPlanInputSchema>;

export const AIGeneratedIngredientSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});
export type AIGeneratedIngredient = z.infer<typeof AIGeneratedIngredientSchema>;

export const AIGeneratedMealSchema = z.object({
  meal_name: z.string(),
  meal_title: z.string(),
  ingredients: z.array(AIGeneratedIngredientSchema),
  total_calories: z.number().optional(),
  total_protein_g: z.number().optional(),
  total_carbs_g: z.number().optional(),
  total_fat_g: z.number().optional(),
});
export type AIGeneratedMeal = z.infer<typeof AIGeneratedMealSchema>;

export const DayPlanSchema = z.object({
  day: z.string(),
  meals: z.array(AIGeneratedMealSchema),
});
export type DayPlan = z.infer<typeof DayPlanSchema>;

export const GeneratePersonalizedMealPlanOutputSchema = z.object({
  weeklyMealPlan: z.array(DayPlanSchema),
  weeklySummary: z.object({
    totalCalories: z.number(),
    totalProtein: z.number(),
    totalCarbs: z.number(),
    totalFat: z.number(),
  }),
});
export type GeneratePersonalizedMealPlanOutput = z.infer<typeof GeneratePersonalizedMealPlanOutputSchema>;

export const SuggestIngredientSwapInputSchema = z.object({
  mealName: z.string(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      caloriesPer100g: z.number(),
      proteinPer100g: z.number(),
      fatPer100g: z.number(),
    })
  ),
  dietaryPreferences: z.string(),
  dislikedIngredients: z.array(z.string()),
  allergies: z.array(z.string()),
  nutrientTargets: z.object({
    calories: z.number(),
    protein: z.number(),
    carbohydrates: z.number(),
    fat: z.number(),
  }),
});
export type SuggestIngredientSwapInput = z.infer<typeof SuggestIngredientSwapInputSchema>;

export const SuggestIngredientSwapOutputSchema = z.array(
  z.object({
    ingredientName: z.string(),
    reason: z.string(),
  })
);
export type SuggestIngredientSwapOutput = z.infer<typeof SuggestIngredientSwapOutputSchema>;

export const SuggestMealsForMacrosInputSchema = z.object({
  mealName: z.string(),
  targetCalories: z.number(),
  targetProteinGrams: z.number(),
  targetCarbsGrams: z.number(),
  targetFatGrams: z.number(),
  age: z.number().optional(),
  gender: z.string().optional(),
  activityLevel: z.string().optional(),
  dietGoal: z.string().optional(),
  preferredDiet: z.string().optional(),
  preferredCuisines: z.array(z.string()).optional(),
  dispreferredCuisines: z.array(z.string()).optional(),
  preferredIngredients: z.array(z.string()).optional(),
  dispreferredIngredients: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  medicalConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
});
export type SuggestMealsForMacrosInput = z.infer<typeof SuggestMealsForMacrosInputSchema>;

export const IngredientDetailSchema = z.object({
  name: z.string(),
  amount: z.string(),
  unit: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  macrosString: z.string(),
});
export type IngredientDetail = z.infer<typeof IngredientDetailSchema>;

export const MealSuggestionSchema = z.object({
  mealTitle: z.string(),
  description: z.string(),
  ingredients: z.array(IngredientDetailSchema),
  totalCalories: z.number(),
  totalProtein: z.number(),
  totalCarbs: z.number(),
  totalFat: z.number(),
  instructions: z.string().optional(),
});
export type MealSuggestion = z.infer<typeof MealSuggestionSchema>;

export const SuggestMealsForMacrosOutputSchema = z.object({
  suggestions: z.array(MealSuggestionSchema),
});
export type SuggestMealsForMacrosOutput = z.infer<typeof SuggestMealsForMacrosOutputSchema>;

export const SupportChatbotInputSchema = z.object({
  userQuery: z.string(),
});
export type SupportChatbotInput = z.infer<typeof SupportChatbotInputSchema>;

export const SupportChatbotOutputSchema = z.object({
  botResponse: z.string(),
});
export type SupportChatbotOutput = z.infer<typeof SupportChatbotOutputSchema>;
