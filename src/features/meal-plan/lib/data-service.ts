
import { GeneratePersonalizedMealPlanOutput } from '@/ai/flows/generate-meal-plan';
import { daysOfWeek, mealNames } from '@/lib/constants';
import { db } from '@/lib/firebase/clientApp';
import type { FullProfileType, WeeklyMealPlan } from '@/lib/schemas';
import { preprocessDataForFirestore } from '@/lib/schemas';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function getMealPlanData(
  userId: string
): Promise<WeeklyMealPlan | null> {
  if (!userId) return null;

  try {
    const userProfileRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userProfileRef);

    if (!docSnap.exists()) {
      return null;
    }

    const profileData = docSnap.data() as any;

    if (profileData.currentWeeklyPlan) {
      const fullPlan: WeeklyMealPlan = {
        days: daysOfWeek.map((dayName: string) => {
          const existingDay = profileData.currentWeeklyPlan.days.find(
            (d: any) => d.dayOfWeek === dayName
          );

          if (existingDay) {
            return {
              dayOfWeek: existingDay.dayOfWeek,
              meals: existingDay.meals.map((existingMeal: any) => ({
                name: existingMeal.name,
                customName: existingMeal.customName || '',
                ingredients: existingMeal.ingredients || [],
                totalCalories: existingMeal.totalCalories,
                totalProtein: existingMeal.totalProtein,
                totalCarbs: existingMeal.totalCarbs,
                totalFat: existingMeal.totalFat,
                ...(existingMeal.id !== undefined && { id: existingMeal.id }),
              })),
            };
          }

          return {
            dayOfWeek: dayName,
            meals: mealNames.map((mealName: string) => ({
              name: mealName,
              customName: '',
              ingredients: [],
              totalCalories: null,
              totalProtein: null,
              totalCarbs: null,
              totalFat: null,
            })),
          };
        }),
      };

      return fullPlan;
    }
  } catch (error) {
    console.error('Error fetching meal plan data from Firestore:', error);
  }

  return null;
}

export async function saveMealPlanData(
  userId: string,
  planData: WeeklyMealPlan
) {
  if (!userId) throw new Error('User ID required to save meal plan.');
  try {
    const userProfileRef = doc(db, 'users', userId);
    const sanitizedPlanData = preprocessDataForFirestore(planData);

    await setDoc(
      userProfileRef,
      { currentWeeklyPlan: sanitizedPlanData },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving meal plan data to Firestore:', error);
    throw error;
  }
}

export async function getProfileDataForOptimization(
  userId: string
): Promise<Partial<FullProfileType>> {
  if (!userId) return {};
  try {
    const userProfileRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userProfileRef);

    if (docSnap.exists()) {
      return docSnap.data() as Partial<FullProfileType>;
    }
  } catch (error) {
    console.error(
      'Error fetching profile data from Firestore for optimization:',
      error
    );
  }
  return {};
}

export async function getFullProfileData(
  userId: string
): Promise<Partial<FullProfileType>> {
  if (!userId) return {};
  try {
    const userProfileRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      return docSnap.data() as Partial<FullProfileType>;
    }
  } catch (error) {
    console.error('Error fetching full profile data from Firestore:', error);
  }
  return {};
}

export async function saveOptimizedMealPlan(
  userId: string,
  planData: GeneratePersonalizedMealPlanOutput
) {
  if (!userId) throw new Error('User ID required to save AI meal plan.');
  try {
    const userProfileRef = doc(db, 'users', userId);
    await setDoc(
      userProfileRef,
      { aiGeneratedMealPlan: preprocessDataForFirestore(planData) },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving AI meal plan data to Firestore:', error);
    throw error;
  }
}

export function generateInitialWeeklyPlan(): WeeklyMealPlan {
  return {
    days: daysOfWeek.map((day) => ({
      dayOfWeek: day,
      meals: mealNames.map((mealName) => ({
        name: mealName,
        customName: '',
        ingredients: [],
        totalCalories: null,
        totalProtein: null,
        totalCarbs: null,
        totalFat: null,
      })),
    })),
  };
}
