"use client";

// --- Core React/Next Imports ---
import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

// --- Third-Party Libraries ---
import { format } from "date-fns";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";

// --- Internal Libs & Utils ---
import { cn } from "@/lib/utils";

// --- Hooks ---
import { useToast } from "@/hooks/use-toast";

// --- API/AI Calls & TYPES ---
import {
  generatePreliminaryTravelPlan,
  generateTravelPlan, // Import both functions
  type GenerateTravelPlanInput,
  type PreliminaryPlanOutput, // Import the new type
  type GenerateTravelPlanOutput,
} from "@/ai/flows/generate-travel-itinerary";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toaster";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// --- Data Imports ---
// Consider fetching these server-side or dynamically if they become very large
import countryData from "@/data/countries.json";
import activityData from "@/data/activities.json";

// --- Types ---
interface CountryData {
  countryCodeMap: { [key: string]: string[] };
  alternativeCountryNames: { [key: string]: string };
}

interface ActivityGroup {
  theme: string;
  activities: string[];
}
interface ActivityData {
  activityGroups: ActivityGroup[];
}

type ValidationResult = string | null; // Error message or null if valid

// --- Constants ---
const SESSION_STORAGE_PLAN_KEY = "generatedPlan";
const SESSION_STORAGE_PRELIMINARY_KEY = "preliminaryPlan"; // Added key
const TOAST_DESTRUCTIVE_VARIANT = "destructive" as const;
const TOAST_DEFAULT_VARIANT = "default" as const;
const TOAST_DURATION_MS = 5000;

// --- Data Extraction ---
// Type assertion is okay here, assuming the JSON structure is reliable.
// Add runtime checks if the source could be unreliable.
const { countryCodeMap, alternativeCountryNames } = countryData as CountryData;
const { activityGroups } = activityData as ActivityData; // Renamed for clarity below


