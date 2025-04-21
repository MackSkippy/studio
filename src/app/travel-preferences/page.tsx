"use client";

// Removed unused useEffect import
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { generateTravelPlan } from "@/ai/flows/generate-travel-itinerary";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Corrected import: Removed non-standard leading whitespace
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

import countryData from "@/data/countries.json";
import activityData from "@/data/activities.json";

// Define interfaces (Ensure these accurately match your JSON structure)
interface CountryData {
  countryCodeMap: { [key: string]: string[] };
  alternativeCountryNames: { [key: string]: string };
}

interface ActivityData {
  predefinedActivities: string[];
}

const { countryCodeMap, alternativeCountryNames }: CountryData = countryData;
const { predefinedActivities }: ActivityData = activityData;

const SESSION_STORAGE_PLAN_KEY = 'generatedPlan';

export default function TravelPreferences() {
  const [destination, setDestination] = useState("");
  const [destinationArrivalCity, setDestinationArrivalCity] = useState("");
  const [destinationDepartureCity, setDestinationDepartureCity] = useState(""); // Consider making this dynamic or empty default
  const [arrivalDate, setArrivalDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [numberOfDays, setNumberOfDays] = useState<string>("");
  const [specificLocations, setSpecificLocations] = useState<string[]>([]); // For checkboxes
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [desiredActivities, setDesiredActivities] = useState<string[]>([]);
  const [otherLocation, setOtherLocation] = useState(""); // For manual text input
  // Removed useOtherLocation state - it's redundant with the new logic
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleGeneratePlan = async () => {
    if (!destination.trim()) {
      toast({ title: "Missing Information", description: "Please enter a destination.", variant: "destructive" });
      return;
    }
    // Require either arrival date OR number of days. Return date is optional.
    if (!arrivalDate && !numberOfDays) {
      toast({ title: "Missing Information", description: "Please select an arrival date or enter the number of days for your trip.", variant: "destructive" });
      return;
    }
    // Optional: Add validation if returnDate is before arrivalDate
    if (arrivalDate && returnDate && returnDate < arrivalDate) {
        toast({ title: "Invalid Dates", description: "Return date cannot be before arrival date.", variant: "destructive" });
        return;
    }

    setIsLoading(true);

    // --- Prepare Input Data ---
    // Combine selected checkboxes and manually entered locations
    let allSpecificLocations = [...specificLocations];
    if (otherLocation.trim()) {
      // Split comma-separated string, trim whitespace, filter out empty entries
      const manuallyAddedLocations = otherLocation.split(',')
                                          .map(loc => loc.trim())
                                          .filter(Boolean);
      // Avoid duplicates if user typed a city that was also checked
      manuallyAddedLocations.forEach(loc => {
          if (!allSpecificLocations.includes(loc)) {
              allSpecificLocations.push(loc);
          }
      });
    }

    let datesString = '';
    if (arrivalDate) {
        // Prioritize number of days if both number of days and return date are somehow provided
        if (numberOfDays) {
          const numDays = parseInt(numberOfDays, 10); // Parse the string
          if (!isNaN(numDays) && numDays > 0) {
            datesString = `${format(arrivalDate, "yyyy-MM-dd")} for ${numDays} days`;
          } else {
            // Handle invalid number of days string if necessary, though validation should prevent this
             toast({ title: "Invalid Input", description: "Number of days is invalid.", variant: "destructive" });
             setIsLoading(false);
             return;
          }
        } else if (returnDate) {
            datesString = `${format(arrivalDate, "yyyy-MM-dd")} to ${format(returnDate, "yyyy-MM-dd")}`;
        } else {
            // Only arrival date is provided - backend needs to handle this case
            datesString = format(arrivalDate, "yyyy-MM-dd");
        }
    } else if (numberOfDays) {
        // Handle case where only number of days is provided (no arrival date)
        // This might imply "X days starting soon" or need clarification.
        // Adjust based on backend requirements. For now, just pass the number.
        // datesString = `Trip for ${numberOfDays} days`; // Or adjust input object
         const numDays = parseInt(numberOfDays, 10);
         if (isNaN(numDays) || numDays <= 0) {
             toast({ title: "Invalid Input", description: "Number of days is invalid.", variant: "destructive" });
             setIsLoading(false);
             return;
         }
        // Modify the input object or datesString based on how generateTravelPlan expects this
    }
    // If no datesString constructed but validation passed, it means only numberOfDays was entered.
    // Decide how the backend should interpret { destination: 'Paris', numberOfDays: '5' } without dates.
    // Adding a placeholder date handling if needed:
    if (!datesString && numberOfDays) {
       datesString = `Trip for ${numberOfDays} days`; // Example: adjust as needed
    }


    const input = {
      destination: destination.trim(),
      departureCity: destinationDepartureCity.trim(), // User's home city
      arrivalCity: destinationArrivalCity.trim(), // City user flies into at destination
      dates: datesString,
      // Send numberOfDays only if it was explicitly entered and valid
      numberOfDays: (numberOfDays && parseInt(numberOfDays, 10) > 0) ? numberOfDays : undefined,
      specificLocations: allSpecificLocations.join(', '), // Send combined list
      desiredActivities: desiredActivities.join(', '),
      feedback: "", // Placeholder
    };

    // Remove numberOfDays from input if it was used to calculate datesString with arrivalDate
    // to avoid redundancy, unless backend specifically needs both formats.
    if (arrivalDate && numberOfDays && input.dates.includes(" for ")) {
        // delete input.numberOfDays; // Or set to undefined, depending on backend expectations
        // Keep it if backend might use it for validation or separate logic
    }


    try {
      const result = await generateTravelPlan(input);
      // Assuming result structure is { plan: YourPlanType | null | undefined }
      const generatedPlan = result?.plan;

      if (!generatedPlan || (typeof generatedPlan === 'object' && Object.keys(generatedPlan).length === 0)) {
        console.warn("generateTravelPlan returned no plan or an empty plan object:", result);
        toast({ title: "Plan Generation Issue", description: "No travel plan could be generated. Try adjusting your preferences or being more specific.", variant: "destructive", duration: 5000 });
      } else {
        sessionStorage.setItem(SESSION_STORAGE_PLAN_KEY, JSON.stringify(generatedPlan));
        toast({ title: "Success!", description: "Your travel plan is ready!", variant: "default" });
        router.push(`/planner`); // Navigate to the planner page
      }

    } catch (error) {
      console.error("Error generating travel plan:", error);
      toast({
        title: "Generation Failed",
        description: `Could not generate plan. ${error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}`,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDestinationChange = useCallback((newDestinationValue: string) => {
    const newDestination = newDestinationValue;
    setDestination(newDestination);

    const destinationLower = newDestination.trim().toLowerCase();
    let cities: string[] = [];

    if (destinationLower) {
      const standardizedDestination = alternativeCountryNames[destinationLower] || destinationLower;
      if (countryCodeMap.hasOwnProperty(standardizedDestination)) {
        cities = countryCodeMap[standardizedDestination] || [];
      }
    }

    setAvailableCities(cities);

    // Reset selections that depend on the destination
    setSpecificLocations([]); // Clear checked cities
    setDesiredActivities([]); // Clear selected activities (or keep if desired)
    setOtherLocation(""); // Clear manually typed locations
    setDestinationArrivalCity(""); // Clear arrival city as it depends on destination
    // Keep dates, departure city etc. unless they should be reset too

  }, [/* Dependencies: countryCodeMap, alternativeCountryNames */]); // Add dependencies if these come from props/context

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
    // Allow empty input or positive integers only (basic validation)
    // Use regex test method
    if (value === "" || /^[1-9]\d*$/.test(value)) { // Fixed regex - no need for double escape here
      setNumberOfDays(value);
       // Optionally clear return date if number of days is entered
       // if (value !== "" && returnDate) {
       //    setReturnDate(undefined);
       // }
    }
  };

 const handleReturnDateSelect = (date: Date | undefined) => {
       setReturnDate(date);
       // Optionally clear number of days if return date is selected
       // if (date && numberOfDays !== "") {
       //   setNumberOfDays("");
       // }
  };


  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Toaster />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Travel Preferences</CardTitle>
          <CardDescription>
            Fill out the form below to generate a personalized itinerary.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6"> {/* Increased spacing */}
            {/* Destination */}
            <div className="space-y-2">
              <Label htmlFor="destination">Destination (Country or City)</Label>
              <Input
                id="destination"
                type="text"
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                placeholder="e.g., Japan, Paris, Italy"
                aria-required="true"
                disabled={isLoading}
              />
            </div>

            {/* Arrival/Departure Cities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="destinationArrivalCity">Arrival City (at Destination)</Label>
                    <Input
                        id="destinationArrivalCity"
                        type="text"
                        value={destinationArrivalCity}
                        onChange={(e) => setDestinationArrivalCity(e.target.value)}
                        placeholder="e.g., Tokyo, Rome (Optional)"
                        disabled={isLoading || !destination.trim()} // Disable if no destination
                    />
                 </div>
                 <div className="space-y-2">
                     <Label htmlFor="destinationDepartureCity">Departure City (at Destination)</Label>
                     <Input
                        id="destinationDepartureCity"
                        type="text"
                        value={destinationDepartureCity}
                        onChange={(e) => setDestinationDepartureCity(e.target.value)}
                        placeholder="e.g., Osaka, Florence"
                        disabled={isLoading}
                     />
                 </div>
            </div>


            {/* Dates & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {/* Arrival Date */}
              <div className="space-y-2">
                <Label htmlFor="arrivalDate">Arrival Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="arrivalDate"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !arrivalDate && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      {/* Calendar Icon Here */}
                      {arrivalDate ? format(arrivalDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={arrivalDate}
                      onSelect={setArrivalDate}
                      disabled={(date) => date < today || isLoading}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Return Date */}
              <div className="space-y-2">
                <Label htmlFor="returnDate">Return Date (Optional)</Label>
                 <Popover>
                   <PopoverTrigger asChild>
                     <Button
                       id="returnDate"
                       variant={"outline"}
                       className={cn(
                         "w-full justify-start text-left font-normal",
                         !returnDate && "text-muted-foreground"
                       )}
                      disabled={isLoading || !arrivalDate} // Also disable if no arrival date
                     >
                       {/* Calendar Icon Here */}
                       {returnDate ? format(returnDate, "PPP") : <span>Pick a date</span>}
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-auto p-0">
                     <Calendar
                       mode="single"
                       selected={returnDate}
                       // Use dedicated handler to potentially clear numberOfDays
                       onSelect={handleReturnDateSelect}
                       disabled={(date) =>
                         date < today ||
                         (arrivalDate && date <= arrivalDate) || // Prevent return before or on arrival
                         isLoading
                       }
                       initialFocus
                     />
                   </PopoverContent>
                 </Popover>
              </div>

               {/* Number of Days */}
               <div className="space-y-2">
                <Label htmlFor="numberOfDays">Number of Days (Alternative)</Label>
                <Input
                    id="numberOfDays"
                    type="number" // Keeps spinner controls, validation handled by state/regex
                    min="1"
                    step="1"
                    value={numberOfDays}
                    onChange={handleNumberOfDaysChange}
                    placeholder="e.g., 7"
                    className="w-full" // Allow flexible width
                    disabled={isLoading} // Maybe disable if returnDate is set? Or allow override.
                    aria-label="Number of days for the trip (alternative to return date)"
                />
               </div>
            </div>

            {/* Conditional Sections */}
            {destination.trim() && (
              <div className="space-y-6"> {/* Add spacing for these sections */}
                {/* Specific Locations */}
                <div className="space-y-3">
                  <Label className="font-medium">Specific Locations (Optional)</Label>
                   <p className="text-sm text-muted-foreground">
                     Select suggested cities or add your own below.
                   </p>
                  {/* Checkboxes for available cities */}
                  {availableCities.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 pt-2">
                      {availableCities.map((city) => (
                        <div key={city} className="flex items-center space-x-2">
                          <Checkbox
                            id={`city-${city.replace(/\s+/g, '-')}`}
                            checked={specificLocations.includes(city)}
                            onCheckedChange={() => toggleSpecificLocation(city)}
                            disabled={isLoading}
                          />
                          <Label
                            htmlFor={`city-${city.replace(/\s+/g, '-')}`}
                            className="font-normal cursor-pointer"
                          >
                            {city}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Always show the input for other locations */}
                  <div className="pt-2">
                      <Label htmlFor="otherLocation" className="text-sm font-medium">
                         Add other specific locations (comma-separated)
                      </Label>
                      <Input
                         id="otherLocation"
                         type="text"
                         value={otherLocation}
                         onChange={(e) => setOtherLocation(e.target.value)}
                         placeholder="e.g., Eiffel Tower, Kyoto, a specific town"
                         disabled={isLoading}
                         className="mt-1"
                      />
                  </div>
                </div>

                {/* Desired Activities */}
                <div className="space-y-3">
                  <Label className="font-medium">Desired Activities (Optional)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 pt-2">
                    {predefinedActivities.map((activity) => (
                      <div key={activity} className="flex items-center space-x-2">
                        <Checkbox
                          id={`activity-${activity.replace(/\s+/g, '-')}`}
                          checked={desiredActivities.includes(activity)}
                          onCheckedChange={() => toggleDesiredActivity(activity)}
                          disabled={isLoading}
                        />
                        <Label
                          htmlFor={`activity-${activity.replace(/\s+/g, '-')}`}
                          className="font-normal cursor-pointer"
                        >
                          {activity}
                        </Label>
                      </div>
                    ))}
                     {/* Option to add custom activities */}
                     {/* <div className="col-span-full pt-2"> <Label htmlFor="otherActivities">Other Activities:</Label> <Input id="otherActivities" ... /> </div> */}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="button" // Explicitly type button if not in a <form> element
              onClick={handleGeneratePlan}
              disabled={isLoading || !destination.trim() || (!arrivalDate && !numberOfDays)}
              className="w-full mt-4" // Add margin top
              size="lg" // Make button larger
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                'Generate My Travel Plan'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
