'use server';

/**
 * AI-powered NutriPlan Support Chatbot — Fully optimized for Genkit
 */

import { ai } from '@/ai/genkit';
// import { geminiPro } from '@genkit-ai/googleai';

// Types

export interface SupportChatbotInput {
  userQuery: string;
}

export interface SupportChatbotOutput {
  botResponse: string;
}

// Main entry function

export async function handleSupportQuery(
  input: SupportChatbotInput
): Promise<SupportChatbotOutput> {
  const res = await fetch('/api/openai-support-chatbot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to get chatbot response');
  return await res.json();
}

// AI Prompt

const prompt = ai.definePrompt({
  name: 'supportChatbotPrompt',
  // model: geminiPro, // TODO: Replace with OpenAI call
  input: { type: 'json' },
  output: { type: 'json' },
  prompt: `You are a friendly and helpful support chatbot for "NutriPlan", a web application for personalized nutrition and meal planning.

{{{input}}}

Your role:
- Only answer questions about website functionality and features.
- Do not give nutritional, medical, or diet advice.
- If asked for such advice, politely redirect the user to consult a professional.

NutriPlan features you can assist with:
- Dashboard
- Profile (medical info, exercise preferences, physical metrics)
- Smart Calorie Planner (calorie/macro targets)
- Macro Splitter (distribute daily macros across meals)
- Meal Suggestions (AI-powered meal ideas)
- Current Meal Plan (manage/edit weekly meal plan)
- AI Meal Plan (generate full AI-optimized weekly plan)

Instructions:
- Respond clearly, concisely, and helpfully.
- Guide the user on how to find or perform tasks.
- Only return valid JSON in SupportChatbotOutput format.`
});

// Genkit Flow

const supportChatbotFlow = ai.defineFlow(
  {
    name: 'supportChatbotFlow',
    inputSchema: undefined,
    outputSchema: undefined,
  },
  async (input: SupportChatbotInput): Promise<SupportChatbotOutput> => {
    const { output } = await prompt(input);
    if (!output) {
      return { botResponse: "I'm sorry, I couldn't process your request at the moment. Please try again." };
    }
    return output as SupportChatbotOutput;
  }
);
