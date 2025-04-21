"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Updated import path and function name
import { generateTravelPlan } from "@/ai/flows/generate-travel-itinerary"; // Assuming this returns { plan: YourPlanType } | null

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toaster";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

// Define categories for activities
const activityCategories: { [key: string]: string[] } = {
    "Sightseeing & Culture": ["Scenery", "Cultural hubs", "Historical Landmarks", "Museums", "Festivals", "Theme Parks"],
    "Food & Drink": ["Street Food", "Fine Dining", "Craft Beer/Wine/Liquor"],
    "Shopping": ["Unique Goods", "Clothes Shopping"],
    "Relaxation & Outdoors": ["Pools and Beaches", "Spas and Onsens", "Hiking"],
    "Adventure & Entertainment": ["Extreme Sports", "Animal Encounters", "Bars and Nightclubs", "Sports"],
};

// Constant for session storage key
const SESSION_STORAGE_PLAN_KEY = 'generatedTravelPlan';

// Placeholder function (keep if needed for future AI integration)
async function getActivitiesForDestination(destination: string): Promise<string[]> {
    console.log(`Workspaceing activities for: ${destination}`); // Log for debugging/future use
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async call
    // In a real scenario, this might call an API based on the destination
    // For now, it's unused in the UI population logic.
    return predefinedActivities;
}

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

    // --- Handlers for Date/Days Inputs ---
    const handleNumberOfDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
         // Allow empty input or positive integers
        if (value === "" || /^[1-9]\d*$/.test(value)) {
             setNumberOfDays(value);
           // if (value !== "") {
           //     setReturnDate(undefined); // Clear return date if days are entered
           // }
        }
    };

    const handleReturnDateSelect = (date: Date | undefined) => {
        setReturnDate(date);
       // if (date) {
       //     setNumberOfDays(""); // Clear number of days if a return date is selected
       // }
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
                    <CardDescription>Fill out your preferences below, and we'll generate a personalized travel plan.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6"> {/* Increased spacing for better readability */}
                    {/* Destination Input */}
                    <div className="space-y-1.5"> {/* Reduced margin within group */}
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
                                        disabled={(date) =>
                                            date < today || // Disable past dates
                                            (returnDate ? date >= returnDate : false) || // Disable dates after or on return date
                                            isLoading
                                        }
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
                                        disabled={!departureDate || isLoading} // Disabled if no departure, or if days are specified
                                    >
                                        {/* <CalendarIcon className="mr-2 h-4 w-4" /> */}
                                        {returnDate ? format(returnDate, "PPP") : (<span>Pick return date</span>)}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={returnDate}
                                        onSelect={handleReturnDateSelect}
                                        disabled={!departureDate || isLoading || (date => !departureDate || date <= departureDate)} // Disable dates before or on departure
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
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
                                {/* Display checkboxes if cities are available */}
                                {availableCities.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pt-1">
                                        {availableCities.map((city) => (
                                            <div key={city} className="flex items-center space-x-2 whitespace-nowrap"> {/* Prevent label text wrap */}
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
                                )}

                                {/* Option to add other locations manually */}
                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox
                                        id="other-location-checkbox"
                                        checked={useOtherLocation}
                                        onCheckedChange={(checked) => {
                                            setUseOtherLocation(Boolean(checked));
                                            if (!checked) setOtherLocation(""); // Clear input if unchecked
                                        }}
                                        disabled={isLoading}
                                    />
                                    <Label htmlFor="other-location-checkbox" className="font-normal cursor-pointer">
                                        {availableCities.length > 0 ? 'Specify other locations?' : 'Specify locations? (comma-separated)'}
                                    </Label>
                                </div>

                                {/* Input for other location */}
                                {useOtherLocation && (
                                    <Input
                                        type="text"
                                        value={otherLocation}
                                        onChange={(e) => setOtherLocation(e.target.value)}
                                        placeholder={availableCities.length > 0 ? "Enter other locations (e.g., specific district, park)" : "e.g., Shibuya, Eiffel Tower District (comma-separated)"}
                                        className="mt-1" // Slightly less margin top
                                        disabled={isLoading}
                                        aria-label="Enter other specific locations, separated by commas"
                                    />
                                )}

                                {/* Fallback guidance if no cities found automatically */}
                                {availableCities.length === 0 && !useOtherLocation && (
                                    <p className="text-sm text-muted-foreground pt-1">
                                        No predefined cities found for {destination}. Check the box above to manually enter specific places you want to visit (e.g., districts, landmarks).
                                    </p>
                                )}
                            </div>

                            {/* Desired Activities Section - Using Accordion for organization */}
                            <div className="space-y-2 pt-2">
                                 <Label className="font-semibold">Desired Activities (Optional)</Label>
                                <Accordion type="multiple" className="w-full pt-1">
                                    {Object.entries(activityCategories).map(([category, activities]) => (
                                        <AccordionItem value={category} key={category}>
                                            <AccordionTrigger disabled={isLoading} className="text-base hover:no-underline"> {/* Make category trigger larger */}
                                                {/* Using Label inside trigger for consistency, though AccordionTrigger itself is clickable */}
                                                <Label className="font-medium cursor-pointer">{category}</Label>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                {/* Responsive grid for activities */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pt-2 pb-2">
                                                    {activities
                                                        .filter(activity => predefinedActivities.includes(activity)) // Ensure activity is valid
                                                        .map((activity) => (
                                                            <div key={activity} className="flex items-center space-x-2 whitespace-nowrap"> {/* Prevent wrap */}
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
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
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
