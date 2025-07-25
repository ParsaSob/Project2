'use client';

import { suggestMealsForMacros } from '@/ai/flows/suggest-meals-for-macros';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  defaultMacroPercentages,
  mealNames,
  preferredDiets,
} from '@/lib/constants';
import { db } from '@/lib/firebase/clientApp';
import { calculateEstimatedDailyTargets } from '@/lib/nutrition-calculator';
import type {
  FullProfileType,
  SuggestMealsForMacrosInput,
  SuggestMealsForMacrosOutput,
  MealSuggestionPreferencesValues,
} from '@/lib/schemas';
import {
  MealSuggestionPreferencesSchema,
  preprocessDataForFirestore,
} from '@/lib/schemas';
import { getAIApiErrorMessage } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, getDoc, setDoc, DocumentSnapshot, DocumentData } from '@firebase/firestore';
import {
  AlertTriangle,
  ChefHat,
  Loader2,
  Settings,
  Sparkles,
  Save,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

function MealSuggestionsContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedMealName, setSelectedMealName] = useState<string | null>(null);
  const [targetMacros, setTargetMacros] = useState<{
    mealName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

  const [fullProfileData, setFullProfileData] =
    useState<FullProfileType | null>(null);
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const [suggestions, setSuggestions] = useState<
    SuggestMealsForMacrosOutput['suggestions']
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const preferenceForm = useForm<MealSuggestionPreferencesValues>({
    resolver: zodResolver(MealSuggestionPreferencesSchema),
    defaultValues: {
      preferredDiet: undefined,
      preferredCuisines: [],
      dispreferredCuisines: [],
      preferredIngredients: [],
      dispreferredIngredients: [],
      allergies: [],
      preferredMicronutrients: [],
      medicalConditions: [],
      medications: [],
    },
  });

  useEffect(() => {
    // Priority 1: Handle direct navigation with URL params
    const mealNameParam = searchParams.get('mealName');
    const caloriesParam = searchParams.get('calories');
    const proteinParam = searchParams.get('protein');
    const carbsParam = searchParams.get('carbs');
    const fatParam = searchParams.get('fat');

    if (
      mealNameParam &&
      mealNames.includes(mealNameParam) &&
      caloriesParam &&
      proteinParam &&
      carbsParam &&
      fatParam
    ) {
      const newTargets = {
        mealName: mealNameParam,
        calories: parseFloat(caloriesParam),
        protein: parseFloat(proteinParam),
        carbs: parseFloat(carbsParam),
        fat: parseFloat(fatParam),
      };
      setSelectedMealName(mealNameParam);
      setTargetMacros(newTargets);
      setIsDemoMode(false);
      setSuggestions([]);
      setError(null);
      sessionStorage.removeItem('mealSuggestionsCache'); // Clear cache when navigating via params
    } else {
      // Priority 2: Restore from session storage if no URL params
      try {
        const cachedData = sessionStorage.getItem('mealSuggestionsCache');
        if (cachedData) {
          const { mealName, suggestions: cachedSuggestions, targetMacros: cachedMacros } = JSON.parse(cachedData);
          setSelectedMealName(mealName);
          setTargetMacros(cachedMacros);
          setSuggestions(cachedSuggestions);
        }
      } catch (e) {
        console.error("Could not load suggestions from session storage", e);
        sessionStorage.removeItem('mealSuggestionsCache');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.uid) {
      setIsLoadingProfile(true);
      const userDocRef = doc(db, 'users', user.uid);
      getDoc(userDocRef)
        .then((docSnap: DocumentSnapshot<DocumentData>) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as FullProfileType;
            setFullProfileData(data);
            if (data) {
              preferenceForm.reset({
                preferredDiet: data.preferredDiet ?? undefined,
                preferredCuisines: data.preferredCuisines ?? [],
                dispreferredCuisines: data.dispreferredCuisines ?? [],
                preferredIngredients: data.preferredIngredients ?? [],
                dispreferredIngredients: data.dispreferredIngredients ?? [],
                allergies: data.allergies ?? [],
                preferredMicronutrients: data.preferredMicronutrients ?? [],
                medicalConditions: data.medicalConditions ?? [],
                medications: data.medications ?? [],
              });
            }
          }
        })
        .catch((err: unknown) => {
          const typedError = err as Error;
          toast({
            title: 'Error Loading Profile',
            description:
              typedError.message || 'Could not load your profile preferences.',
            variant: 'destructive',
          });
        })
        .finally(() => setIsLoadingProfile(false));
    } else {
      setIsLoadingProfile(false);
    }
  }, [user, toast, preferenceForm]);

  const calculateTargetsForSelectedMeal = useCallback(() => {
    if (!selectedMealName) {
      setTargetMacros(null);
      setIsDemoMode(false);
      return;
    }
    setError(null);
    setSuggestions([]);

    const profileToUse = fullProfileData;

    let dailyTotals: { calories: number; protein: number; carbs: number; fat: number } | null = null;

    if (profileToUse?.smartPlannerData?.results?.finalTargetCalories) {
      const smartResults = profileToUse.smartPlannerData.results;
      dailyTotals = {
        calories: smartResults.finalTargetCalories || 0,
        protein: smartResults.proteinGrams || 0,
        carbs: smartResults.carbGrams || 0,
        fat: smartResults.fatGrams || 0,
      };
    } else if (
      profileToUse?.age &&
      profileToUse?.gender &&
      profileToUse?.current_weight &&
      profileToUse?.height_cm &&
      profileToUse?.activityLevel &&
      profileToUse?.dietGoalOnboarding
    ) {
      const estimatedTargets = calculateEstimatedDailyTargets({
        age: profileToUse.age,
        gender: profileToUse.gender,
        currentWeight: profileToUse.current_weight,
        height: profileToUse.height_cm,
        activityLevel: profileToUse.activityLevel,
        dietGoal: profileToUse.dietGoalOnboarding,
      });

      if (estimatedTargets.finalTargetCalories) {
        dailyTotals = {
          calories: estimatedTargets.finalTargetCalories,
          protein: estimatedTargets.proteinGrams || 0,
          carbs: estimatedTargets.carbGrams || 0,
          fat: estimatedTargets.fatGrams || 0,
        };
      }
    }

    if (dailyTotals && selectedMealName) {
      const customDistributions = profileToUse?.mealDistributions;
      const mealDistribution =
        customDistributions?.find((d) => d.mealName === selectedMealName) ||
        defaultMacroPercentages[selectedMealName];

      if (mealDistribution) {
        setTargetMacros({
          mealName: selectedMealName,
          calories: Math.round(dailyTotals.calories * ((mealDistribution.calories_pct || 0) / 100)),
          protein: Math.round(dailyTotals.protein * ((mealDistribution.protein_pct || 0) / 100)),
          carbs: Math.round(dailyTotals.carbs * ((mealDistribution.carbs_pct || 0) / 100)),
          fat: Math.round(dailyTotals.fat * ((mealDistribution.fat_pct || 0) / 100)),
        });
        setIsDemoMode(false);
        return;
      }
    }

    const exampleTargets = {
      mealName: selectedMealName,
      calories: 500,
      protein: 30,
      carbs: 60,
      fat: 20,
    };
    setTargetMacros(exampleTargets);
    setIsDemoMode(true);
    toast({
      title: 'Profile Incomplete or Demo',
      description: `Showing example targets for ${selectedMealName}. Please complete your profile for personalized calculations.`,
      duration: 7000,
      variant: 'default',
    });
  }, [selectedMealName, fullProfileData, toast]);

  useEffect(() => {
    if (selectedMealName && !targetMacros && !isLoadingProfile) {
      calculateTargetsForSelectedMeal();
    }
  }, [
    selectedMealName,
    targetMacros,
    isLoadingProfile,
    calculateTargetsForSelectedMeal,
  ]);

  const handleMealSelectionChange = (mealValue: string) => {
    setSelectedMealName(mealValue);
    setTargetMacros(null);
    setSuggestions([]);
    setError(null);
    setIsDemoMode(false);
    sessionStorage.removeItem('mealSuggestionsCache');
  };

  const handleSavePreferences = async () => {
    if (!user?.uid) {
      toast({ title: 'Error', description: 'You must be logged in to save preferences.', variant: 'destructive' });
      return;
    }
    setIsSavingPreferences(true);
    try {
      const currentPreferences = preferenceForm.getValues();
      const userProfileRef = doc(db, 'users', user.uid);
      
      await setDoc(userProfileRef, preprocessDataForFirestore(currentPreferences), { merge: true });

      toast({ title: 'Success', description: 'Your preferences have been saved.' });
    } catch (error: unknown) {
      const typedError = error as Error;
      toast({ title: 'Save Failed', description: typedError.message || 'Could not save your preferences.', variant: 'destructive' });
      console.error("Error saving preferences:", error);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!targetMacros) {
      toast({
        title: 'Error',
        description: 'Target macros not loaded. Select a meal first.',
        variant: 'destructive',
      });
      return;
    }
    if (
      isLoadingProfile &&
      !isDemoMode &&
      (!fullProfileData || Object.keys(fullProfileData).length === 0)
    ) {
      toast({
        title: 'Please wait',
        description: 'User profile is still loading.',
        variant: 'default',
      });
      return;
    }

    setIsLoadingAiSuggestions(true);
    setSuggestions([]);
    setError(null);

    const currentPreferences = preferenceForm.getValues();

    const aiInput: SuggestMealsForMacrosInput = {
      mealName: targetMacros.mealName,
      targetCalories: targetMacros.calories,
      targetProteinGrams: targetMacros.protein,
      targetCarbsGrams: targetMacros.carbs,
      targetFatGrams: targetMacros.fat,
      age: !isDemoMode ? fullProfileData?.age ?? undefined : undefined,
      gender: !isDemoMode ? fullProfileData?.gender ?? undefined : undefined,
      activityLevel: !isDemoMode ? fullProfileData?.activityLevel ?? undefined : undefined,
      dietGoal: !isDemoMode ? fullProfileData?.dietGoalOnboarding ?? undefined : undefined,
      preferredDiet: currentPreferences.preferredDiet,
      preferredCuisines: currentPreferences.preferredCuisines,
      dispreferredCuisines: currentPreferences.dispreferredCuisines,
      preferredIngredients: currentPreferences.preferredIngredients,
      dispreferredIngredients: currentPreferences.dispreferredIngredients,
      allergies: currentPreferences.allergies,
      medicalConditions: currentPreferences.medicalConditions,
      medications: currentPreferences.medications,
    };

    Object.keys(aiInput).forEach(
      (key) =>
        aiInput[key as keyof SuggestMealsForMacrosInput] === undefined &&
        delete aiInput[key as keyof SuggestMealsForMacrosInput]
    );

    try {
      const result = await suggestMealsForMacros(aiInput);
      if (result && result.suggestions) {
        setSuggestions(result.suggestions);
        try {
          sessionStorage.setItem('mealSuggestionsCache', JSON.stringify({
            mealName: targetMacros.mealName,
            suggestions: result.suggestions,
            targetMacros: targetMacros
          }));
        } catch (e) {
          console.error("Could not save suggestions to session storage", e);
        }
      } else {
        setError('AI did not return valid suggestions.');
        toast({
          title: 'AI Response Error',
          description: 'Received an unexpected response from the AI.',
          variant: 'destructive',
        });
      }
    } catch (err: unknown) {
      const typedError = err as Error;
      const errorMessage = getAIApiErrorMessage(typedError);
      setError(errorMessage);
      toast({
        title: 'AI Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      setIsLoadingAiSuggestions(false);
    }
  };

  const renderPreferenceTextarea = (
    fieldName: keyof MealSuggestionPreferencesValues,
    label: string,
    placeholder: string
  ) => (
    <FormField
      control={preferenceForm.control}
      name={fieldName}
      render={({ field }) => {
        const displayValue = Array.isArray(field.value)
          ? field.value.join(',')
          : field.value || '';
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div>
                <Textarea
                  placeholder={placeholder}
                  value={displayValue}
                  onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className='h-10 resize-none'
                  onWheel={(e) =>
                    (e.currentTarget as HTMLTextAreaElement).blur()
                  }
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

  const showContentBelowSelection =
    selectedMealName && targetMacros && !isLoadingProfile;

  return (
    <div className='space-y-6'>
      <Card className='shadow-xl'>
        <CardHeader>
          <CardTitle className='text-3xl font-bold flex items-center'>
            <ChefHat className='mr-3 h-8 w-8 text-primary' />
            AI Meal Suggestions
          </CardTitle>
          <CardDescription>
            Select a meal, adjust preferences if needed, and get AI-powered
            ideas tailored to your macronutrient targets.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <Accordion
            type='single'
            collapsible
            className='w-full'
            defaultValue='preferences'
          >
            <AccordionItem value='preferences'>
              <AccordionTrigger>
                <div className='flex items-center gap-2'>
                  <Settings className='h-5 w-5 text-primary' />
                  <span className='text-lg font-semibold'>
                    1. Adjust Preferences for this Suggestion (Optional)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Form {...preferenceForm}>
                  <form className='space-y-6 pt-4'>
                    <Card>
                      <CardHeader>
                        <CardTitle className='text-xl'>
                          Dietary Preferences & Restrictions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className='grid md:grid-cols-2 gap-x-6 gap-y-4'>
                        <FormField
                          control={preferenceForm.control}
                          name='preferredDiet'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Diet</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value ?? undefined}
                              >
                                <FormControl>
                                  <div>
                                    <SelectTrigger>
                                      <SelectValue placeholder='Select preferred diet' />
                                    </SelectTrigger>
                                  </div>
                                </FormControl>
                                <SelectContent>
                                  {preferredDiets.map((pd) => (
                                    <SelectItem key={pd.value} value={pd.value}>
                                      {pd.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {renderPreferenceTextarea(
                          'allergies',
                          'Allergies (comma-separated)',
                          'e.g., Peanuts, Shellfish'
                        )}
                        {renderPreferenceTextarea(
                          'preferredCuisines',
                          'Preferred Cuisines',
                          'e.g., Italian, Mexican'
                        )}
                        {renderPreferenceTextarea(
                          'dispreferredCuisines',
                          'Dispreferred Cuisines',
                          'e.g., Thai, French'
                        )}
                        {renderPreferenceTextarea(
                          'preferredIngredients',
                          'Preferred Ingredients',
                          'e.g., Chicken, Broccoli'
                        )}
                        {renderPreferenceTextarea(
                          'dispreferredIngredients',
                          'Dispreferred Ingredients',
                          'e.g., Tofu, Mushrooms'
                        )}
                        {renderPreferenceTextarea(
                          'preferredMicronutrients',
                          'Targeted Micronutrients (Optional)',
                          'e.g., Vitamin D, Iron'
                        )}
                        {renderPreferenceTextarea(
                          'medicalConditions',
                          'Medical Conditions (Optional)',
                          'e.g., Diabetes, Hypertension'
                        )}
                        {renderPreferenceTextarea(
                          'medications',
                          'Medications (Optional)',
                          'e.g., Metformin, Lisinopril'
                        )}
                      </CardContent>
                    </Card>
                  </form>
                </Form>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSavePreferences} disabled={isSavingPreferences}>
                    {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Preferences
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className='space-y-2'>
            <Label
              htmlFor='meal-select'
              className='text-lg font-semibold text-primary'
            >
              2. Choose a Meal:
            </Label>
            <Select
              onValueChange={handleMealSelectionChange}
              value={selectedMealName || ''}
            >
              <SelectTrigger
                id='meal-select'
                className='w-full md:w-1/2 lg:w-1/3'
              >
                <SelectValue placeholder='Select a meal...' />
              </SelectTrigger>
              <SelectContent>
                {mealNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoadingProfile && !selectedMealName && (
            <div className='flex justify-center items-center py-4'>
              <Loader2 className='h-6 w-6 animate-spin text-primary' />
              <p className='ml-2'>Loading profile data...</p>
            </div>
          )}

          {selectedMealName && !targetMacros && isLoadingProfile && (
            <div className='flex justify-center items-center py-4'>
              <Loader2 className='h-6 w-6 animate-spin text-primary' />
              <p className='ml-2'>
                Loading profile and calculating targets for {selectedMealName}
                ...
              </p>
            </div>
          )}

          {showContentBelowSelection && (
            <>
              <div className='p-4 border rounded-md bg-muted/50'>
                <h3 className='text-lg font-semibold mb-2 text-primary'>
                  Target Macros for {targetMacros.mealName}:
                </h3>
                {isDemoMode && (
                  <p className='text-sm text-amber-600 dark:text-amber-400 mb-2'>
                    (Displaying example targets. Complete your profile via
                    Onboarding or Smart Calorie Planner for personalized
                    calculations.)
                  </p>
                )}
                <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                  <p>
                    <span className='font-medium'>Calories:</span>{' '}
                    {targetMacros.calories.toFixed(0)} kcal
                  </p>
                  <p>
                    <span className='font-medium'>Protein:</span>{' '}
                    {targetMacros.protein.toFixed(1)} g
                  </p>
                  <p>
                    <span className='font-medium'>Carbs:</span>{' '}
                    {targetMacros.carbs.toFixed(1)} g
                  </p>
                  <p>
                    <span className='font-medium'>Fat:</span>{' '}
                    {targetMacros.fat.toFixed(1)} g
                  </p>
                </div>
              </div>

              <Button
                onClick={handleGetSuggestions}
                disabled={
                  isLoadingAiSuggestions || (isLoadingProfile && !isDemoMode)
                }
                size='lg'
                className='w-full md:w-auto'
              >
                {isLoadingAiSuggestions ? (
                  <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                ) : (
                  <Sparkles className='mr-2 h-5 w-5' />
                )}
                {isLoadingProfile && !isDemoMode && !isLoadingAiSuggestions
                  ? 'Loading Profile...'
                  : isLoadingAiSuggestions
                  ? 'Getting Suggestions...'
                  : '3. Get AI Meal Suggestions'}
              </Button>

              {error && (
                <p className='text-destructive mt-4'>
                  <AlertTriangle className='inline mr-1 h-4 w-4' />
                  {error}
                </p>
              )}
            </>
          )}

          {!selectedMealName && !isLoadingProfile && (
            <div className='text-center py-6 text-muted-foreground'>
              <p>Please select a meal type above to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoadingAiSuggestions && (
        <div className='flex flex-col items-center justify-center py-8 space-y-2'>
          <Loader2 className='h-10 w-10 animate-spin text-primary' />
          <p className='text-lg text-muted-foreground'>
            Fetching creative meal ideas for your{' '}
            {targetMacros?.mealName || 'meal'}...
          </p>
        </div>
      )}

      {suggestions.length > 0 && !isLoadingAiSuggestions && (
        <div className='space-y-4'>
          <h2 className='text-2xl font-semibold text-primary mt-8 mb-4'>
            Here are some ideas for your {targetMacros?.mealName || 'meal'}:
          </h2>
          {suggestions.map((suggestion, index) => (
            <Card
              key={index}
              className='shadow-md hover:shadow-lg transition-shadow'
            >
              <CardHeader>
                <CardTitle className='text-xl font-semibold'>
                  {suggestion.mealTitle}
                </CardTitle>
                <CardDescription className='text-sm'>
                  {suggestion.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className='font-medium text-md mb-2 text-primary'>
                  Ingredients:
                </h4>
                <ScrollArea className='w-full mb-4'>
                  <Table className='min-w-[500px]'>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-[30%]'>Ingredient</TableHead>
                        <TableHead className='text-right'>Amount</TableHead>
                        <TableHead className='text-right'>Unit</TableHead>
                        <TableHead className='text-right'>Calories</TableHead>
                        <TableHead className='text-right'>
                          Macros (P/C/F)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestion.ingredients.map((ing, i) => (
                        <TableRow key={i}>
                          <TableCell className='font-medium py-1.5'>
                            {ing.name}
                          </TableCell>
                          <TableCell className='text-right py-1.5'>
                            {ing.amount}
                          </TableCell>
                          <TableCell className='text-right py-1.5'>
                            {ing.unit}
                          </TableCell>
                          <TableCell className='text-right py-1.5'>
                            {ing.calories.toFixed(0)}
                          </TableCell>
                          <TableCell className='text-right py-1.5 whitespace-nowrap'>
                            {ing.macrosString}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation='horizontal' />
                </ScrollArea>

                <div className='text-sm font-semibold p-2 border-t border-muted-foreground/20 bg-muted/40 rounded-b-md'>
                  Total: {suggestion.totalCalories.toFixed(0)} kcal | Protein:{' '}
                  {suggestion.totalProtein.toFixed(1)}g | Carbs:{' '}
                  {suggestion.totalCarbs.toFixed(1)}g | Fat:{' '}
                  {suggestion.totalFat.toFixed(1)}g
                </div>

                {suggestion.instructions && (
                  <div className='mt-4'>
                    <h4 className='font-medium text-md mb-1 text-primary'>
                      Instructions:
                    </h4>
                    <p className='text-sm text-muted-foreground whitespace-pre-line'>
                      {suggestion.instructions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MealSuggestionsPage() {
  return (
    <Suspense
      fallback={
        <div className='flex justify-center items-center h-screen'>
          <Loader2 className='h-12 w-12 animate-spin text-primary' />
          <p className='ml-4 text-lg'>Loading...</p>
        </div>
      }
    >
      <MealSuggestionsContent />
    </Suspense>
  );
}