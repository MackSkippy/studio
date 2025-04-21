'use server';
/**
 * @fileOverview Generates a personalized travel plan based on user preferences.
 *
 * - generateTravelPlan - A function that generates a travel plan.
 * - GenerateTravelPlanInput - The input type for the generateTravelPlan function.
 * - GenerateTravelPlanOutput - The return type for the GenerateTravelPlan function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateTravelPlanInputSchema = z.object({
  destination: z.string().describe('The desired travel destination.'),
  departureLocation: z.string().describe('The user current location.'),
  dates: z.string().describe('The travel dates or date range.'),
  specificLocations: z
    .string()
    .optional()
    .describe('Specific locations within the destination (e.g., specific cities or regions).'),
  desiredActivities: z.string().describe('Desired activities at the location(s).'),
  feedback: z.string().optional().describe('User feedback on previous plans.'), // Updated description
});
export type GenerateTravelPlanInput = z.infer<typeof GenerateTravelPlanInputSchema>;

const TransportationSchema = z.object({
  type: z.string().describe('The type of transportation.'),
  departureLocation: z.string().describe('The departure location.'),
  arrivalLocation: z.string().describe('The arrival location.'),
  departureTime: z.string().describe('The departure time.'),
  arrivalTime: z.string().describe('The arrival time.'),
  price: z.number().describe('The price.'),
  url: z.string().describe('The URL for booking.'),
});

const PlanItemSchema = z.object({ // Renamed from ItineraryItemSchema
  day: z.string().describe('The day of the plan.'), // Updated description
  description: z.string().describe('The description of the day activities.'),
  transportation: TransportationSchema.optional().describe('Transportation details for the day.'),
});
export type PlanItemSchema = z.infer<typeof PlanItemSchema>;

const GenerateTravelPlanOutputSchema = z.object({ // Renamed from GenerateTravelItineraryOutputSchema
  plan: z.array(PlanItemSchema).describe('A personalized travel plan with accommodation and transportation.'), // Updated name and description
});
export type GenerateTravelPlanOutput = z.infer<typeof GenerateTravelPlanOutputSchema>;

export async function generateTravelPlan( // Renamed from generateTravelItinerary
  input: GenerateTravelPlanInput
): Promise<GenerateTravelPlanOutput> {
  return generateTravelPlanFlow(input); // Renamed flow function call
}

const prompt = ai.definePrompt({
  name: 'generateTravelPlanPrompt', // Renamed prompt
  input: {
    schema: z.object({
      destination: z.string().describe('The desired travel destination.'),
      departureLocation: z.string().describe('The user current location.'),
      dates: z.string().describe('The travel dates or date range.'),
      specificLocations:
        z.string().optional().describe('Specific locations within the destination.'),
      desiredActivities: z.string().describe('Desired activities at the location(s).'),
      feedback: z.string().optional().describe('User feedback on previous plans.'), // Updated description
    }),
  },
  output: {
    schema: z.object({
      plan: z.array(PlanItemSchema).describe('A personalized travel plan in JSON format.'), // Updated name and description
    }),
  },
  prompt: `You are an expert travel planner. Based on the user's preferences, generate a personalized travel plan in JSON format. The plan should include a day-by-day schedule, and transportation options for each day. Ensure that the output is a valid JSON array.
Here is the schema:
${JSON.stringify(PlanItemSchema.shape, null, 2)}

User Preferences:
Destination: {{{destination}}}
Departure Location: {{{departureLocation}}}
Dates: {{{dates}}}
Specific Locations: {{{specificLocations}}}
Desired Activities: {{{desiredActivities}}}
Feedback: {{{feedback}}}

Plan (JSON format):`, // Updated prompt text
});

const generateTravelPlanFlow = ai.defineFlow<
  typeof GenerateTravelPlanInputSchema,
  typeof GenerateTravelPlanOutputSchema
>(
  {
    name: 'generateTravelPlanFlow', // Renamed flow
    inputSchema: GenerateTravelPlanInputSchema,
    outputSchema: GenerateTravelPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
