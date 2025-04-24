'use server';

/**
 * @module travelPlanGenerator
 * Defines functions and types for generating personalized travel plans using AI,
 * based on user-provided preferences like destination, dates, and activities.
 */

import { ai } from '@/ai/ai-instance'; // Assuming 'ai' is a configured Genkit or similar AI library instance
import { z } from 'zod'; // Using Zod for schema definition and validation

// ===================================================================================
// Input Schema Definition
// ===================================================================================

/**
 * Schema defining the input parameters required to generate a travel plan.
 */
const GenerateTravelPlanInputSchema = z.object({
  destination: z.string().min(1).describe('The primary desired travel destination (e.g., "Paris, France", "Italian Alps").'),
  arrivalCity: z.string().min(1).describe('The city within the destination where the user will arrive to start the trip (e.g., "Rome", "Tokyo Narita").'),
  departureCity: z.string().min(1).describe('The city within the destination from which the user will depart at the end of the trip (e.g., "Florence", "Osaka Kansai").'),
  dates: z.string().min(1).describe('The travel dates or date range (e.g., "July 10th - July 17th, 2024", "Next Weekend", "2025-08-15 for 7 days").'),
  numberOfDays: z
    .number()
    .int()
    .positive() // Input validation: Ensure positive number of days if provided
    .optional()
    .describe('The total number of days for the trip. Should align with dates if both are provided. Can be the primary duration indicator if dates are approximate or only a start date is given.'),
  specificLocations: z
    .string()
    .optional()
    .describe('Specific cities, regions, neighborhoods, or landmarks within the destination the user wants to visit or focus on, comma-separated if multiple (e.g., "Kyoto and Osaka", "Manhattan only", "Near the Eiffel Tower").'),
  desiredActivities: z.string().min(1).describe('A description of desired activities, interests, or travel style, comma-separated if multiple categories (e.g., "Hiking and nature", "Museums, fine dining, and nightlife", "Relaxing beach vacation", "General sightseeing").'),
  feedback: z.string().optional().describe('Optional user feedback on previously generated plans to help refine the next iteration.'),
});

/**
 * Type representing the validated input for the travel plan generation.
 * Inferred from the Zod schema.
 * Export this type for frontend usage.
 */
export type GenerateTravelPlanInput = z.infer<typeof GenerateTravelPlanInputSchema>;

/**
 * Schema for transportation details within the travel plan.
 */
const TransportationSchema = z.object({
  type: z.string().min(1).describe('Mode of transport (e.g., "Train", "Flight", "Bus", "Rental Car", "Ferry").'),
  departureLocation: z.string().min(1).describe('The starting city or general area for this transportation leg.'),
  arrivalLocation: z.string().min(1).describe('The ending city or general area for this transportation leg.'),
  departureStation: z.string().optional().describe('Specific departure station, airport, or terminal, if applicable and different from the general location (e.g., "Gare du Nord", "JFK Terminal 4").'),
  arrivalStation: z.string().optional().describe('Specific arrival station, airport, or terminal, if applicable and different from the general location (e.g., "Waterloo Station", "LAX Tom Bradley International Terminal").'),
  departureTime: z.string().describe('Estimated or specific departure time. Use descriptive terms if precise times are unknown (e.g., "09:15", "Early Morning", "Around Noon", "Late Afternoon").'),
  arrivalTime: z.string().describe('Estimated or specific arrival time. Use descriptive terms if precise times are unknown (e.g., "17:30", "Mid-Morning", "Evening", "Before Dinner").'),
  price: z
    .number()
    .min(0) // Ensures price is not negative (0 or greater)
    .optional()
    .describe('Estimated price for this transportation segment (specify currency implicitly, e.g., based on destination). Omit if unknown or zero.'),
  url: z
    .string()
    .optional()
    .describe('A URL for booking, schedules, or more information, if available. Should be a valid web address starting with http or https.'),
});

/**
 * Type representing a transportation option within the plan.
 * Inferred from the Zod schema.
 */
export type TransportationOption = z.infer<typeof TransportationSchema>;

/**
 * Schema for a Point of Interest (POI) mentioned in the plan.
 */
const PointOfInterestSchema = z.object({
  name: z.string().min(1).describe('The common or official name of the POI.'),
  location: z.string().min(1).describe('The city, address, or general location of the POI (e.g., "Paris, France", "Near Buckingham Palace").'),
  description: z.string().optional().describe('A brief description of the POI.'),
});

