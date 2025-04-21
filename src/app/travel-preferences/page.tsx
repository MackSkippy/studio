"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Updated import path and function name
import { generateTravelPlan } from "@/ai/flows/generate-travel-itinerary";

// UI Components
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

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

// Constant for session storage key
const SESSION_STORAGE_PLAN_KEY = 'generatedPlan';

export default function TravelPreferences() {
  const [destination, setDestination] = useState("");
  const [destinationArrivalCity, setDestinationArrivalCity] = useState(""); // new state
  const [destinationDepartureCity, setDestinationDepartureCity] = useState("Mountain View, CA"); // new state
  const [arrivalDate, setArrivalDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [numberOfDays, setNumberOfDays] = useState<string>(""); // Use string for input control, parse later
  const [specificLocations, setSpecificLocations] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [desiredActivities, setDesiredActivities] = useState<string[]>([]);
  const [otherLocation, setOtherLocation] = useState("");
  const [useOtherLocation, setUseOtherLocation] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Loading state for API call

  const router = useRouter();
  const { toast } = useToast();

  // --- Form Submission ---
  const handleGeneratePlan = async () => {
    // --- Input Validation ---
    if (!destination.trim()) {
      toast({ title: "Missing Information", description: "Please enter a destination.", variant: "destructive" });
      return;
    }
    if (!arrivalDate && !numberOfDays) {
      toast({ title: "Missing Information", description: "Please select an arrival date or enter the number of days for your trip.", variant: "destructive" });
      return;
    }

    setIsLoading(true); // Start loading

    // --- Prepare Input Data ---
    let allSpecificLocations = [...specificLocations];
    if (useOtherLocation && otherLocation.trim()) {
      allSpecificLocations.push(...otherLocation.split(',').map(loc => loc.trim()).filter(Boolean));
    }

    let datesString = '';
    if (arrivalDate) {
      if (numberOfDays) {
        datesString = `${format(arrivalDate, "yyyy-MM-dd")} for ${numberOfDays} days`;
      } else if (returnDate) {
        datesString = `${format(arrivalDate, "yyyy-MM-dd")} to ${format(returnDate, "yyyy-MM-dd")}`;
      } else {
        // Fallback shouldn't be reached due to validation, but handle defensively
        datesString = format(arrivalDate, "yyyy-MM-dd");
      }
    }


    const input = {
      destination: destination.trim(),
      departureCity: destinationDepartureCity.trim(),
      arrivalCity: destinationArrivalCity.trim(),
      dates: datesString,
      numberOfDays: numberOfDays,
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
    if (value === "" || /^[1-9]\\d*$/.test(value)) {
      setNumberOfDays(value);
    }
  };
  // Calculate min/max dates for calendars
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  // --- Render Logic ---
  return (
    
      
        
          
            
              
                Travel Preferences
              
            
          
          
            Fill out the form below to generate a personalized itinerary.
          
        
        
          
            
              
                
                  
                    Destination
                  
                  
                    <Input
                      id="destination"
                      type="text"
                      value={destination}
                      onChange={(e) => handleDestinationChange(e.target.value)}
                      placeholder="e.g., Tokyo, Japan, France"
                      aria-required="true"
                      disabled={isLoading}
                    />
                  
                
              
              
                
                  
                    Destination Arrival City
                  
                  
                    <Input
                      id="destinationArrivalCity"
                      type="text"
                      value={destinationArrivalCity}
                      onChange={(e) => setDestinationArrivalCity(e.target.value)}
                      placeholder="e.g., Tokyo, Los Angeles, Berlin"
                      disabled={isLoading}
                    />
                  
                
              
              
                
                  
                    Destination Departure City
                  
                  
                    <Input
                      id="destinationDepartureCity"
                      type="text"
                      value={destinationDepartureCity}
                      onChange={(e) => setDestinationDepartureCity(e.target.value)}
                      placeholder="e.g., New York, London, Paris"
                      disabled={isLoading}
                    />
                  
                
              
              
                Arrival Date
                
                  
                    
                      
                        
                          {arrivalDate ? format(arrivalDate, "PPP") : (
                            "Pick a date"
                          )}
                        
                      
                    
                    
                      
                        
                          
                            mode="single"
                            selected={arrivalDate}
                            onSelect={setArrivalDate}
                            disabled={(date) => date < today || isLoading} // Disable past dates
                            initialFocus
                          />
                        
                      
                    
                  
                
              
              
                Return Date
                
                  
                    
                      
                        
                          {returnDate ? format(returnDate, "PPP") : (
                            "Pick a date"
                          )}
                        
                      
                    
                    
                      
                        
                          
                            mode="single"
                            selected={returnDate}
                            onSelect={setReturnDate}
                            disabled={(date) => date < today || (arrivalDate && date < arrivalDate) || isLoading}
                            initialFocus
                          />
                        
                      
                    
                  
                
              
               
                Number of Days
                
                  
                    <Input
                      id="numberOfDays"
                      type="number" // Use number but handle validation via state/handler
                      min="1"
                      value={numberOfDays}
                      onChange={handleNumberOfDaysChange}
                      placeholder="Days"
                      className="w-20 flex-shrink-0" // Fixed width, prevent growing/shrinking excessively
                      disabled={isLoading} // Disabled if no arrival, or if return date is picked
                      aria-label="Number of days for the trip"
                    />
                  
                
              
              

              {destination.trim() && (
                <>
                  
                    
                      Specific Locations (Optional)
                    
                    {availableCities.length > 0 ? (
                      
                        {availableCities.map((city) => (
                          
                            
                              <Checkbox
                                id={`city-${city.replace(/\s+/g, '-')}`} // Create unique ID
                                checked={specificLocations.includes(city)}
                                onCheckedChange={() => toggleSpecificLocation(city)}
                                disabled={isLoading}
                              />
                              
                                {city}
                              
                            
                          
                        ))}
                      
                    ) : (
                      <Input
                        type="text"
                        value={otherLocation}
                        onChange={(e) => setOtherLocation(e.target.value)}
                        placeholder="Enter specific locations (comma-separated)"
                        disabled={isLoading}
                      />
                    )}
                  

                  
                    
                      Desired Activities (Optional)
                    
                    
                      {predefinedActivities.map((activity) => (
                        
                          
                            <Checkbox
                              id={`activity-${activity.replace(/\s+/g, '-')}`} // Create unique ID
                              checked={desiredActivities.includes(activity)}
                              onCheckedChange={() => toggleDesiredActivity(activity)}
                              disabled={isLoading}
                            />
                            
                              {activity}
                            
                          
                        
                      ))}
                    
                  
                </>
              )}

              
                
                  {isLoading ? (
                    <>
                      
                      Generating Plan...
                    </>
                  ) : (
                    'Generate My Travel Plan'
                  )}
                
              
            
          
        
      
      
    
  );
}
"

