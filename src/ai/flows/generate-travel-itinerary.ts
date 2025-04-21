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

const AccommodationSchema = z.object({
  name: z.string().describe('The name of the accommodation.'),
  location: z.string().describe('The location of the accommodation.'),
  price: z.number().describe('The price of the accommodation.'),
  rating: z.number().describe('The rating of the accommodation.'),
  url: z.string().describe('The URL of the accommodation.'),
});

const TransportationSchema = z.object({
  type: z.string().describe('The type of transportation.'),
  departureLocation: z.string().describe('The departure location.'),
  arrivalLocation: z.string().describe('The arrival location.'),
  departureTime: z.string().describe('The departure time.'),
  arrivalTime: z.string().describe('The arrival time.'),
  price: z.number().describe('The price.'),
  url: z.string().describe('The URL for booking.'),
});

const ItineraryItemSchema = z.object({
  day: z.string().describe('The day of the itinerary.'),
  description: z.string().describe('The description of the day\'s activities.'),
  accommodation: AccommodationSchema.optional().describe('Accommodation details for the day.'),
  transportation: TransportationSchema.optional().describe('Transportation details for the day.'),
});

const GenerateTravelItineraryOutputSchema = z.object({
  itinerary: z.array(ItineraryItemSchema).describe('A personalized travel itinerary with accommodation and transportation.'),
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
      itinerary: z.array(ItineraryItemSchema).describe('A personalized travel itinerary in JSON format.'),
    }),
  },
  prompt: `You are an expert travel planner. Based on the user's preferences, generate a personalized travel itinerary in JSON format. The itinerary should include a day-by-day plan, accommodation recommendations, and transportation options for each day. Ensure that the output is a valid JSON array.
Here is the schema:
${JSON.stringify(ItineraryItemSchema.shape, null, 2)}

User Preferences:
Destination: {{{destination}}}
Departure Location: {{{departureLocation}}}
Dates: {{{dates}}}
Specific Locations: {{{specificLocations}}}
Desired Activities: {{{desiredActivities}}}
Feedback: {{{feedback}}}

Itinerary (JSON format):`,
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
