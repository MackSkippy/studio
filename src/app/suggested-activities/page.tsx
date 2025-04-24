"use client";

// --- Core React/Next Imports ---
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

// --- Third-Party Libraries ---
import { Loader2 } from "lucide-react";

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

// --- AI Flow Imports ---
import { generatePreliminaryTravelPlan } from "@/ai/flows/generate-travel-itinerary"; // Import the AI function

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
    selectedFinalActivities: string[];
}

// --- Constants ---
const SESSION_STORAGE_ACTIVITY_PREFS_KEY = "activityPreferencesData";
const SESSION_STORAGE_FINAL_PLAN_INPUT_KEY = "finalPlanInput"; // Key for final data before planner
const TOAST_DESTRUCTIVE_VARIANT = "destructive" as const;
const TOAST_DEFAULT_VARIANT = "default" as const;
const TOAST_DURATION_MS = 5000;

type ValidationResult = string | null;
export default function SuggestedActivitiesPage() {
  // --- State ---
  const [activityPrefs, setActivityPrefs] = useState<ActivityPreferencesData | null>(null);
  // State to hold the activities currently displayed (initially from AI)
  const [displayedActivities, setDisplayedActivities] = useState<string[]>([]);
  // State to track which activities the user has checked
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Set loading true initially
  const [isSuggestingMore, setIsSuggestingMore] = useState<boolean>(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

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
              dates: prefs.arrivalDate && prefs.returnDate ? `${prefs.arrivalDate} to ${prefs.returnDate}` : 'Flexible dates', // Construct dates string
              numberOfDays: prefs.numberOfDays,
              specificLocations: prefs.specificLocations.join(', ') || prefs.otherLocationInput || undefined, // Combine specific locations and other input
              desiredActivities: prefs.desiredActivityCategories.join(', ') + (prefs.desiredActivities.length > 0 ? ', ' + prefs.desiredActivities.join(', ') : ''), // Combine categories and specific desires
              feedback: undefined, // No feedback on initial load
            };

            console.log("Calling generatePreliminaryTravelPlan with:", aiInput);
            const result = await generatePreliminaryTravelPlan(aiInput);
            console.log("Received AI suggestions:", result);

            // Combine points of interest names/locations and activity strings
            const combinedSuggestions = [
              ...(result.pointsOfInterest || []).map(poi => `${poi.name} (${poi.location})`),
              ...(result.activities || []),
            ];

            setDisplayedActivities(combinedSuggestions);
            setSelectedActivities([]); // Start with no activities selected from the new suggestions

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
    if (selectedActivities.length === 0) {
        return "Please select at least one activity to include in the itinerary.";
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
        // Prepare the final data package for the planner page (and potentially final AI call)
        const finalInput: FinalPlanInput = {
            ...activityPrefs,
            selectedFinalActivities: selectedActivities,
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
      // --- Call AI to get more suggestions ---
      // Pass selected activities as feedback for refinement
      const aiInput = {
        destination: activityPrefs.destination,
        arrivalCity: activityPrefs.arrivalCity,
        departureCity: activityPrefs.departureCity,
        dates: activityPrefs.arrivalDate && activityPrefs.returnDate ? `${activityPrefs.arrivalDate} to ${activityPrefs.returnDate}` : 'Flexible dates', // Construct dates string
        numberOfDays: activityPrefs.numberOfDays,
        specificLocations: activityPrefs.specificLocations.join(', ') || activityPrefs.otherLocationInput || undefined, // Combine specific locations and other input
        desiredActivities: activityPrefs.desiredActivityCategories.join(', ') + (activityPrefs.desiredActivities.length > 0 ? ', ' + activityPrefs.desiredActivities.join(', ') : ''), // Combine categories and specific desires
        feedback: `Suggest more activities. The user has already selected these activities: ${selectedActivities.join(', ')}. Please provide new suggestions that complement these or explore related options based on their original preferences.`, // Provide feedback
      };

      console.log("Calling generatePreliminaryTravelPlan for more suggestions with:", aiInput);
      const result = await generatePreliminaryTravelPlan(aiInput);
      console.log("Received more AI suggestions:", result);

       // Combine points of interest names/locations and activity strings from the new suggestions
      const newSuggestions = [
        ...(result.pointsOfInterest || []).map(poi => `${poi.name} (${poi.location})`),
        ...(result.activities || []),
      ];

      // Combine existing displayed activities with new ones, avoiding duplicates
      // Ensure previously selected activities remain in the displayed list if they weren't already.
      setDisplayedActivities(prev => Array.from(new Set([...prev, ...selectedActivities, ...newSuggestions])));

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
  const handleActivitySelectionChange = (activity: string, isChecked: boolean) => {
    setSelectedActivities(prev => {
      if (isChecked) {
        return Array.from(new Set([...prev, activity])); // Add, ensuring uniqueness
      } else {
        return prev.filter(item => item !== activity); // Remove
      }
    });
  };

  // --- Derived State ---
  const isCreateDisabled = useMemo(() => {
      return isLoading || isSuggestingMore || !!validateSelection();
  }, [isLoading, isSuggestingMore, selectedActivities]);

  const createHintText = useMemo(() => {
      if (isLoading || isSuggestingMore) return null;
      return validateSelection();
  }, [isLoading, isSuggestingMore, selectedActivities]);

  // --- Render Logic ---
  if (loadingError) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-3xl">
        <Card className="border-red-500">
          <CardHeader><CardTitle className="text-red-600">Error</CardTitle></CardHeader>
          <CardContent>
            <p className="text-red-600">{loadingError}</p>
            <Button onClick={() => router.push('/locations-and-dates')} className="mt-4">Start Over</Button>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  if (!activityPrefs) {
    // While activityPrefs are loading, show the initial loader.
    // The fetchSuggestions async function takes over loading state once prefs are loaded.
     if (isLoading) {
      return (
        <div className="container mx-auto p-4 md:p-8 max-w-3xl flex justify-center items-center min-h-screen-minus-header">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading preferences and suggestions...</span>
        </div>
      );
     }
     // If no error and not loading, but no prefs, something is wrong.
     return null; // Or a specific error state if needed
  }

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
            <Label className="text-lg font-semibold">Suggested Activities & Points of Interest</Label>
            {isLoading && displayedActivities.length === 0 ? (
               <div className="flex justify-center items-center p-8">
                 <Loader2 className="h-6 w-6 animate-spin text-primary" />
                 <span className="ml-2">Fetching initial suggestions...</span>
               </div>
            ) : displayedActivities.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 p-2 border rounded-md">
                {displayedActivities.map((activity) => {
                  // Simple hash or sanitized string for a key/id
                  const activityId = `suggested-${activity.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 20)}-${Math.random().toString(36).substring(2, 7)}`;
                  return (
                    <div key={activityId} className="flex items-center space-x-2">
                      <Checkbox
                        id={activityId}
                        checked={selectedActivities.includes(activity)}
                        onCheckedChange={(checked) => handleActivitySelectionChange(activity, !!checked)}
                        aria-labelledby={`${activityId}-label`}
                      />
                      <Label htmlFor={activityId} id={`${activityId}-label`} className="font-normal cursor-pointer">
                        {activity}
                        {/* TODO: Add description here when AI provides it */}
                      </Label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                {isSuggestingMore ? "Loading suggestions..." : "No suggestions available based on your preferences."}
              </p>
            )}
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

