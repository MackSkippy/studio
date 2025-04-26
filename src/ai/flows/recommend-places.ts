'use server';

/**
 * @fileOverview Recommends specific places (shops, sites, businesses) based on destination and activity preferences.
 *
 * - recommendPlaces - A function that handles the recommendation process.
 * - RecommendPlacesInput - The input type for the recommendPlaces function.
 * - RecommendPlacesOutput - The return type for the recommendPlaces function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'zod';

const RecommendPlacesInputSchema = z.object({
  destination: z.string().describe('The destination for the trip.'),
  arrivalCity: z.string().describe('The arrival city for the trip.'),
  departureCity: z.string().describe('The departure city for the trip.'),
  activityPreferences: z.string().describe('The user\'s preferred activities.'),
});
export type RecommendPlacesInput = z.infer<typeof RecommendPlacesInputSchema>;

const RecommendedPlaceSchema = z.object({
  name: z.string().describe('The name of the recommended place.'),
  location: z.string().describe('The city or neighborhood where the place is located.'),
  type: z.string().describe('The type of place (e.g., shop, site, restaurant).'),
  description: z.string().optional().describe('A brief description of the place.'),
});

const RecommendPlacesOutputSchema = z.array(RecommendedPlaceSchema).describe('A list of recommended places.');
export type RecommendPlacesOutput = z.infer<typeof RecommendPlacesOutputSchema>;

export async function recommendPlaces(input: RecommendPlacesInput): Promise<RecommendPlacesOutput> {
  return recommendPlacesFlow(input);
}

const recommendPlacesPrompt = ai.definePrompt({
  name: 'recommendPlacesPrompt',
  input: {
    schema: z.object({
      destination: z.string().describe('The destination for the trip.'),
      arrivalCity: z.string().describe('The arrival city for the trip.'),
      departureCity: z.string().describe('The departure city for the trip.'),
      activityPreferences: z.string().describe('The user\'s preferred activities.'),
    }),
  },
  output: {
    schema: z.array(RecommendedPlaceSchema),
  },
  prompt: `You are a travel expert recommending specific places to visit based on the user's destination and activity preferences.

Destination: {{{destination}}}
Arrival City: {{{arrivalCity}}}
Departure City: {{{departureCity}}}
Activity Preferences: {{{activityPreferences}}}

Based on these preferences, recommend specific shops, sites, or businesses that the user might enjoy. Present these results by location, and please provide a brief description of each recommendation.

Return a JSON array of objects with the following keys: name, location, type, description.`,
});

const recommendPlacesFlow = ai.defineFlow<
  typeof RecommendPlacesInputSchema,
  typeof RecommendPlacesOutputSchema
>({
  name: 'recommendPlacesFlow',
  inputSchema: RecommendPlacesInputSchema,
  outputSchema: RecommendPlacesOutputSchema,
},
async input => {
  const {output} = await recommendPlacesPrompt(input);
  return output!;
}
);