export default function TravelPreferences() {
  // --- State ---
  const [destination, setDestination] = useState("");
  const [arrivalCity, setArrivalCity] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [arrivalDate, setArrivalDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [numberOfDays, setNumberOfDays] = useState<string>(""); // Keep as string for input control
  const [specificLocations, setSpecificLocations] = useState<string[]>([]);
  const [otherLocationInput, setOtherLocationInput] = useState("");
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [desiredActivities, setDesiredActivities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- Hooks ---
  const router = useRouter();
  const { toast } = useToast();

  // --- Validation Logic ---
  // Returns error message string if invalid, null otherwise
  const validateForm = (): ValidationResult => {
    const destinationTrimmed = destination.trim();
    const arrivalCityTrimmed = arrivalCity.trim();
    const departureCityTrimmed = departureCity.trim();
    const numberOfDaysTrimmed = numberOfDays.trim();
    const numDaysInt = parseInt(numberOfDaysTrimmed, 10);
    const isValidNumDays = !isNaN(numDaysInt) && numDaysInt > 0;
    const hasActivities = desiredActivities.filter(Boolean).length > 0;

    if (!destinationTrimmed) return "Please enter a destination.";
    if (!arrivalCityTrimmed) return "Please enter the arrival city.";
    if (!departureCityTrimmed) return "Please enter the departure city.";
    if (!hasActivities) return "Please select at least one desired activity.";

    // Check if either date or valid duration is provided
    if (!arrivalDate && !isValidNumDays) {
        return "Please select an arrival date OR enter a valid number of days (positive whole number).";
    }

    // Check if ONLY number of days is provided and if it's valid
    if (!arrivalDate && numberOfDaysTrimmed && !isValidNumDays) {
        return "Number of days must be a positive whole number.";
    }

    // Check date consistency if both are provided
    if (arrivalDate && returnDate && returnDate < arrivalDate) {
      return "Return date cannot be before the arrival date.";
    }

    return null; // Form is valid
  };

  // --- Data Preparation Logic ---
  const prepareApiInput = (): GenerateTravelPlanInput | null => {
    // Combine pre-selected and manually added locations, ensuring uniqueness
    const manuallyAddedLocations = otherLocationInput
      .split(",")
      .map((loc) => loc.trim())
      .filter(Boolean);
    const allSpecificLocations = Array.from(
      new Set([...specificLocations, ...manuallyAddedLocations])
    );
    const specificLocationsString =
      allSpecificLocations.length > 0 ? allSpecificLocations.join(", ") : undefined;

    // Prepare activities string
    const desiredActivitiesString = desiredActivities.filter(Boolean).join(", ").trim();
    if (!desiredActivitiesString) {
        console.error("Validation passed but no desired activities string could be generated.");
        // This case should ideally be caught by validateForm, but defensive check is okay
        return null;
    }

    // Prepare dates/duration string and numberOfDays for API
    let datesString = "";
    let finalNumberOfDaysForApi: number | undefined = undefined;
    const numDaysInt = parseInt(numberOfDays.trim(), 10);
    const isValidNumDays = !isNaN(numDaysInt) && numDaysInt > 0;

    if (arrivalDate) {
      const formattedArrival = format(arrivalDate, "yyyy-MM-dd");
      if (returnDate) {
        // Case 1: Arrival and Return Date
        datesString = `${formattedArrival} to ${format(returnDate, "yyyy-MM-dd")}`;
      } else if (isValidNumDays) {
        // Case 2: Arrival Date and Number of Days
        datesString = `${formattedArrival} for ${numDaysInt} days`;
      } else {
        // Case 3: Only Arrival Date (treat as single day or unspecified duration trip starting then)
        // The AI might need guidance on how to interpret this.
        // Consider making either Return Date or Number of Days mandatory if Arrival Date is set.
        // For now, just sending the arrival date.
        datesString = formattedArrival;
        // Or potentially: datesString = `Starting ${formattedArrival}`;
      }
    } else if (isValidNumDays) {
      // Case 4: Only Number of Days
      datesString = `Trip for ${numDaysInt} days`;
      finalNumberOfDaysForApi = numDaysInt; // Explicitly pass number of days
    } else {
      // This state should not be reached if validateForm is correct
      console.error("Invalid date/duration state reached preparation stage.");
      return null;
    }

    const input: GenerateTravelPlanInput = {
      destination: destination.trim(),
      arrivalCity: arrivalCity.trim(),
      departureCity: departureCity.trim(),
      dates: datesString,
      numberOfDays: finalNumberOfDaysForApi, // May be undefined
      specificLocations: specificLocationsString, // May be undefined
      desiredActivities: desiredActivitiesString,
      feedback: undefined, // Assuming feedback is handled elsewhere or not used initially
    };

    // Basic check to ensure core fields were somehow prepared, though validateForm should guarantee this.
    if (!input.destination || !input.arrivalCity || !input.departureCity || !input.dates || !input.desiredActivities) {
      console.error("Data preparation failed unexpectedly:", input);
      toast({ title: "Internal Error", description: "Failed to prepare data correctly.", variant: TOAST_DESTRUCTIVE_VARIANT });
      return null;
    }

    return input;
  };

  // --- City Lookup Helper ---
  // Use useCallback as it depends on potentially large JSON data structures referenced from outside.
  // If countryData was state or props, useCallback would be essential. Here it's less critical but good practice.
  const cityLookup = useCallback(
    (dest: string): string[] => {
      const destLower = dest.trim().toLowerCase();
      if (!destLower) return [];

      // Check alternative names first, then direct match
      const standardizedDestination = alternativeCountryNames[destLower] || destLower;

      // Use hasOwnProperty for safer lookup
      if (Object.prototype.hasOwnProperty.call(countryCodeMap, standardizedDestination)) {
        return countryCodeMap[standardizedDestination] || [];
      }

      // No need for the second check if the first one covers both cases via standardizedDestination
      // if (alternativeCountryNames[destLower] && countryCodeMap.hasOwnProperty(alternativeCountryNames[destLower])) {
      //    return countryCodeMap[alternativeCountryNames[destLower]] || [];
      // }

      return []; // Not found
    },
    [countryCodeMap, alternativeCountryNames] // Dependencies
  );

  // --- Event Handlers ---
  const handleGeneratePlan = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Missing Information",
        description: validationError,
        variant: TOAST_DESTRUCTIVE_VARIANT,
      });
      return;
    }

    const inputData = prepareApiInput();
    if (!inputData) {
        // Specific error toast would have been shown in prepareApiInput or validateForm
        return;
    }

    setIsLoading(true);

    try {
      console.log("Generating plan with input:", JSON.stringify(inputData, null, 2));
      const result: PreliminaryPlanOutput = await generatePreliminaryTravelPlan(inputData); // Call preliminary flow
      //const generatedPlan = result?.plan; // Optional chaining for safety

      // Store the preliminary data in session storage
      sessionStorage.setItem(SESSION_STORAGE_PRELIMINARY_KEY, JSON.stringify(result));
      toast({
        title: "Success!",
        description: "Preliminary plan generated. Review and provide feedback!",
        variant: TOAST_DEFAULT_VARIANT,
      });
      router.push(`/review-plan`); // Navigate to the review page

      /*
      // Check if the result is a non-empty array
      if (Array.isArray(generatedPlan) && generatedPlan.length > 0) {
        sessionStorage.setItem(SESSION_STORAGE_PLAN_KEY, JSON.stringify(generatedPlan));
        toast({
          title: "Success!",
          description: "Your travel plan is ready!",
          variant: TOAST_DEFAULT_VARIANT,
        });
        router.push(`/planner`); // Navigate to the planner page
      } else {
        console.warn("generateTravelPlan returned successfully but with an empty or invalid plan:", result);
        toast({
          title: "Plan Generation Issue",
          description: result?.feedback || "Could not generate specific activities. Try adjusting your preferences or destination.",
          variant: TOAST_DESTRUCTIVE_VARIANT,
          duration: TOAST_DURATION_MS,
        });
      }
      */
    } catch (error) {
      console.error("Error generating travel plan:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: "Generation Failed",
        description: `Could not generate plan: ${errorMessage} Please check your input or try again later.`,
        variant: TOAST_DESTRUCTIVE_VARIANT,
        duration: TOAST_DURATION_MS,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDestinationChange = useCallback(
    (newDestinationValue: string) => {
      // No need to trim here if Input component handles it or if lookup is case-insensitive
      setDestination(newDestinationValue);
      const cities = cityLookup(newDestinationValue);
      setAvailableCities(cities);
      // Reset dependent fields
      setSpecificLocations([]);
      setOtherLocationInput("");
      setArrivalCity(""); // Reset arrival/departure if destination changes
      setDepartureCity("");
    },
    [cityLookup] // Dependency: cityLookup function
  );

  // Generic toggle helper using useCallback to maintain reference stability if passed down
  const toggleSelection = useCallback(
    (
      item: string,
      currentSelection: string[],
      setSelection: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
      setSelection((prev) =>
        prev.includes(item)
          ? prev.filter((val) => val !== item) // Remove item
          : [...prev, item] // Add item
      );
    },
    [] // No dependencies, relies only on arguments
  );

  const toggleSpecificLocation = useCallback(
    (location: string) => {
      toggleSelection(location, specificLocations, setSpecificLocations);
    },
    [specificLocations, toggleSelection] // Dependencies
  );

  const toggleDesiredActivity = useCallback(
    (activity: string) => {
      toggleSelection(activity, desiredActivities, setDesiredActivities);
    },
    [desiredActivities, toggleSelection] // Dependencies
  );

  // Handles input for number of days, allowing only positive integers or empty string
  const handleNumberOfDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or positive integers
    if (value === "" || /^[1-9]\d*$/.test(value)) {
        setNumberOfDays(value);
        // If user enters a number of days, clear the return date (they are mutually exclusive ways to define duration)
        if (value !== "" && returnDate) {
            setReturnDate(undefined);
        }
    } else if (value === "0") {
        // Optionally prevent zero if it's invalid, or handle it if needed
        // setNumberOfDays(""); // Or keep '0' if allowed briefly before validation catches it
    }
  };

  const handleArrivalDateSelect = (date: Date | undefined) => {
    setArrivalDate(date);
    // If arrival date is cleared, return date must also be cleared
    if (!date) {
      setReturnDate(undefined);
    }
    // If arrival date is set, we might want to clear numberOfDays if returnDate isn't also set?
    // Current logic: numberOfDays can coexist with arrivalDate if returnDate is not set.
  };

  const handleReturnDateSelect = (date: Date | undefined) => {
    setReturnDate(date);
    // If a return date is selected, clear the 'numberOfDays' input
    if (date && numberOfDays !== "") {
      setNumberOfDays("");
    }
  };

  // --- Derived State & Render Logic ---
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0); // Normalize to start of day
    return d;
  }, []); // Calculate only once on component mount

  // Calculate disabled state and hint text together
  const { isDisabled: isSubmitDisabled, hint: submitHintText } = useMemo(() => {
      const validationError = validateForm(); // Reuse validation logic
      const isDisabled = isLoading || !!validationError; // Disabled if loading or any validation error exists
      const hint = isLoading ? null : validationError; // Show validation error as hint when not loading
      return { isDisabled, hint };
  }, [isLoading, destination, arrivalCity, departureCity, desiredActivities, arrivalDate, numberOfDays, returnDate]); // Ensure all relevant states are dependencies


  // --- JSX ---
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Travel Preferences</CardTitle>
          <CardDescription>
            Fill out the form below to generate a personalized itinerary. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">Destination (Country or Major Region) *</Label>
            <Input
              id="destination"
              placeholder="e.g., Japan, Italy, California Coast"
              value={destination}
              onChange={(e) => handleDestinationChange(e.target.value)}
              // required attribute is good for browser validation, but custom validation handles it too
            />
          </div>

          {/* Arrival/Departure Cities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="arrivalCity">Destination Arrival City *</Label>
              <Input
                id="arrivalCity"
                placeholder="e.g., Tokyo, Rome, Los Angeles (LAX)"
                value={arrivalCity}
                onChange={(e) => setArrivalCity(e.target.value)}
                disabled={!destination.trim()} // Disable if no destination
              />
            </div>
            <div className="space-y-2">
                <Label htmlFor="departureCity">Destination Departure City *</Label>
                <Input
                  id="departureCity"
                  placeholder="e.g., Osaka, Florence, San Francisco (SFO)"
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                  disabled={!destination.trim()} // Disable if no destination
                />
            </div>
          </div>

          {/* Dates / Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Arrival Date */}
            <div className="space-y-2">
                <Label htmlFor="arrivalDatePopover">Arrival Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                      <Button
                        id="arrivalDatePopover" // ID on the trigger
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !arrivalDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {arrivalDate ? format(arrivalDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={arrivalDate}
                        onSelect={handleArrivalDateSelect}
                        disabled={(date) => date < today} // Disable past dates
                        initialFocus
                      />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">Required unless using Number of Days.</p>
            </div>

            {/* Return Date */}
            <div className="space-y-2">
                <Label htmlFor="returnDatePopover">Return Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                      <Button
                          id="returnDatePopover" // ID on the trigger
                          variant={"outline"}
                          className={cn(
                          "w-full justify-start text-left font-normal",
                          !returnDate && "text-muted-foreground"
                          )}
                          disabled={!arrivalDate || !!numberOfDays.trim()} // Disable if no arrival date or if number of days is filled
                      >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {returnDate ? format(returnDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                          mode="single"
                          selected={returnDate}
                          onSelect={handleReturnDateSelect}
                          disabled={(date) => date < (arrivalDate || today)} // Disable dates before arrival date
                          initialFocus
                      />
                    </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">Optional. Clears 'Number of Days'.</p>
            </div>

            {/* Number of Days */}
            <div className="space-y-2">
              <Label htmlFor="numberOfDays">Number of Days</Label>
              <Input
                id="numberOfDays"
                type="text" // Use text to allow empty string and better control
                inputMode="numeric" // Hint for mobile keyboards
                pattern="[1-9]\d*" // Pattern for validation hint (positive integers)
                placeholder="e.g., 7"
                value={numberOfDays}
                onChange={handleNumberOfDaysChange}
                disabled={!!returnDate} // Disable if return date is selected
              />
              <p className="text-xs text-muted-foreground">Use if no Return Date. Clears 'Return Date'.</p>
            </div>
          </div>

          {/* Specific Locations */}
          <div className="space-y-2">
              <Label>Specific Locations (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Select suggested cities for '{destination.trim() || "your destination"}' or add your own below.
              </p>
              {/* Use availableCities directly */}
              {availableCities.length > 0 && (
                <ScrollArea className="h-32 w-full rounded-md border p-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2"> {/* Adjusted grid for responsiveness */}
                    {availableCities.map((city) => {
                      const cityId = `city-${city.replace(/\s+/g, '-').toLowerCase()}`;
                      return (
                        <div key={cityId} className="flex items-center space-x-2">
                          <Checkbox
                            id={cityId}
                            checked={specificLocations.includes(city)}
                            onCheckedChange={() => toggleSpecificLocation(city)}
                            aria-labelledby={`${cityId}-label`} // Associate label for screen readers
                          />
                          <Label htmlFor={cityId} id={`${cityId}-label`} className="font-normal cursor-pointer">
                            {city}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
              <div className="pt-2 space-y-1">
                  <Label htmlFor="otherLocations" className="text-sm font-medium">
                  Add other specific places (comma-separated)
                  </Label>
                  <Input
                    id="otherLocations"
                    placeholder="e.g., Eiffel Tower, Kyoto, Zion National Park"
                    value={otherLocationInput}
                    onChange={(e) => setOtherLocationInput(e.target.value)}
                    disabled={!destination.trim()} // Disable if no destination
                  />
              </div>
          </div>

          {/* Desired Activities */}
          <div className="space-y-2">
            <Label>Desired Activities *</Label>
            <p className="text-sm text-muted-foreground">Select your interests by category. At least one activity overall is required.</p>
            <Accordion type="multiple" className="w-full">
              {/* Use activityGroups directly */}
              {activityGroups.map((group, index) => (
                <AccordionItem key={group.theme} value={`item-${index}`}>
                  <AccordionTrigger>{group.theme}</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 p-2"> {/* Adjusted grid */}
                      {group.activities.map((activity) => {
                        const activityId = `activity-${activity.replace(/\s+/g, '-').toLowerCase()}`;
                        return (
                          <div key={activityId} className="flex items-center space-x-2">
                            <Checkbox
                              id={activityId}
                              checked={desiredActivities.includes(activity)}
                              onCheckedChange={() => toggleDesiredActivity(activity)}
                              aria-labelledby={`${activityId}-label`} // Associate label
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
                type="button" // Explicitly type="button" if not submitting a native form
                onClick={handleGeneratePlan}
                disabled={isSubmitDisabled}
                className="w-full md:w-auto px-8 py-3"
                size="lg"
                aria-describedby={submitHintText ? "submit-hint" : undefined} // Link hint for screen readers
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Generating Plan...
                  </>
                ) : (
                  'Generate Preliminary Plan' // Changed button text
                )}
              </Button>
              {/* Display hint text if submission is disabled and not currently loading */}
              {isSubmitDisabled && !isLoading && submitHintText && (
                <p id="submit-hint" className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {submitHintText}
                </p>
              )}
          </div>
        </CardContent>
      </Card>
      <Toaster /> {/* Ensure Toaster is included to display toasts */}
    </div>
  );
}