/**
 * Schema for a single day's itinerary within the overall travel plan.
 */
const PlanItemSchema = z.object({
  day: z.string().min(1).describe('Identifier for the day (e.g., "Day 1", "2024-07-10", "April 25th, 2025"). Must be present and unique within the plan.'),
  headline: z.string().min(1).describe('A short, descriptive headline summarizing the main theme or key activity of the day (e.g., "Arrival in Rome & Ancient Wonders Exploration").'),
  description: z.string().min(1).describe('A more detailed narrative description of the day\'s planned activities, flow, and experiences.'),
  pointsOfInterest: z
    .array(PointOfInterestSchema)
    .optional()
    .describe('An optional list of specific points of interest to visit or see on this day.'),
  transportation: TransportationSchema.optional().describe('Transportation details relevant for this specific day (e.g., travel between cities scheduled for this day, primary mode of transport used).'),
});

/**
 * Type representing a single day's item in the travel plan.
 * Inferred from the Zod schema.
 */
export type PlanItem = z.infer<typeof PlanItemSchema>;

/**
 * Schema defining the preliminary output structure containing potential points of interest and activities.
 */
const PreliminaryPlanOutputSchema = z.object({
  pointsOfInterest: z.array(PointOfInterestSchema).describe('A list of potential points of interest for the trip.'),
  activities: z.array(z.string()).describe('A list of potential activities for the trip.'),
});

/**
 * Type representing the preliminary output of the travel plan generation.
 * Inferred from the Zod schema.
 */
export type PreliminaryPlanOutput = z.infer<typeof PreliminaryPlanOutputSchema>;

/**
 * Schema defining the final output structure containing the generated travel plan.
 */
const GenerateTravelPlanOutputSchema = z.object({
  plan: z.array(PlanItemSchema).min(1).describe('The personalized, day-by-day travel plan itinerary.'), // Ensure plan is not empty
});

/**
 * Type representing the final output of the travel plan generation.
 * Inferred from the Zod schema.
 */
export type GenerateTravelPlanOutput = z.infer<typeof GenerateTravelPlanOutputSchema>;

/**
 * Defines the AI flow for generating the preliminary travel plan (points of interest and activities).
 */
const generatePreliminaryPlanFlow = ai.defineFlow<
  typeof GenerateTravelPlanInputSchema, // Explicit input type from schema
  typeof PreliminaryPlanOutputSchema // Explicit output type from schema
>(
  {
    name: 'generatePreliminaryPlanFlow',
    inputSchema: GenerateTravelPlanInputSchema,   // Use schema for validation
    outputSchema: PreliminaryPlanOutputSchema, // Use schema for output validation/parsing
  },
  async (input): Promise<PreliminaryPlanOutput> => { // Add explicit Promise return type
    console.log(`Generating preliminary travel plan for destination: ${input.destination}, Arrival: ${input.arrivalCity}, Departure: ${input.departureCity}`); // Basic logging

    // Dummy data for demonstration purposes
    const pointsOfInterest = [
        { name: "Eiffel Tower", location: "Paris", description: "Iconic landmark" },
        { name: "Louvre Museum", location: "Paris", description: "Famous art museum" }
    ];
    const activities = ["Visit museums", "Eat at local restaurants", "Walk along the Seine"];

    return { pointsOfInterest, activities };
  }
);

/**
 * Defines the AI flow for generating the travel plan.
 * It takes validated user input, calls the AI prompt, and returns the structured output.
 */
const generateTravelPlanFlow = ai.defineFlow<
  typeof GenerateTravelPlanInputSchema, // Explicit input type from schema
  typeof GenerateTravelPlanOutputSchema // Explicit output type from schema
