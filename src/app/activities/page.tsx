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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// --- Data Imports ---
import activityData from "@/data/activities.json";

// --- Types ---
// Interface for the data loaded from the previous step
interface LocationDateData {
  destination: string;
  arrivalCity: string;
  departureCity: string;
  arrivalDate?: string; // ISO string
  returnDate?: string; // ISO string
  numberOfDays?: number;
  specificLocations: string[];
  otherLocationInput: string;
}

// Interface for the data to be stored from this step
interface ActivityPreferencesData extends LocationDateData {
    desiredActivityCategories: string[]; // Store selected categories/themes
    desiredActivities: string[]; // Store specific selected activities
    // TODO: Add suggestedActivities: ActivitySuggestion[] later
}

interface ActivityGroup {
  theme: string;
  activities: string[];
}
interface ActivityData {
  activityGroups: ActivityGroup[];
}

type ValidationResult = string | null;

// --- Constants ---
const SESSION_STORAGE_LOCATIONS_DATES_KEY = "locationDateData";
const SESSION_STORAGE_ACTIVITY_PREFS_KEY = "activityPreferencesData"; // New key for this step's data
const TOAST_DESTRUCTIVE_VARIANT = "destructive" as const;
const TOAST_DEFAULT_VARIANT = "default" as const;
const TOAST_DURATION_MS = 5000;

// --- Data Extraction ---
const { activityGroups } = activityData as ActivityData;

