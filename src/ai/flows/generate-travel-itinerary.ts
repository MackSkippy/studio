'use server';
/**
 * @fileOverview Generates a personalized travel itinerary based on user preferences.
 *
 * - generateTravelItinerary - A function that generates a travel itinerary.
 * - GenerateTravelItineraryInput - The input type for the generateTravelItinerary function.
 * - GenerateTravelItineraryOutput - The return type for the generateTravelItinerary function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateTravelItineraryInputSchema = z.object({
  destination: z.string().describe('The desired travel destination.'),
  departureLocation: z.string().describe('The user current location.'),
  dates: z.string().describe('The travel dates or date range.'),
  specificLocations: z
    .string()
    .optional()
    .describe('Specific locations within the destination (e.g., specific cities or regions).'),
  desiredActivities: z.string().describe('Desired activities at the location(s).'),
  feedback: z.string().optional().describe('User feedback on previous itineraries.'),
});
export type GenerateTravelItineraryInput = z.infer<typeof GenerateTravelItineraryInputSchema>;

const GenerateTravelItineraryOutputSchema = z.object({
  itinerary: z.string().describe('A personalized travel itinerary.'),
  accommodationRecommendations: z
    .string()
    .describe('Recommended accommodations (neighborhoods/hotels).'),
  transportationRecommendations:
    z.string().describe('Recommended transportation options (flights/trains).'),
});
export type GenerateTravelItineraryOutput = z.infer<typeof GenerateTravelItineraryOutputSchema>;

export async function generateTravelItinerary(
  input: GenerateTravelItineraryInput
): Promise<GenerateTravelItineraryOutput> {
  return generateTravelItineraryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTravelItineraryPrompt',
  input: {
    schema: z.object({
      destination: z.string().describe('The desired travel destination.'),
      departureLocation: z.string().describe('The user current location.'),
      dates: z.string().describe('The travel dates or date range.'),
      specificLocations:
        z.string().optional().describe('Specific locations within the destination.'),
      desiredActivities: z.string().describe('Desired activities at the location(s).'),
      feedback: z.string().optional().describe('User feedback on previous itineraries.'),
    }),
  },
  output: {
    schema: z.object({
      itinerary: z.string().describe('A personalized travel itinerary.'),
      accommodationRecommendations:
        z.string().describe('Recommended accommodations (neighborhoods/hotels).'),
      transportationRecommendations:
        z.string().describe('Recommended transportation options (flights/trains).'),
    }),
  },
  prompt: `You are an expert travel planner. Based on the user's preferences, generate a personalized travel itinerary, recommend accommodations, and suggest transportation options.\n\nUser Preferences:\nDestination: {{{destination}}}\nDeparture Location: {{{departureLocation}}}\nDates: {{{dates}}}\nSpecific Locations: {{{specificLocations}}}\nDesired Activities: {{{desiredActivities}}}\nFeedback: {{{feedback}}}\n\nItinerary:`,
});

const generateTravelItineraryFlow = ai.defineFlow<
  typeof GenerateTravelItineraryInputSchema,
  typeof GenerateTravelItineraryOutputSchema
>(
  {
    name: 'generateTravelItineraryFlow',
    inputSchema: GenerateTravelItineraryInputSchema,
    outputSchema: GenerateTravelItineraryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
