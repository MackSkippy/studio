'use server';
/**
 * @fileOverview Refines a travel itinerary based on user feedback.
 *
 * - refineTravelItinerary - A function that refines a travel itinerary based on user feedback.
 * - RefineTravelItineraryInput - The input type for the refineTravelItinerary function.
 * - RefineTravelItineraryOutput - The return type for the refineTravelItinerary function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const RefineTravelItineraryInputSchema = z.object({
  itinerary: z.string().describe('The current travel itinerary.'),
  feedback: z.string().describe('The user feedback on the itinerary.'),
  preferences: z.string().optional().describe('Any specific user preferences to consider.'),
});
export type RefineTravelItineraryInput = z.infer<typeof RefineTravelItineraryInputSchema>;

const RefineTravelItineraryOutputSchema = z.object({
  refinedItinerary: z.string().describe('The refined travel itinerary based on the feedback.'),
});
export type RefineTravelItineraryOutput = z.infer<typeof RefineTravelItineraryOutputSchema>;

export async function refineTravelItinerary(input: RefineTravelItineraryInput): Promise<RefineTravelItineraryOutput> {
  return refineTravelItineraryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'refineTravelItineraryPrompt',
  input: {
    schema: z.object({
      itinerary: z.string().describe('The current travel itinerary.'),
      feedback: z.string().describe('The user feedback on the itinerary.'),
      preferences: z.string().optional().describe('Any specific user preferences to consider.'),
    }),
  },
  output: {
    schema: z.object({
      refinedItinerary: z.string().describe('The refined travel itinerary based on the feedback.'),
    }),
  },
  prompt: `You are a travel expert refining a travel itinerary based on user feedback.

  Current Itinerary: {{{itinerary}}}
  User Feedback: {{{feedback}}}
  User Preferences: {{{preferences}}}

  Please refine the itinerary based on the feedback and preferences provided.  Return a complete itinerary.
  Refined Itinerary: `,
});

const refineTravelItineraryFlow = ai.defineFlow<
  typeof RefineTravelItineraryInputSchema,
  typeof RefineTravelItineraryOutputSchema
>({
  name: 'refineTravelItineraryFlow',
  inputSchema: RefineTravelItineraryInputSchema,
  outputSchema: RefineTravelItineraryOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
}
);
