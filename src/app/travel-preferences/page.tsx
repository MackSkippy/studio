"use client";

import { useState, useEffect, useCallback } from "react";
// Updated import path and function name
import { generateTravelPlan } from "@/ai/flows/generate-travel-plan"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // Import Accordion components

// Import data from JSON files
import countryData from "@/data/countries.json";
import activityData from "@/data/activities.json";

const { countryCodeMap, alternativeCountryNames } = countryData;
const { predefinedActivities } = activityData;

// Define categories for activities (you can customize these)
const activityCategories: { [key: string]: string[] } = {
  "Sightseeing & Culture": [
    "Scenery",
    "Cultural hubs",
    "Historical Landmarks",
    "Museums",
    "Festivals",
    "Theme Parks",
  ],
  "Food & Drink": [
    "Street Food",
    "Fine Dining",
    "Craft Beer/Wine/Liquor",
  ],
  "Shopping": [
    "Unique Goods",
    "Clothes Shopping",
  ],
  "Relaxation & Outdoors": [
    "Pools and Beaches",
    "Spas and Onsens",
    "Hiking",
  ],
  "Adventure & Entertainment": [
    "Extreme Sports",
    "Animal Encounters",
    "Bars and Nightclubs",
    "Sports",
  ]
};

// Function to get activities based on destination (Placeholder for potential future AI integration)
async function getActivitiesForDestination(destination: string): Promise<string[]> {
  // Simulating fetching or dynamic generation
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async call
  // For now, return the predefined list, but this could be an AI call
  // based on destination in the future.
  console.log(`Fetching activities for: ${destination}`); // Keep console log for now
  return predefinedActivities;
}

