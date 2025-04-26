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
import { generatePreliminaryTravelPlan, PreliminaryPlanOutput } from "@/ai/flows/generate-travel-itinerary"; // Import the AI function and the new type

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
interface SelectedActivity {
  location: string;
  type: string;
  name: string;
  description: string;
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
  // State to hold the activities currently displayed (initially from AI) - now nested structure
  const [displayedActivities, setDisplayedActivities] = useState<PreliminaryPlanOutput | null>(null);
  // State to track which activities the user has checked - now stores structured info
  const [selectedActivities, setSelectedActivities] = useState<SelectedActivity[]>([]);
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
              dates: prefs.arrivalDate && prefs.returnDate ? `${prefs.arrivalDate} to ${prefs.returnDate}` : 'Flexible dates', // Construct dates string
              numberOfDays: prefs.numberOfDays,
              specificLocations: prefs.specificLocations.join(', ') || prefs.otherLocationInput || undefined, // Combine specific locations and other input
              desiredActivities: prefs.desiredActivityCategories.join(', ') + (prefs.desiredActivities.length > 0 ? ', ' + prefs.desiredActivities.join(', ') : ''), // Combine categories and specific desires
              feedback: undefined, // No feedback on initial load
            };

            console.log("Calling generatePreliminaryTravelPlan with:", aiInput);
            const result = await generatePreliminaryTravelPlan(aiInput);
            console.log("Received AI suggestions:", JSON.stringify(result, null, 2)); // Log the structured result

            setDisplayedActivities(result);
            setSelectedActivities([]); // Start with no activities selected from the new suggestions
            // Open the first location and its first activity type accordion by default
            if (result && result.length > 0) {
              const firstLocationId = `location-${result[0].location.replace(/\s+/g, '-').toLowerCase()}`;
               if (result[0].activityTypes.length > 0) {
                 const firstActivityTypeId = `activity-type-${result[0].activityTypes[0].type.replace(/\s+/g, '-').toLowerCase()}`;
                 setOpenAccordionItems([firstLocationId, firstActivityTypeId]);
               } else {
                 setOpenAccordionItems([firstLocationId]);
               }
            }

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
        // Flatten selected activities into a string list for the final plan input
        const selectedActivityNamesAndLocations = selectedActivities.map(activity => `${activity.name} (${activity.location})`).join(', ');

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
      // --- Call AI to get more suggestions ---
      // Pass selected activities as feedback for refinement
      const selectedActivityNames = selectedActivities.map(activity => activity.name).join(', ');

      const aiInput = {
        destination: activityPrefs.destination,
        arrivalCity: activityPrefs.arrivalCity,
        departureCity: activityPrefs.departureCity,
        dates: activityPrefs.arrivalDate && activityPrefs.returnDate ? `${activityPrefs.arrivalDate} to ${activityPrefs.returnDate}` : 'Flexible dates', // Construct dates string
        numberOfDays: activityPrefs.numberOfDays,
        specificLocations: activityPrefs.specificLocations.join(', ') || activityPrefs.otherLocationInput || undefined, // Combine specific locations and other input
        desiredActivities: activityPrefs.desiredActivityCategories.join(', ') + (activityPrefs.desiredActivities.length > 0 ? ', ' + activityPrefs.desiredActivities.join(', ') : ''), // Combine categories and specific desires
        feedback: selectedActivityNames.length > 0 ? `Suggest more activities. The user has already selected these: ${selectedActivityNames}. Please provide new suggestions that complement these or explore related options based on their original preferences.` : 'Suggest more activities based on the original preferences.',
      };

      console.log("Calling generatePreliminaryTravelPlan for more suggestions with:", aiInput);
      const result = await generatePreliminaryTravelPlan(aiInput);
      console.log("Received more AI suggestions:", JSON.stringify(result, null, 2));

      // Merge new suggestions with existing ones
      setDisplayedActivities(prev => {
        if (!prev) return result; // If no previous data, just set the new result

        const updatedActivities = [...prev];

        result.forEach(newLocationGroup => {
          const existingLocationIndex = updatedActivities.findIndex(loc => loc.location === newLocationGroup.location);

          if (existingLocationIndex > -1) {
            // Location exists, merge activity types
            newLocationGroup.activityTypes.forEach(newActivityTypeGroup => {
              const existingActivityTypeIndex = updatedActivities[existingLocationIndex].activityTypes.findIndex(type => type.type === newActivityTypeGroup.type);

              if (existingActivityTypeIndex > -1) {
                // Activity type exists, merge suggestions
                const existingSuggestions = updatedActivities[existingLocationIndex].activityTypes[existingActivityTypeIndex].suggestions;
                const newSuggestions = newActivityTypeGroup.suggestions;
                // Combine and remove duplicates based on name and description
                const mergedSuggestions = Array.from(new Map([
                    ...existingSuggestions.map(item => [item.name + item.description, item]),
                    ...newSuggestions.map(item => [item.name + item.description, item]),
                ]).values());

                updatedActivities[existingLocationIndex].activityTypes[existingActivityTypeIndex].suggestions = mergedSuggestions;
              } else {
                // New activity type for existing location
                updatedActivities[existingLocationIndex].activityTypes.push(newActivityTypeGroup);
              }
            });
          } else {
            // New location
            updatedActivities.push(newLocationGroup);
          }
        });

        return updatedActivities;
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
  const handleActivitySelectionChange = (activity: SelectedActivity, isChecked: boolean) => {
    setSelectedActivities(prev => {
      if (isChecked) {
        // Add, ensuring uniqueness based on location, type, and name
        if (!prev.some(item => item.location === activity.location && item.type === activity.type && item.name === activity.name)) {
             return [...prev, activity];
        }
        return prev; // Already exists, return previous state
      } else {
        // Remove
        return prev.filter(item => !(item.location === activity.location && item.type === activity.type && item.name === activity.name));
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
            <Button onClick={() => router.push('/locations-and-dates')} className="mt-4">Start Over</Button>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  if (isLoading && !displayedActivities) {
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
            {displayedActivities && displayedActivities.length > 0 ? (
              <Accordion type="multiple" value={openAccordionItems} onValueChange={handleAccordionChange} className="w-full">
                {displayedActivities.map((locationGroup) => (
                  <AccordionItem key={locationGroup.location} value={`location-${locationGroup.location.replace(/\s+/g, '-').toLowerCase()}`}>
                    <AccordionTrigger className="text-base font-semibold">{locationGroup.location}</AccordionTrigger>
                    <AccordionContent className="space-y-4 pl-4">
                      {locationGroup.activityTypes.map((activityTypeGroup) => (
                        <Accordion type="multiple" key={`${locationGroup.location}-${activityTypeGroup.type}`} value={openAccordionItems} onValueChange={handleAccordionChange} className="w-full border-l pl-4">
                           <AccordionItem value={`activity-type-${activityTypeGroup.type.replace(/\s+/g, '-').toLowerCase()}`}>
                             <AccordionTrigger className="text-sm font-medium italic">{activityTypeGroup.type}</AccordionTrigger>
                             <AccordionContent className="space-y-2 pl-4">
                               {activityTypeGroup.suggestions.map((suggestion) => {
                                 // Create a unique key/id for each suggestion
                                 const activityUniqueKey = `${locationGroup.location}-${activityTypeGroup.type}-${suggestion.name}`;
                                 const activityId = `activity-${uuidv4()}`;
                                 const isSelected = selectedActivities.some(item =>
                                     item.location === locationGroup.location &&
                                     item.type === activityTypeGroup.type &&
                                     item.name === suggestion.name
                                 );
                                 const activityObject = { ...suggestion, location: locationGroup.location, type: activityTypeGroup.type };

                                 return (
                                   <div key={activityUniqueKey} className="flex items-start space-x-2">
                                     <Checkbox
                                       id={activityId}
                                       checked={isSelected}
                                       onCheckedChange={(checked) => handleActivitySelectionChange(activityObject, !!checked)}
                                       aria-labelledby={`${activityId}-label`}
                                       className="mt-1"
                                     />
                                     <div className="grid gap-1.5 leading-none">
                                         <Label htmlFor={activityId} id={`${activityId}-label`} className="font-normal cursor-pointer">
                                             {suggestion.name}
                                         </Label>
                                         <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                                     </div>
                                   </div>
                                 );
                               })}
                             </AccordionContent>
                           </AccordionItem>
                        </Accordion>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : ( !isLoading &&
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

