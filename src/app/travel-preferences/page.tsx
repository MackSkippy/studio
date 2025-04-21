"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Updated import path and function name
import { generateTravelPlan } from "@/ai/flows/generate-travel-itinerary"; // Assuming this returns { plan: YourPlanType } | null

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react"; // Import a loader icon

// Import data from JSON files (Consider defining types/interfaces for these)
import countryData from "@/data/countries.json";
import activityData from "@/data/activities.json";

// Define interfaces for better type safety (Example structure)
interface CountryData {
  countryCodeMap: { [key: string]: string[] };
  alternativeCountryNames: { [key: string]: string };
}

interface ActivityData {
  predefinedActivities: string[];
}

// Assuming the JSON files match these structures
const { countryCodeMap, alternativeCountryNames }: CountryData = countryData;
const { predefinedActivities }: ActivityData = activityData;

// Define categories for activities (not using categories currently)
// const activityCategories: { [key: string]: string[] } = {
//   "Sightseeing & Culture": ["Scenery", "Cultural hubs", "Historical Landmarks", "Museums", "Festivals", "Theme Parks"],
//   "Food & Drink": ["Street Food", "Fine Dining", "Craft Beer/Wine/Liquor"],
//   "Shopping": ["Unique Goods", "Clothes Shopping"],
//   "Relaxation & Outdoors": ["Pools and Beaches", "Spas and Onsens", "Hiking"],
//   "Adventure & Entertainment": ["Extreme Sports", "Animal Encounters", "Bars and Nightclubs", "Sports"],
// };

// Constant for session storage key
const SESSION_STORAGE_PLAN_KEY = 'generatedPlan';