export default function TravelPreferences() {
  const [destination, setDestination] = useState("");
  const [departureLocation, setDepartureLocation] = useState("Mountain View, CA");
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [specificLocations, setSpecificLocations] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [desiredActivities, setDesiredActivities] = useState<string[]>([]);
  // const [availableActivities, setAvailableActivities] = useState<string[]>([]); // We'll use predefinedActivities for now
  const [otherLocation, setOtherLocation] = useState("");
  const [useOtherLocation, setUseOtherLocation] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Renamed handler function
  const handleGeneratePlan = async () => { 
    if (!destination) {
      toast({
        title: "Error!",
        description: "Please enter a destination.",
        variant: "destructive",
      });
      return;
    }

    let allSpecificLocations = [...specificLocations];
    if (useOtherLocation && otherLocation) {
      // Split by comma if user entered multiple comma-separated values
      allSpecificLocations.push(...otherLocation.split(',').map(loc => loc.trim()).filter(Boolean)); 
    }

    const input = {
      destination,
      departureLocation,
      dates: departureDate && returnDate ? `${format(departureDate, "yyyy-MM-dd")} to ${format(returnDate, "yyyy-MM-dd")}` : '',
      specificLocations: allSpecificLocations.join(', '),
      desiredActivities: desiredActivities.join(', '),
      feedback: "",
    };

    try {
      // Add loading state here if needed
      const result = await generateTravelPlan(input); // Use renamed function
      let generatedPlan: any; // Renamed variable
      try {
         // Use result.plan now
        generatedPlan = JSON.parse(JSON.stringify(result?.plan)) || "No plan generated.";
      } catch (parseError) {
        console.error("Failed to parse plan:", parseError);
        generatedPlan = "Could not process plan.";
      }

      // Store the plan in session storage (renamed key)
      sessionStorage.setItem('generatedPlan', JSON.stringify(generatedPlan)); 
      router.push(`/planner`);

    } catch (error) {
      console.error("Error generating plan:", error);
      toast({
        title: "Generation Failed",
        // Updated message
        description: "Could not generate plan. Please try again.", 
        variant: "destructive",
      });
      // Add cleanup for loading state here
    }
  };

  const handleDestinationChange = useCallback(async (newDestination: string) => {
    setDestination(newDestination);
    const destinationLower = newDestination.toLowerCase();

    // Standardize alternative names
    const standardizedDestination = (alternativeCountryNames as { [key: string]: string })[destinationLower] || destinationLower;

    // Check if the destination is a country
    const isCountry = Object.keys(countryCodeMap).includes(standardizedDestination);

    let cities = [];
    if (isCountry) {
      // Type assertion needed as countryCodeMap keys are checked
      cities = (countryCodeMap as { [key: string]: string[] })[standardizedDestination as keyof typeof countryCodeMap] || [];
    }

    setAvailableCities(cities);

    // // Dynamic activities fetching (kept for future reference)
    // const activities = await getActivitiesForDestination(newDestination);
    // setAvailableActivities(activities);

    setSpecificLocations([]); // Clear specific locations when destination changes
    setDesiredActivities([]); // Clear specific activities when destination changes
    setUseOtherLocation(false); // Reset 'other location' flag
    setOtherLocation(""); // Reset 'other location' input

  }, []); // Removed dependencies as they are now stable imports or setters

  // Note: Removed the useEffect that called handleDestinationChange on destination change,
  // as the onChange handler on the input field now calls it directly.

  const toggleSpecificLocation = (location: string) => {
    setSpecificLocations(prev =>
      prev.includes(location)
        ? prev.filter(item => item !== location)
        : [...prev, location]
    );
  };

  const toggleDesiredActivity = (activity: string) => {
    setDesiredActivities(prev =>
      prev.includes(activity)
        ? prev.filter(item => item !== activity)
        : [...prev, activity]
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle>
          <h1>Travel Preferences</h1>
        </CardTitle>
        <CardDescription>
          Fill out the form below to generate a personalized plan.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6"> {/* Increased spacing */}
        <div className="space-y-2">
          <Label htmlFor="destination">Destination</Label>
          <Input id="destination" type="text" value={destination} onChange={(e) => handleDestinationChange(e.target.value)} placeholder="e.g., Tokyo, Japan, France" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="departureLocation">Departure Location</Label>
          <Input id="departureLocation" type="text" value={departureLocation} onChange={(e) => setDepartureLocation(e.target.value)} placeholder="e.g., Mountain View, CA" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Grid for dates */}
          <div className="space-y-2">
            <Label htmlFor="departureDate">Departure Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !departureDate && "text-muted-foreground"
                  )}
                >
                  {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={departureDate}
                  onSelect={setDepartureDate}
                  disabled={returnDate ? { before: new Date(), after: returnDate } : { before: new Date() }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnDate">Return Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !returnDate && "text-muted-foreground"
                  )}
                >
                  {returnDate ? format(returnDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={returnDate}
                  onSelect={setReturnDate}
                  disabled={departureDate ? { before: departureDate } : { before: new Date() }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Specific Locations Section - Conditional Rendering */} 
        {destination && (
             <div className="space-y-4 pt-4 border-t"> {/* Added separator */}
            <Label>Specific Locations (Optional)</Label>
            {availableCities.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableCities.map((city) => (
                  <div key={city} className="flex items-center space-x-2">
                    <Checkbox
                      id={`city-${city}`}
                      checked={specificLocations.includes(city)}
                      onCheckedChange={() => toggleSpecificLocation(city)}
                    />
                    <Label htmlFor={`city-${city}`} className="font-normal">{city}</Label>
                  </div>
                ))}
              </div>
            )}

            {/* Option to add other locations */} 
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="other-location-checkbox"
                checked={useOtherLocation}
                onCheckedChange={(checked) => {
                    setUseOtherLocation(Boolean(checked));
                    if (!checked) setOtherLocation(""); // Clear input if unchecked
                }}
              />
              <Label htmlFor="other-location-checkbox" className="font-normal">
                {availableCities.length > 0 ? 'Add another specific location?' : 'Specify locations?'}
              </Label>
            </div>

            {/* Input for other location */} 
            {useOtherLocation && (
              <Input
                type="text"
                value={otherLocation}
                onChange={(e) => setOtherLocation(e.target.value)}
                placeholder={availableCities.length > 0 ? "Enter other location..." : "e.g., Shibuya, Asakusa (comma-separated)"}
                className="mt-2"
              />
            )}

             {/* Fallback text input if destination is not a recognized country AND user hasn't checked 'other' */} 
            {availableCities.length === 0 && !useOtherLocation && (
                 <p className="text-sm text-muted-foreground">If you want to specify particular places within {destination}, check the box above and enter them.</p>
             )}
          </div>
        )}

        {/* Desired Activities Section - Using Accordion */} 
        {destination && ( 
          <div className="space-y-4 pt-4 border-t"> {/* Added separator */}
            <Label>Desired Activities (Optional - Select all that apply)</Label>
            <Accordion type="multiple" className="w-full">
              {Object.entries(activityCategories).map(([category, activities]) => (
                <AccordionItem value={category} key={category}>
                  <AccordionTrigger>{category}</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2 p-2">
                      {activities.map((activity) => {
                        // Check if the activity exists in the main predefined list 
                        if (predefinedActivities.includes(activity)) {
                          return (
                            <div key={activity} className="flex items-center space-x-2">
                              <Checkbox
                                id={`activity-${activity}`}
                                checked={desiredActivities.includes(activity)}
                                onCheckedChange={() => toggleDesiredActivity(activity)}
                              />
                              <Label htmlFor={`activity-${activity}`} className="font-normal">
                                {activity}
                              </Label>
                            </div>
                          );
                        }
                        return null; // Don't render if activity isn't in the master list
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {/* Updated button text and handler */}
        <Button onClick={handleGeneratePlan} className="w-full" disabled={!destination}> 
          Generate Plan
        </Button>
      </CardContent>
      <Toaster />
    </Card>
  );
}
