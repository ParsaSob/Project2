
'use server';

import { ai } from '@/ai/genkit';
import {
  SupportChatbotInputSchema,
  SupportChatbotOutputSchema,
  type SupportChatbotInput,
  type SupportChatbotOutput,
} from '@/lib/schemas';

// Main entry function
export async function handleSupportQuery(
  input: SupportChatbotInput
): Promise<SupportChatbotOutput> {
  return supportChatbotFlow(input);
}

// AI Prompt
const prompt = ai.definePrompt({
  name: 'supportChatbotPrompt',
  input: { schema: SupportChatbotInputSchema },
  output: { schema: SupportChatbotOutputSchema },
  prompt: `You are a friendly and helpful support chatbot for "NutriPlan", a web application for personalized nutrition and meal planning.

User Query: {{{userQuery}}}

Your primary goal is to provide direct, helpful answers about NutriPlan's features ONLY.

NutriPlan Features and their Descriptions (for your reference):
- Dashboard: Provides an overview of your progress, key metrics, and quick access to important sections.
- Profile: Allows you to manage your personal medical information, exercise preferences, and physical metrics.
- Smart Calorie Planner: Helps you set personalized daily calorie and macronutrient targets based on your goals.
- Macro Splitter: Enables you to effectively distribute your daily macronutrients across individual meals.
- Meal Suggestions: Offers AI-powered meal ideas tailored to your preferences and goals.
- Current Meal Plan: Lets you view, manage, and edit your personalized weekly meal plan.
- AI Meal Plan: Generates a full, AI-optimized weekly meal plan based on your profile.

Output Format Instructions:
- Your response MUST be a JSON object.
- This JSON object MUST contain ONLY one exact property: "botResponse".
    - "botResponse": string — The generated response based on the conditional logic above.

⚠️ Important Rules:
- Use the exact field name and spelling provided: "botResponse".
- DO NOT add any extra fields, properties, or keys to the JSON object.
- DO NOT include any introductory text, concluding remarks, markdown formatting (like json), or any other commentary outside of the pure JSON object.
- Respond clearly, concisely, and helpfully.

Respond ONLY with the pure JSON object that strictly matches the following TypeScript type:
{ botResponse: string; }`,
});

// Genkit Flow
const supportChatbotFlow = ai.defineFlow(
  {
    name: 'supportChatbotFlow',
    inputSchema: SupportChatbotInputSchema,
    outputSchema: SupportChatbotOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      return {
        botResponse:
          "I'm sorry, I couldn't process your request at the moment. Please try again.",
      };
    }

    const validationResult = SupportChatbotOutputSchema.safeParse(output);
    if (!validationResult.success) {
      console.error('AI output validation error:', validationResult.error.flatten());
      // Return a user-friendly error, but still in the expected format
      return {
        botResponse: "I'm sorry, there was an issue with the response format. Please try rephrasing your question.",
      };
    }

    return validationResult.data;
  }
);
