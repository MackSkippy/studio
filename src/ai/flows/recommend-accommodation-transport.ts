// src/ai/flows/recommend-accommodation-transport.ts
'use server';
/**
 * @fileOverview Recommends accommodations and transportation options based on itinerary and user preferences.
 *
 * - recommendAccommodationTransport - A function that handles the recommendation process.
 * - RecommendAccommodationTransportInput - The input type for the recommendAccommodationTransport function.
 * - RecommendAccommodationTransportOutput - The return type for the recommendAccommodationTransport function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {getAccommodations} from '@/services/accommodation';
import {getTransportationOptions} from '@/services/transportation';

const RecommendAccommodationTransportInputSchema = z.object({
  destination: z.string().describe('The destination for the trip.'),
  departureLocation: z.string().describe('The departure location for the trip.'),
  departureTime: z.string().describe('The departure time for the trip.'),
  itinerary: z.string().describe('The generated itinerary to base recommendations on.'),
  preferences: z.string().describe('The user preferences for accommodations and transportation.'),
});
export type RecommendAccommodationTransportInput = z.infer<typeof RecommendAccommodationTransportInputSchema>;

const AccommodationSchema = z.object({
  name: z.string(),
  location: z.string(),
  price: z.number(),
  rating: z.number(),
  url: z.string(),
  imageUrl: z.string(),
});
export type Accommodation = z.infer<typeof AccommodationSchema>;

const TransportationOptionSchema = z.object({
  type: z.string(),
  departureLocation: z.string(),
  arrivalLocation: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  price: z.number(),
  url: z.string(),
});
export type TransportationOption = z.infer<typeof TransportationOptionSchema>;

const RecommendAccommodationTransportOutputSchema = z.object({
  accommodations: z.array(AccommodationSchema).describe('Recommended accommodations.'),
  transportationOptions: z.array(TransportationOptionSchema).describe('Recommended transportation options.'),
});
export type RecommendAccommodationTransportOutput = z.infer<typeof RecommendAccommodationTransportOutputSchema>;

export async function recommendAccommodationTransport(input: RecommendAccommodationTransportInput): Promise<RecommendAccommodationTransportOutput> {
  return recommendAccommodationTransportFlow(input);
}

const recommendAccommodationTransportPrompt = ai.definePrompt({
  name: 'recommendAccommodationTransportPrompt',
  input: {
    schema: z.object({
      destination: z.string().describe('The destination for the trip.'),
      departureLocation: z.string().describe('The departure location for the trip.'),
      departureTime: z.string().describe('The departure time for the trip.'),
      itinerary: z.string().describe('The generated itinerary to base recommendations on.'),
      preferences: z.string().describe('The user preferences for accommodations and transportation.'),
      accommodations: z.array(AccommodationSchema).describe('Available accommodations.'),
      transportationOptions: z.array(TransportationOptionSchema).describe('Available transportation options.'),
    }),
  },
  output: {
    schema: RecommendAccommodationTransportOutputSchema,
  },
  prompt: `Based on the following itinerary, user preferences, available accommodations, and transportation options, recommend the most suitable accommodations and transportation options for the user.

Itinerary: {{{itinerary}}}
User Preferences: {{{preferences}}}
Available Accommodations: {{#each accommodations}}- Name: {{{name}}}, Location: {{{location}}}, Price: {{{price}}}, Rating: {{{rating}}}, URL: {{{url}}}, Image URL: {{{imageUrl}}}\n{{/each}}
Available Transportation Options: {{#each transportationOptions}}- Type: {{{type}}}, Departure Location: {{{departureLocation}}}, Arrival Location: {{{arrivalLocation}}}, Departure Time: {{{departureTime}}}, Arrival Time: {{{arrivalTime}}}, Price: {{{price}}}, URL: {{{url}}}\n{{/each}}`,
});

const recommendAccommodationTransportFlow = ai.defineFlow<
  typeof RecommendAccommodationTransportInputSchema,
  typeof RecommendAccommodationTransportOutputSchema
>({
  name: 'recommendAccommodationTransportFlow',
  inputSchema: RecommendAccommodationTransportInputSchema,
  outputSchema: RecommendAccommodationTransportOutputSchema,
},
async input => {
  const accommodations = await getAccommodations(input.destination);
  const transportationOptions = await getTransportationOptions(input.departureLocation, input.destination, input.departureTime);

  const {output} = await recommendAccommodationTransportPrompt({
    ...input,
    accommodations,
    transportationOptions,
  });
  return output!;
});