export default function ActivitiesPage() {
  // --- State ---
  const [locationDateInfo, setLocationDateInfo] = useState<LocationDateData | null>(null);
  const [desiredActivities, setDesiredActivities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // --- Hooks ---
  const router = useRouter();
  const { toast } = useToast();

  // --- Load Data on Mount ---
  useEffect(() => {
    const storedData = sessionStorage.getItem(SESSION_STORAGE_LOCATIONS_DATES_KEY);
    if (storedData) {
      try {
        const parsedData: LocationDateData = JSON.parse(storedData);
        setLocationDateInfo(parsedData);
        console.log("Loaded Location/Date Data:", parsedData);
      } catch (error) {
        console.error("Failed to parse location/date data from sessionStorage:", error);
        setLoadingError("Could not load previous step data. Please go back.");
        toast({ title: "Error", description: "Failed to load location/date data.", variant: TOAST_DESTRUCTIVE_VARIANT });
      }
    } else {
      setLoadingError("No location/date data found. Please start from the previous step.");
      // Redirect back or show error prominently
      // router.push('/locations-and-dates'); // Option: redirect immediately
    }
  }, [router, toast]); // Added dependencies

  // --- Validation Logic ---
  const validateForm = (): ValidationResult => {
    if (!locationDateInfo) return "Location and date data is missing."; // Should not happen if loading logic is correct
    const hasActivities = desiredActivities.filter(Boolean).length > 0;
    if (!hasActivities) return "Please select at least one desired activity or interest.";
    return null; // Form is valid
  };

  // --- Event Handlers ---
  const handleConfirmActivityPreferences = async () => { // Made async for future AI call
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Missing Information",
        description: validationError,
        variant: TOAST_DESTRUCTIVE_VARIANT,
      });
      return;
    }

    if (!locationDateInfo) {
      toast({ title: "Error", description: "Cannot proceed without location data.", variant: TOAST_DESTRUCTIVE_VARIANT });
      return;
    }

    setIsLoading(true);

    try {
        // ** Placeholder for AI Call **
        // In the future, this is where you'd call the AI function:
        // const suggestionsInput = { ...locationDateInfo, desiredActivities };
        // const suggestedActivitiesResult = await generateActivitySuggestions(suggestionsInput);

        // For now, just prepare the data to be saved
        const activityPrefsData: ActivityPreferencesData = {
            ...locationDateInfo,
            desiredActivityCategories: [], // TODO: Determine how to capture selected categories if needed
            desiredActivities: desiredActivities,
            // suggestedActivities: suggestedActivitiesResult // Add this when AI call is implemented
        };

        // Store the combined data in session storage
        sessionStorage.setItem(SESSION_STORAGE_ACTIVITY_PREFS_KEY, JSON.stringify(activityPrefsData));
        console.log("Stored Activity Preferences Data:", JSON.stringify(activityPrefsData, null, 2));

        toast({
            title: "Activity Preferences Confirmed",
            description: "Next, review suggested activities.", // Updated description
            variant: TOAST_DEFAULT_VARIANT,
        });

        // Navigate to the suggested activities page
        router.push('/suggested-activities');

    } catch (error) {
        console.error("Error processing activity preferences:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({
            title: "Error Proceeding",
            description: `Could not process preferences: ${errorMessage}`,
            variant: TOAST_DESTRUCTIVE_VARIANT,
            duration: TOAST_DURATION_MS,
        });
    } finally {
        setIsLoading(false);
    }
  };

  const toggleSelection = useCallback(
    (
      item: string,
      currentSelection: string[],
      setSelection: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
      setSelection((prev) =>
        prev.includes(item)
          ? prev.filter((val) => val !== item)
          : [...prev, item]
      );
    },
    []
  );

  const toggleDesiredActivity = useCallback(
    (activity: string) => {
      toggleSelection(activity, desiredActivities, setDesiredActivities);
    },
    [desiredActivities, toggleSelection]
  );

  // --- Derived State ---
  const isSubmitDisabled = useMemo(() => {
      return isLoading || !!validateForm() || !locationDateInfo;
  }, [isLoading, desiredActivities, locationDateInfo]); // Added locationDateInfo dependency

  const submitHintText = useMemo(() => {
      if (isLoading) return null;
      if (!locationDateInfo) return "Loading previous data failed.";
      return validateForm(); // Returns null if valid, or the error message
  }, [isLoading, desiredActivities, locationDateInfo]);

  // --- Render Logic ---
  if (loadingError) {
    // Render an error state if data loading failed
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-3xl">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{loadingError}</p>
            <Button onClick={() => router.push('/locations-and-dates')} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  if (!locationDateInfo) {
    // Render a loading state while data is being loaded
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-3xl flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading previous data...</span>
      </div>
    );
  }

  // --- Main JSX ---
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Activity Preferences</CardTitle>
          <CardDescription>
            Select your interests for {locationDateInfo.destination || "your destination"}. At least one selection is required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Desired Activities */}
          <div className="space-y-2">
            <Label>Select Interests *</Label>
            <p className="text-sm text-muted-foreground">Choose activities or themes you enjoy.</p>
            <Accordion type="multiple" className="w-full">
              {activityGroups.map((group, index) => (
                <AccordionItem key={group.theme} value={`item-${index}`}>
                  <AccordionTrigger>{group.theme}</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 p-2">
                      {group.activities.map((activity) => {
                        const activityId = `activity-${activity.replace(/\s+/g, '-').toLowerCase()}`;
                        return (
                          <div key={activityId} className="flex items-center space-x-2">
                            <Checkbox
                              id={activityId}
                              checked={desiredActivities.includes(activity)}
                              onCheckedChange={() => toggleDesiredActivity(activity)}
                              aria-labelledby={`${activityId}-label`}
                            />
                            <Label htmlFor={activityId} id={`${activityId}-label`} className="font-normal cursor-pointer">
                              {activity}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Submit Button & Hint */}
          <div className="flex flex-col items-center space-y-2 pt-4">
              <Button
                type="button"
                onClick={handleConfirmActivityPreferences}
                disabled={isSubmitDisabled}
                className="w-full md:w-auto px-8 py-3"
                size="lg"
                aria-describedby={submitHintText ? "submit-hint" : undefined}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Processing...
                  </>
                ) : (
                  'Confirm Activity Preferences' // Changed button text
                )}
              </Button>
              {isSubmitDisabled && !isLoading && submitHintText && (
                <p id="submit-hint" className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {submitHintText}
                </p>
              )}
          </div>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}