>(
  {
    name: 'generateTravelPlanFlow',
    inputSchema: GenerateTravelPlanInputSchema,   // Use schema for validation
    outputSchema: GenerateTravelPlanOutputSchema, // Use schema for output validation/parsing
  },
  async (input): Promise<GenerateTravelPlanOutput> => { // Add explicit Promise return type
      console.log(`Generating travel plan for destination: ${input.destination}, Arrival: ${input.arrivalCity}, Departure: ${input.departureCity}`); // Basic logging

      //TODO: Replace dummy data with real AI-generated itinerary
      const dummyItinerary: PlanItem[] = [
          {
              day: "Day 1",
              headline: "Arrival in Paris & Eiffel Tower Visit",
              description: "Arrive in Paris and head to the Eiffel Tower.",
              pointsOfInterest: [{ name: "Eiffel Tower", location: "Paris", description: "Iconic tower" }],
              transportation: { type: "Train", departureLocation: "Paris", arrivalLocation: "Eiffel Tower Area", departureTime: "Morning", arrivalTime: "Late Morning", price: 10, url: "https://example.com" }
          },
          {
              day: "Day 2",
              headline: "Louvre Museum & Seine River Cruise",
              description: "Visit the Louvre Museum and take a cruise on the Seine River.",
              pointsOfInterest: [{ name: "Louvre Museum", location: "Paris", description: "World-renowned museum" }],
              transportation: { type: "Taxi", departureLocation: "Eiffel Tower Area", arrivalLocation: "Louvre Museum", departureTime: "Morning", arrivalTime: "Late Morning", price: 15, url: "https://example.com" }
          }
      ];
      return { plan: dummyItinerary };
  }
);

/**
 * Public server function to generate a personalized travel plan.
 * Assumes input roughly conforms to the schema (frontend should validate thoroughly).
 * Executes the AI flow.
 */
export async function generatePreliminaryTravelPlan(
  rawInput: GenerateTravelPlanInput // Expect the correct type from the caller
): Promise<PreliminaryPlanOutput> {
  // Frontend should perform the primary validation.
  // Backend safeParse acts as a safety net.
  const validationResult = GenerateTravelPlanInputSchema.safeParse(rawInput);
  if (!validationResult.success) {
    console.error('Backend validation failed for input:', validationResult.error.format());
    // Provide a clear error message back to the frontend caller.
    throw new Error(`Invalid input received by the server. Please check your entries.`);
     // Or re-throw specific formatted error if needed for detailed debugging:
     // throw new Error(`Invalid input: ${JSON.stringify(validationResult.error.format())}`);
  }

  // Call the AI flow with the validated data
  try {
      // Log the data being sent to the flow
      console.log("Calling generatePreliminaryPlanFlow with validated data:", validationResult.data);
      const result = await generatePreliminaryPlanFlow(validationResult.data);
      // Log the successful result before returning
      console.log("generatePreliminaryPlanFlow returned successfully:", result);
      return result;
  } catch (error) {
      console.error("Error executing generatePreliminaryPlanFlow:", error);
      // Re-throw the error to be caught by the calling function (in page.tsx)
      // This allows the frontend to display the specific error message from the API if available.
      if (error instanceof Error) {
        // Add more details to the error message if possible
        throw new Error(`Error generating travel plan: ${error.message}`);
      } else {
        // Wrap unknown errors
        throw new Error("An unexpected error occurred during travel plan generation.");
      }
  }
}

/**
 * Public server function to generate a personalized travel plan.
 * Assumes input roughly conforms to the schema (frontend should validate thoroughly).
 * Executes the AI flow.
 */
export async function generateTravelPlan(
  rawInput: GenerateTravelPlanInput // Expect the correct type from the caller
): Promise<GenerateTravelPlanOutput> {
  // Frontend should perform the primary validation.
  // Backend safeParse acts as a safety net.
  const validationResult = GenerateTravelPlanInputSchema.safeParse(rawInput);
  if (!validationResult.success) {
    console.error('Backend validation failed for input:', validationResult.error.format());
    // Provide a clear error message back to the frontend caller.
    throw new Error(`Invalid input received by the server. Please check your entries.`);
     // Or re-throw specific formatted error if needed for detailed debugging:
     // throw new Error(`Invalid input: ${JSON.stringify(validationResult.error.format())}`);
  }

  // Call the AI flow with the validated data
  try {
      // Log the data being sent to the flow
      console.log("Calling generateTravelPlanFlow with validated data:", validationResult.data);
      const result = await generateTravelPlanFlow(validationResult.data);
      // Log the successful result before returning
      console.log("generateTravelPlanFlow returned successfully:", result);
      return result;
  } catch (error) {
      console.error("Error executing generateTravelPlanFlow:", error);
      // Re-throw the error to be caught by the calling function (in page.tsx)
      // This allows the frontend to display the specific error message from the API if available.
      if (error instanceof Error) {
        // Add more details to the error message if possible
        throw new Error(`Error generating travel plan: ${error.message}`);
      } else {
        // Wrap unknown errors
        throw new Error("An unexpected error occurred during travel plan generation.");
      }
  }
}

