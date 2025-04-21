"use client";

import { useState, useEffect, useCallback } from "react";
// Updated import path and function name
import { generateTravelPlan } from "@/ai/flows/generate-travel-itinerary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
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
  const [numberOfDays, setNumberOfDays] = useState<number | undefined>(undefined); // New state for number of days
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

    if (!departureDate) {
      toast({
        title: "Error!",
        description: "Please select a departure date.",
        variant: "destructive",
      });
      return;
    }

    if (!returnDate && !numberOfDays) {
      toast({
        title: "Error!",
        description: "Please select either a return date or specify the number of days for your trip.",
        variant: "destructive",
      });
      return;
    }

    let allSpecificLocations = [...specificLocations];
    if (useOtherLocation && otherLocation) {
      // Split by comma if user entered multiple comma-separated values
      allSpecificLocations.push(...otherLocation.split(',').map(loc => loc.trim()).filter(Boolean));
    }

    const datesString = departureDate
      ? numberOfDays
        ? `${format(departureDate, "yyyy-MM-dd")} for ${numberOfDays} days`
        : returnDate
          ? `${format(departureDate, "yyyy-MM-dd")} to ${format(returnDate, "yyyy-MM-dd")}`
          : format(departureDate, "yyyy-MM-dd") // Only departure date is specified
      : '';

    const input = {
      destination,
      departureLocation,
      dates: datesString,
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
    setReturnDate(undefined); // Reset return date
    setNumberOfDays(undefined); // Reset number of days

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

  const handleNumberOfDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setNumberOfDays(value);
      setReturnDate(undefined); // Clear the return date if the number of days is specified
    } else {
      setNumberOfDays(undefined);
    }
  };

  const handleReturnDateSelect = (date: Date | undefined) => {
    setReturnDate(date);
    setNumberOfDays(undefined); // Clear number of days if a return date is selected
  };


  return (
    <>
    <Card className="w-full max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle>
          Travel Preferences
        </CardTitle>
        <CardDescription>
          Fill out the form below to generate a personalized plan.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6"> {/* Increased spacing */}
        
          <Label htmlFor="destination">Destination</Label>
          <Input id="destination" type="text" value={destination} onChange={(e) => handleDestinationChange(e.target.value)} placeholder="e.g., Tokyo, Japan, France" />
        

        
          <Label htmlFor="departureLocation">Departure Location</Label>
          <Input id="departureLocation" type="text" value={departureLocation} onChange={(e) => setDepartureLocation(e.target.value)} placeholder="e.g., Mountain View, CA" />
        

        

          
            
              Departure Date
            
            
              
                {departureDate ? format(departureDate, "PPP") : (
                  
                    Pick a date
                  
                )}
              
              
                
                  
                    
                      before: new Date(), after: returnDate
                     
                      before: new Date()
                     
                    
                    
                
              
            
          

          

            
              Return Date
            
           
              
                {returnDate ? format(returnDate, "PPP") : (
                   
                     Pick a date
                   
                )}
              
              
                
                  
                    
                      before: departureDate
                     
                      before: new Date()
                     
                    
                    
                
              
            
          
            
            or Number of days
            
            
              
            
          
        
      

        {/* Specific Locations Section - Conditional Rendering */}
        {destination && (
             
            
              Specific Locations (Optional)
            
            {availableCities.length > 0 && (
              
                {availableCities.map((city) => (
                  
                    
                      
                        id={`city-${city}`}
                        checked={specificLocations.includes(city)}
                        onCheckedChange={() => toggleSpecificLocation(city)}
                      />
                      
                        {city}
                      
                    
                  
                ))}
              
            )}

            {/* Option to add other locations */}
            
              
                
                  id="other-location-checkbox"
                  checked={useOtherLocation}
                  onCheckedChange={(checked) => {
                    setUseOtherLocation(Boolean(checked));
                    if (!checked) setOtherLocation(""); // Clear input if unchecked
                  }}
                />
                
                  {availableCities.length > 0 ? 'Add another specific location?' : 'Specify locations?'}
                
              
            

            {/* Input for other location */}
            {useOtherLocation && (
              
                type="text"
                value={otherLocation}
                onChange={(e) => setOtherLocation(e.target.value)}
                placeholder={availableCities.length > 0 ? "Enter other location..." : "e.g., Shibuya, Asakusa (comma-separated)"}
                className="mt-2"
              />
            )}

             {/* Fallback text input if destination is not a recognized country AND user hasn't checked 'other' */}
            {availableCities.length === 0 && !useOtherLocation && (
                 
                  If you want to specify particular places within {destination}, check the box above and enter them.
                 
             )}
          
        )}

        {/* Desired Activities Section - Using Accordion */}
        {destination && (
          
            
            
              Desired Activities (Optional - Select all that apply)
            
              {Object.entries(activityCategories).map(([category, activities]) => (
                
                  
                    
                      {category}
                    
                    
                      
                        {activities.map((activity) => {
                        // Check if the activity exists in the main predefined list
                        if (predefinedActivities.includes(activity)) {
                          return (
                            
                              
                                
                                  id={`activity-${activity}`}
                                  checked={desiredActivities.includes(activity)}
                                  onCheckedChange={() => toggleDesiredActivity(activity)}
                                />
                                
                                  {activity}
                                
                              
                            
                          );
                        }
                        return null; // Don't render if activity isn't in the master list
                      })}
                    
                  
                
              ))}
            
          
        )}

        {/* Updated button text and handler */}
        
          Generate Plan
        
      
      <Toaster />
    </Card>
    </>
  );
}

