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

// ===================================================================================
// Output Schemas Definition
// ===================================================================================

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
    .url() // Ensures it's a valid URL format if provided
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
  description: z.string().min(1).describe("A more detailed narrative description of the day's planned activities, flow, and experiences."),
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

// ===================================================================================
// AI Flow Definitions
// ===================================================================================

/**
 * Defines the AI flow for generating the final, detailed travel plan.
 * It takes validated user input, calls the AI prompt, and returns the
 * structured output.
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
      console.log(`Generating detailed travel plan for destination: ${input.destination}, Arrival: ${input.arrivalCity}, Departure: ${input.departureCity}`); // Basic logging

      const prompt = `
        Create a detailed, day-by-day travel itinerary based on the following user preferences:

        Destination: ${input.destination}
        Arrival City: ${input.arrivalCity}
        Departure City: ${input.departureCity}
        Travel Dates: ${input.dates}
        ${input.numberOfDays ? `Number of Days: ${input.numberOfDays}` : ''}
        Specific Locations to Include/Focus On: ${input.specificLocations}
        Desired Activities/Interests/Style: ${input.desiredActivities}
        ${input.feedback ? `Refinement Feedback on Previous Plan: ${input.feedback}` : ''}

        Please generate the itinerary as a JSON object containing a single key "plan", which is an array of objects.
        Each object in the "plan" array represents a single day and MUST strictly follow this structure:
        {
          "day": "string (e.g., 'Day 1', '2025-07-10')",
          "headline": "string (Short summary of the day)",
          "description": "string (Detailed narrative of the day's activities)",
          "pointsOfInterest": [ (optional array)
            { "name": "string", "location": "string", "description": "string (optional)" }
          ],
          "transportation": { (optional object for inter-city or significant travel on this day)
            "type": "string (e.g., 'Train', 'Rental Car')",
            "departureLocation": "string",
            "arrivalLocation": "string",
            "departureStation": "string (optional)",
            "arrivalStation": "string (optional)",
            "departureTime": "string (e.g., '09:00', 'Morning')",
            "arrivalTime": "string (e.g., '17:30', 'Afternoon')",
            "price": number (optional),
            "url": "string (optional, valid URL)"
          }
        }

        Ensure the entire output is ONLY the valid JSON object requested, starting with { and ending with }. Do not include any introductory text or explanations outside the JSON structure.
        The number of items in the 'plan' array should correspond to the duration implied by the dates or numberOfDays.
        Make the plan logical, considering travel times between locations if necessary. Be creative yet practical based on the user's interests.
      `;

      // Adjust maxTokens and temperature as needed for detailed plan generation
      const maxTokens = 3072; // Increased tokens for potentially longer, detailed plans
      const temperature = 0.7; // Balance creativity and coherence

      try {
        const aiResponse = await ai.run({
          prompt,
          maxTokens,
          temperature,
          // Potentially add output format specifier if the AI library supports it (e.g., output: 'json')
        });

        // Parse the JSON output from the AI
        try {
          const responseText = aiResponse.text();
          console.log("Raw AI response (detailed plan):", responseText); // Log raw response for debugging

          // Attempt to clean up potential extraneous text before parsing
          const jsonRegex = new RegExp('```json([\s\S]*?)```');
          const jsonMatch = responseText.match(jsonRegex);

          const jsonString = jsonMatch ? jsonMatch[1] : responseText;

          const parsedResponse = JSON.parse(jsonString);

          // Optional: Validate the parsed response structure again before returning
          // The ai.defineFlow's outputSchema *should* handle this, but explicit validation adds robustness.
          const validation = GenerateTravelPlanOutputSchema.safeParse(parsedResponse);
           if (!validation.success) {
              console.error("Failed to validate AI detailed plan response structure:", validation.error.format());
              // Attempt to give more context about the error
              const errorDetails = JSON.stringify(validation.error.format());
              throw new Error(`AI response for the detailed plan did not match the expected format. Issues: ${errorDetails}`);
           }
          return validation.data; // Return the validated data

        } catch (parseError) {
          console.error("Error parsing AI detailed plan response:", parseError);
          console.error("Raw response that failed parsing:", aiResponse.text()); // Log the problematic response
          throw new Error("Failed to parse the detailed travel plan from AI response. The format might be incorrect.");
        }
      } catch (aiError) {
        console.error("Error calling AI model (detailed plan):", aiError);
        if (aiError instanceof Error) {
          throw new Error(`AI failed to generate the detailed travel plan: ${aiError.message}`);
        } else {
          throw new Error("Failed to generate detailed plan. An unknown AI error occurred.");
        }
      }
  }
);


// ===================================================================================
// Exported Server Functions (Public API)
// ===================================================================================

/**
 * Public server function to generate the final personalized travel plan.
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
    console.error('Backend validation failed for final plan input:', validationResult.error.format());
    // Provide a clear error message back to the frontend caller.
    throw new Error(`Invalid input received by the server. Please check your entries: ${JSON.stringify(validationResult.error.format())}`);
  }

  // Call the AI flow with the validated data
  try {
      // Log the data being sent to the flow
      console.log("Calling generateTravelPlanFlow with validated data:", validationResult.data);
      const result = await generateTravelPlanFlow(validationResult.data);
      // Log the successful result before returning
      console.log("generateTravelPlanFlow returned successfully."); // Avoid logging potentially large result objects
      return result;
  } catch (error) {
      console.error("Error executing generateTravelPlanFlow:", error);
      // Re-throw the error to be caught by the calling function (in frontend)
      // This allows the frontend to display the specific error message from the AI/parsing if available.
      if (error instanceof Error) {
        // Add more details to the error message if possible
        throw new Error(`Error generating final travel plan: ${error.message}`);
      } else {
        // Wrap unknown errors
        throw new Error("An unexpected error occurred during final travel plan generation.");
      }
  }
}

/**
 * Public server function to generate a preliminary list of POIs and activities, grouped by location and type.
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
    console.error('Backend validation failed for preliminary input:', validationResult.error.format());
    // Provide a clear error message back to the frontend caller.
    throw new Error(`Invalid input received by the server. Please check your entries: ${JSON.stringify(validationResult.error.format())}`);
  }

  // Call the AI flow with the validated data
  try {
      // Log the data being sent to the flow
      console.log("Calling generatePreliminaryPlanFlow with validated data:", validationResult.data);
      const preliminaryPlanOutput = await generatePreliminaryPlanFlow(validationResult.data);
      // Log the successful result before returning
      console.log("generatePreliminaryPlanFlow returned successfully."); // Avoid logging potentially large result objects here
      return preliminaryPlanOutput;
  } catch (error) {
      console.error("Error executing generatePreliminaryPlanFlow:", error);
      // Re-throw the error to be caught by the calling function (in frontend)
      // This allows the frontend to display a specific error message if available.
      if (error instanceof Error) {
        // Add more details to the error message if possible
        throw new Error(`Error generating preliminary plan: ${error.message}`);
      } else {
        // Wrap unknown errors
        throw new Error("An unexpected error occurred during preliminary plan generation.");
      }
  }
}
