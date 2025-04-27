"use client";

// --- Core React/Next Imports ---
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

// --- Third-Party Libraries ---
import { Loader2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique keys

// --- Hooks ---
import { useToast } from "@/hooks/use-toast";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toaster";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// --- AI Flow Imports ---
import { recommendPlaces, type RecommendPlacesOutput } from "@/ai/flows/recommend-places"; // Import the AI function and the new type

// --- Types ---
// Interface for the data loaded from the previous step
interface ActivityPreferencesData {
  destination: string;
  arrivalCity: string;
  departureCity: string;
  arrivalDate?: string; // ISO string
  returnDate?: string; // ISO string
  numberOfDays?: number;
  specificLocations: string[];
  otherLocationInput: string;
  desiredActivityCategories: string[];
  desiredActivities: string[]; // This might be initial user input, not AI suggestions
}

// Interface for the final plan input (might need adjustment based on AI flow)
interface FinalPlanInput extends ActivityPreferencesData {
    selectedFinalActivities: string[]; // Flattened list for now, matching AI input schema
}

// Type for selected activities in the new structure
interface RecommendedPlace {
  name: string;
  location: string;
  type: string;
  description: string;
}

// --- Constants ---
const SESSION_STORAGE_ACTIVITY_PREFS_KEY = "activityPreferencesData";
const SESSION_STORAGE_FINAL_PLAN_INPUT_KEY = "finalPlanInput"; // Key for final data before planner
const TOAST_DESTRUCTIVE_VARIANT = "destructive" as const;
const TOAST_DEFAULT_VARIANT = "default" as const;
const TOAST_DURATION_MS = 5000;

type ValidationResult = string | null;

// Define a type to represent structured activity suggestions
interface ActivitySuggestion {
  location: string;
  activityTypes: {
    type: string;
    suggestions: { name: string; description: string; }[];
  }[];
}

export default function SuggestedActivitiesPage() {
  // --- State ---
  const [activityPrefs, setActivityPrefs] = useState<ActivityPreferencesData | null>(null);
  // State to hold the activities currently displayed (initially from AI) - now nested structure
  const [recommendedPlaces, setRecommendedPlaces] = useState<RecommendPlacesOutput | null>(null);
  // State to track which activities the user has checked - now stores structured info
  const [selectedPlaces, setSelectedPlaces] = useState<RecommendedPlace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Set loading true initially
  const [isSuggestingMore, setIsSuggestingMore] = useState<boolean>(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  // State to manage which accordions are open
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

  // --- Hooks ---
  const router = useRouter();
  const { toast } = useToast();

  // --- Fetch Suggestions on Load ---
  useEffect(() => {
    const storedData = sessionStorage.getItem(SESSION_STORAGE_ACTIVITY_PREFS_KEY);
    if (storedData) {
      try {
        const parsedData: ActivityPreferencesData = JSON.parse(storedData);
        setActivityPrefs(parsedData);

        // --- Call AI to get initial suggestions ---
        const fetchSuggestions = async (prefs: ActivityPreferencesData) => {
          setIsLoading(true);
          setLoadingError(null);
          try {
            const aiInput = {
              destination: prefs.destination,
              arrivalCity: prefs.arrivalCity,
              departureCity: prefs.departureCity,
              activityPreferences: prefs.desiredActivityCategories.join(', ') + (prefs.desiredActivities.length > 0 ? ', ' + prefs.desiredActivities.join(', ') : ''), // Combine categories and specific desires
            };

            console.log("Calling recommendPlaces with:", aiInput);
            // Explicitly cast aiInput to GenerateTravelPlanInput, even though it might not match perfectly
            const result = await recommendPlaces(aiInput);
            console.log("Received AI suggestions:", JSON.stringify(result, null, 2)); // Log the structured result

            // Transform the AI output to the desired structure
            setRecommendedPlaces(result ?? null);
            setSelectedPlaces([]);

          } catch (error) {
            console.error("Error fetching AI suggestions:", error);
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while fetching suggestions.";
            setLoadingError(errorMessage);
            toast({ title: "Error", description: errorMessage, variant: TOAST_DESTRUCTIVE_VARIANT });
          } finally {
            setIsLoading(false);
          }
        };

        fetchSuggestions(parsedData);

      } catch (error) {
        console.error("Failed to parse activity preferences data from sessionStorage:", error);
        setLoadingError("Could not load activity preferences. Please go back.");
        toast({ title: "Error", description: "Failed to load activity preferences.", variant: TOAST_DESTRUCTIVE_VARIANT });
        setIsLoading(false); // Stop loading on parse error
      }
    } else {
      setLoadingError("No activity preference data found. Please start from the beginning.");
      toast({ title: "Error", description: "No activity preference data found.", variant: TOAST_DESTRUCTIVE_VARIANT });
      setIsLoading(false); // Stop loading if no data found
      // Optionally redirect
      // router.push('/locations-and-dates');
    }
  }, [router, toast]); // Depend on router and toast

  // --- Validation Logic ---
  // Basic check: at least one activity must be selected to create an itinerary
  const validateSelection = (): ValidationResult => {
    if (selectedPlaces.length === 0) {
        return "Please select at least one place to include in the itinerary.";
    }
    return null;
  };

  // --- Event Handlers ---
  const handleCreateItinerary = async () => {
    const validationError = validateSelection();
    if (validationError) {
      toast({ title: "Selection Required", description: validationError, variant: TOAST_DESTRUCTIVE_VARIANT });
      return;
    }

    if (!activityPrefs) {
        toast({ title: "Error", description: "Cannot proceed without loaded preferences.", variant: TOAST_DESTRUCTIVE_VARIANT });
        return;
    }

    setIsLoading(true);
    try {
        // Flatten selected activities into a string list for the final plan input
        const selectedActivityNamesAndLocations = selectedPlaces.map(place => `${place.name} (${place.location})`).join(', ');

        // Prepare the final data package for the planner page (and potentially final AI call)
        const finalInput: FinalPlanInput = {
            ...activityPrefs,
            selectedFinalActivities: [selectedActivityNamesAndLocations], // Pass as an array containing the combined string
             // Note: The generateTravelPlan flow expects desiredActivities as a string.
             // We might need to adjust either this or the final AI flow's input schema
             // if we want to pass the structured list of selected activities.
             // For now, sending a flattened list of names as it fits the existing schema better.
             desiredActivities: activityPrefs.desiredActivityCategories.join(', ') + (selectedActivityNamesAndLocations.length > 0 ? ', ' + selectedActivityNamesAndLocations : ''),
        };

        // Store the final input data
        sessionStorage.setItem(SESSION_STORAGE_FINAL_PLAN_INPUT_KEY, JSON.stringify(finalInput));
        console.log("Stored Final Plan Input Data:", JSON.stringify(finalInput, null, 2));

        // ** Placeholder for final AI itinerary generation call **
        // const itineraryResult = await generateFinalItinerary(finalInput);
        // sessionStorage.setItem(SESSION_STORAGE_PLAN_KEY, JSON.stringify(itineraryResult.plan));

        toast({
            title: "Itinerary Ready!",
            description: "Moving to the planner view.",
            variant: TOAST_DEFAULT_VARIANT,
        });

        // Navigate to the final planner page
        router.push('/planner');

    } catch (error) {
      console.error("Error finalizing itinerary:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({ title: "Error Creating Itinerary", description: errorMessage, variant: TOAST_DESTRUCTIVE_VARIANT });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestMore = async () => {
    if (!activityPrefs) {
        toast({ title: "Error", description: "Cannot suggest more without loaded preferences.", variant: TOAST_DESTRUCTIVE_VARIANT });
        return;
    }
    setIsSuggestingMore(true);
    setLoadingError(null);
    try {
          const aiInput = {
              destination: activityPrefs.destination,
              arrivalCity: activityPrefs.arrivalCity,
              departureCity: activityPrefs.departureCity,
              activityPreferences: activityPrefs.desiredActivityCategories.join(', ') + (activityPrefs.desiredActivities.length > 0 ? ', ' + activityPrefs.desiredActivities.join(', ') : ''),
          };

        console.log("Calling recommendPlaces with:", aiInput);
        // Explicitly cast aiInput to GenerateTravelPlanInput
        const result = await recommendPlaces(aiInput);
        console.log("Received more AI suggestions:", JSON.stringify(result, null, 2));

            // Append the new results to the existing results.
            setRecommendedPlaces(prev => {
                if (!prev) return result ?? null; // If no previous data, just set the new result
                
                const existingKeys = new Set((prev as RecommendPlacesOutput).map(item => `${item.location}-${item.type}-${item.name}`));
                const newPlaces = (result ?? []).filter(item => !existingKeys.has(`${item.location}-${item.type}-${item.name}`));
                
                return [...prev, ...newPlaces];
            });


      toast({
        title: "More Suggestions Added",
        description: "Review the updated list.",
        variant: TOAST_DEFAULT_VARIANT,
      });

    } catch (error) {
        console.error("Error getting more suggestions:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while getting more suggestions.";
        setLoadingError(errorMessage);
        toast({ title: "Suggestion Error", description: errorMessage, variant: TOAST_DESTRUCTIVE_VARIANT });
    } finally {
        setIsSuggestingMore(false);
    }
  };

  // Handler for checkbox changes
  const handlePlaceSelectionChange = (place: RecommendedPlace, isChecked: boolean) => {
    setSelectedPlaces(prev => {
      if (isChecked) {
        // Add, ensuring uniqueness based on location, type, and name
        if (!prev.some(item => item.location === place.location && item.type === place.type && item.name === place.name)) {
             return [...prev, place];
        }
        return prev; // Already exists, return previous state
      } else {
        // Remove
        return prev.filter(item => !(item.location === place.location && item.type === place.type && item.name === place.name));
      }
    });
  };

  // --- Derived State ---
  const isCreateDisabled = useMemo(() => {
      return isLoading || isSuggestingMore || !!validateSelection();
  }, [isLoading, isSuggestingMore, selectedPlaces]);

  const createHintText = useMemo(() => {
      if (isLoading || isSuggestingMore) return null;
      return validateSelection();
  }, [isLoading, isSuggestingMore, selectedPlaces]);

   // Handler for accordion state change
   const handleAccordionChange = (value: string | string[]) => {
     setOpenAccordionItems(Array.isArray(value) ? value : [value]);
   };

  // --- Render Logic ---
  if (loadingError) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-3xl">
        <Card className="border-red-500">
          <CardHeader><CardTitle className="text-red-600">Error</CardTitle></CardHeader>
          <CardContent>
            <p className="text-red-600">{loadingError}</p>
            <Button onClick={() => router.push('/travel-preferences')} className="mt-4">Start Over</Button>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  if (isLoading && !recommendedPlaces) {
     return (
       <div className="container mx-auto p-4 md:p-8 max-w-3xl flex justify-center items-center min-h-screen-minus-header">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <span className="ml-2">Loading preferences and suggestions...</span>
       </div>
     );
  }

  if (!activityPrefs) {
      // This case should ideally be caught by loadingError, but as a fallback:
     return null; // Or a specific error state if needed
  }

    const displayPlaces = () => {
        if (!recommendedPlaces || recommendedPlaces.length === 0) {
            return <p className="text-muted-foreground italic">No suggestions available based on your preferences.</p>;
        }

        // Group places by location for better UI
        const placesByLocation = (recommendedPlaces ?? []).reduce((acc, place) => {
            const location = place.location;
            if (!acc[location]) {
                acc[location] = [];
            }
            acc[location].push(place);
            return acc;
        }, {});

        return (
            <Accordion type="multiple" value={openAccordionItems} onValueChange={handleAccordionChange} className="w-full">
                {Object.entries(placesByLocation).map(([location, places]) => (
                    <AccordionItem key={location} value={`location-${location.replace(/\s+/g, '-').toLowerCase()}`}>
                        <AccordionTrigger className="text-base font-semibold">{location}</AccordionTrigger>
                        <AccordionContent className="space-y-4 pl-4">
                            {places.map(place => {
                                // Create a unique key/id for each suggestion
                                const activityUniqueKey = `${place.location}-${place.type}-${place.name}`;
                                const activityId = `activity-${activityUniqueKey}`;
                                const isSelected = selectedPlaces.some(item =>
                                    item.location === place.location &&
                                    item.type === place.type &&
                                    item.name === place.name
                                );

                                return (
                                    <div key={activityId} className="flex items-start space-x-2">
                                        <Checkbox
                                            id={activityId}
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handlePlaceSelectionChange(place, !!checked)}
                                            aria-labelledby={`${activityId}-label`}
                                            className="mt-1"
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor={activityId} id={`${activityId}-label`} className="font-normal cursor-pointer">
                                                {place.name}
                                            </Label>
                                            <p className="text-xs text-muted-foreground">{place.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    };

  // --- Main JSX ---
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Review Suggested Activities</CardTitle>
          <CardDescription>
            Select the activities you'd like to include in your itinerary for {activityPrefs.destination}. Add more suggestions if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Suggested Activities List */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold">Suggested Places</Label>
            {displayPlaces()}
          </div>

          {/* Action Buttons & Hints */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 pt-4">
            {/* Suggest More Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleSuggestMore}
              disabled={isLoading || isSuggestingMore}
              className="w-full md:w-auto"
            >
              {isSuggestingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Suggesting...
                </>
              ) : (
                'Keep Selected and Suggest More'
              )}
            </Button>

            {/* Create Itinerary Button */}
            <div className="flex flex-col items-center space-y-1 w-full md:w-auto">
              <Button
                type="button"
                onClick={handleCreateItinerary}
                disabled={isCreateDisabled}
                className="w-full md:w-auto px-8"
                aria-describedby={createHintText ? "create-hint" : undefined}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Creating...
                  </>
                ) : (
                  'Keep Selected and Create Itinerary'
                )}
              </Button>
              {isCreateDisabled && !isLoading && !isSuggestingMore && createHintText && (
                <p id="create-hint" className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {createHintText}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}

// Separate component to ensure it's only used client-side
function LoaderComponent() {
    return (
        <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading previous data...</span>
        </>
    );
}