export default function TravelPreferences() {
  const [destination, setDestination] = useState("");
  const [departureLocation, setDepartureLocation] = useState("Mountain View, CA"); // Consider making this dynamic or empty default
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [numberOfDays, setNumberOfDays] = useState<string>(""); // Use string for input control, parse later
  const [specificLocations, setSpecificLocations] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [desiredActivities, setDesiredActivities] = useState<string[]>([]);
  const [otherLocation, setOtherLocation] = useState("");
  const [useOtherLocation, setUseOtherLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state for API call

  const router = useRouter();
  const { toast } = useToast();

  // --- Form Submission ---
  const handleGeneratePlan = async () => {
    // --- Input Validation ---
    if (!destination.trim()) {
      toast({ title: "Missing Information", description: "Please enter a destination.", variant: "destructive" });
      return;
    }
    if (!departureDate && !numberOfDays) {
      toast({ title: "Missing Information", description: "Please select a departure date or enter the number of days for your trip.", variant: "destructive" });
      return;
    }

    setIsLoading(true); // Start loading

    // --- Prepare Input Data ---
    let allSpecificLocations = [...specificLocations];
    if (useOtherLocation && otherLocation.trim()) {
      allSpecificLocations.push(...otherLocation.split(',').map(loc => loc.trim()).filter(Boolean));
    }

    let datesString = '';
    if (departureDate) {
      if (numberOfDays) {
        datesString = `${format(departureDate, "yyyy-MM-dd")} for ${numberOfDays} days`;
      } else if (returnDate) {
        datesString = `${format(departureDate, "yyyy-MM-dd")} to ${format(returnDate, "yyyy-MM-dd")}`;
      } else {
        // Fallback shouldn't be reached due to validation, but handle defensively
        datesString = format(departureDate, "yyyy-MM-dd");
      }
    }


    const input = {
      destination: destination.trim(),
      departureLocation: departureLocation.trim(),
      dates: datesString,
      specificLocations: allSpecificLocations.join(', '),
      desiredActivities: desiredActivities.join(', '),
      feedback: "", // Assuming feedback might be added later
    };

    // --- API Call & Handling ---
    try {
      const result = await generateTravelPlan(input);

      // Directly use the plan object if available and valid
      // Adjust 'result.plan' based on the actual structure returned by generateTravelPlan
      const generatedPlan = result?.plan; // Assuming result is { plan: YourPlanType } | null

      if (!generatedPlan || (typeof generatedPlan === 'object' && Object.keys(generatedPlan).length === 0)) {
        // Handle cases where plan is null, undefined, or an empty object
        console.warn("generateTravelPlan returned no plan or an empty plan object:", result);
        toast({ title: "Plan Generation Issue", description: "No travel plan could be generated with the provided details. Try adjusting your preferences.", variant: "destructive" });
      } else {
        // Store the valid plan (stringify before storing)
        sessionStorage.setItem(SESSION_STORAGE_PLAN_KEY, JSON.stringify(generatedPlan));
        toast({ title: "Success!", description: "Your travel plan has been generated.", variant: "default" });
        router.push(`/planner`); // Navigate to the planner page
      }

    } catch (error) {
      console.error("Error generating travel plan:", error);
      toast({
        title: "Generation Failed",
        description: `Could not generate plan. ${error instanceof Error ? error.message : 'Please try again.'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Stop loading regardless of outcome
    }
  };

  // --- Destination Change Handler ---
  const handleDestinationChange = useCallback((newDestinationValue: string) => {
    const newDestination = newDestinationValue;
    setDestination(newDestination);

    const destinationLower = newDestination.trim().toLowerCase();
    let cities: string[] = [];

    if (destinationLower) {
      // Standardize using alternative names
      const standardizedDestination = alternativeCountryNames[destinationLower] || destinationLower;

      // Check if it's a known country and get cities
      if (countryCodeMap.hasOwnProperty(standardizedDestination)) {
        cities = countryCodeMap[standardizedDestination] || [];
      }
      // Potential future enhancement: If not a country, maybe check if it's a known major city?
    }

    setAvailableCities(cities);

    // Reset dependent fields when destination changes
    setSpecificLocations([]);
    setDesiredActivities([]);
    setUseOtherLocation(false);
    setOtherLocation("");
    // Keep dates unless explicitly required to reset
    // setReturnDate(undefined);
    // setNumberOfDays("");

    // // Dynamic activities fetching (if enabled in the future)
    // if (destinationLower) {
    //   getActivitiesForDestination(newDestination).then(setAvailableActivities);
    // } else {
    //   setAvailableActivities(predefinedActivities); // Or clear/reset as needed
    // }
  }, []); // Dependencies: only needs imported data and state setters

  // --- Helper Functions for Toggles ---
  const toggleSelection = (item: string, currentSelection: string[], setSelection: React.Dispatch<React.SetStateAction<string[]>>) => {
    setSelection(prev =>
      prev.includes(item)
        ? prev.filter(val => val !== item)
        : [...prev, item]
    );
  };

  const toggleSpecificLocation = (location: string) => {
    toggleSelection(location, specificLocations, setSpecificLocations);
  };

  const toggleDesiredActivity = (activity: string) => {
    toggleSelection(activity, desiredActivities, setDesiredActivities);
  };

  const handleNumberOfDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty input or positive integers
    if (value === "" || /^[1-9]\d*$/.test(value)) {
      setNumberOfDays(value);
    }
  };

  // Calculate min/max dates for calendars
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  // --- Render Logic ---
  return (
    <>
      {/* Using a Card for structure and styling */}
      <Card className="w-full max-w-2xl mx-auto my-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Plan Your Next Adventure</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Destination Input */}
          <div className="space-y-1.5">
            <Label htmlFor="destination" className="font-semibold">Destination</Label>
            <Input
              id="destination"
              type="text"
              value={destination}
              onChange={(e) => handleDestinationChange(e.target.value)}
              placeholder="e.g., Tokyo, Japan, France"
              aria-required="true"
              disabled={isLoading}
            />
          </div>

          {/* Departure Location Input */}
          <div className="space-y-1.5">
            <Label htmlFor="departureLocation" className="font-semibold">Departure Location</Label>
            <Input
              id="departureLocation"
              type="text"
              value={departureLocation}
              onChange={(e) => setDepartureLocation(e.target.value)}
              placeholder="e.g., Your City, State/Country"
              disabled={isLoading}
            />
          </div>

          {/* Date Selection Grid - Responsive */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
            {/* Departure Date */}
            <div className="space-y-1.5">
              <Label htmlFor="departure-date-button" className="font-semibold">Departure Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="departure-date-button"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !departureDate && "text-muted-foreground"
                    )}
                    aria-required="true"
                    disabled={isLoading}
                  >
                    {/* Calendar Icon (Optional) <CalendarIcon className="mr-2 h-4 w-4" /> */}
                    {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={departureDate}
                    onSelect={setDepartureDate}
                    disabled={(date) => date < today || isLoading} // Disable past dates
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Return Date OR Number of Days */}
            <div className="space-y-1.5">
              <Label htmlFor="return-date-button" className="font-semibold">Return Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="return-date-button"
                    variant={"outline"}
                    className={cn(
                      "flex-grow justify-start text-left font-normal", // flex-grow allows button to take space
                      !returnDate && "text-muted-foreground"
                    )}
                    disabled={!departureDate || isLoading} // Disabled if no departure
                  >
                    {/* Calendar Icon className="mr-2 h-4 w-4" /> */}
                    {returnDate ? format(returnDate, "PPP") : (<span>Pick return date</span>)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={returnDate}
                    onSelect={setReturnDate}
                    disabled={!departureDate || isLoading} // Disable dates before departure
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {/* Number of Days */}
          <div className="space-y-1.5">
            <Label htmlFor="numberOfDays" className="font-semibold">Number of Days</Label>
            <Input
              id="numberOfDays"
              type="number" // Use number but handle validation via state/handler
              min="1"
              value={numberOfDays}
              onChange={handleNumberOfDaysChange}
              placeholder="Days"
              className="w-20 flex-shrink-0" // Fixed width, prevent growing/shrinking excessively
              disabled={isLoading} // Disabled if no departure, or if return date is picked
              aria-label="Number of days for the trip"
            />
          </div>

          {/* --- Conditional Sections --- */}
          {destination.trim() && (
            <>
              {/* Specific Locations Section */}
              <div className="space-y-3 pt-2"> {/* Add some padding top */}
                <Label className="font-semibold">Specific Locations within {destination} (Optional)</Label>
                {availableCities.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pt-1">
                    {availableCities.map((city) => (
                      <div key={city} className="flex items-center space-x-2 whitespace-nowrap">
                        <Checkbox
                          id={`city-${city.replace(/\s+/g, '-')}`} // Create unique ID
                          checked={specificLocations.includes(city)}
                          onCheckedChange={() => toggleSpecificLocation(city)}
                          disabled={isLoading}
                        />
                        <Label htmlFor={`city-${city.replace(/\s+/g, '-')}`} className="font-normal cursor-pointer">
                          {city}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Input
                    type="text"
                    value={otherLocation}
                    onChange={(e) => setOtherLocation(e.target.value)}
                    placeholder="Enter specific locations (comma-separated)"
                    disabled={isLoading}
                  />
                )}
              </div>

              {/* Desired Activities Section */}
              <div className="space-y-2 pt-2">
                <Label className="font-semibold">Desired Activities (Optional)</Label>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 pt-1">
                  {predefinedActivities.map((activity) => (
                    <div key={activity} className="flex items-center space-x-2 whitespace-nowrap">
                      <Checkbox
                        id={`activity-${activity.replace(/\s+/g, '-')}`} // Create unique ID
                        checked={desiredActivities.includes(activity)}
                        onCheckedChange={() => toggleDesiredActivity(activity)}
                        disabled={isLoading}
                      />
                      <Label htmlFor={`activity-${activity.replace(/\s+/g, '-')}`} className="font-normal cursor-pointer">
                        {activity}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Submission Button */}
          <Button onClick={handleGeneratePlan} className="w-full text-lg py-3" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Plan...
              </>
            ) : (
              'Generate My Travel Plan'
            )}
          </Button>
        </CardContent>
      </Card>
      {/* Toaster component for displaying notifications */}
      <Toaster />
    </>
  );
}

