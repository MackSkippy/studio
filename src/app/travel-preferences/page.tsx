"use client";

// --- Core React/Next Imports ---
import { useState, useCallback, useMemo, useRef } from "react"; // Added useMemo
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'; // Import drag and drop components

// --- Third-Party Libraries ---
import { format } from "date-fns";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";

// --- Internal Libs & Utils ---
import { cn } from "@/lib/utils";

// --- Hooks ---
import { useToast } from "@/hooks/use-toast";

// --- API/AI Calls & TYPES ---
// Import the function AND the input/output types from the backend flow
import {
  generateTravelPlan,
  type GenerateTravelPlanInput, // Use the exact input type
  type GenerateTravelPlanOutput // Use the exact output type
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Data Imports ---
import countryData from "@/data/countries.json";
import activityData from "@/data/activities.json";

// --- Types ---
interface CountryData {
  countryCodeMap: { [key: string]: string[] };
  alternativeCountryNames: { [key: string]: string };
}

interface ActivityData {
  predefinedActivities: string[];
}

// Remove the local TravelPlanInput interface, use GenerateTravelPlanInput instead

// --- Constants ---
const SESSION_STORAGE_PLAN_KEY = "generatedPlan";
const TOAST_DESTRUCTIVE_VARIANT = "destructive" as const;
const TOAST_DEFAULT_VARIANT = "default" as const;
const TOAST_DURATION_MS = 5000;

// --- Data Extraction ---
const { countryCodeMap, alternativeCountryNames } = countryData as CountryData;
const { predefinedActivities } = activityData as ActivityData;


export default function TravelPreferences() {
  // --- State ---
  const [destination, setDestination] = useState("");
  // Renamed for clarity: these are cities WITHIN the destination
  const [arrivalCity, setArrivalCity] = useState(""); // Changed name
  const [departureCity, setDepartureCity] = useState(""); // Changed name
  const [arrivalDate, setArrivalDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [numberOfDays, setNumberOfDays] = useState<string>(""); // Keep as string for input control
  const [specificLocations, setSpecificLocations] = useState<string[]>([]);
  const [otherLocationInput, setOtherLocationInput] = useState("");
  const [availableCities, setAvailableCities] = useState<string[]>([]); // Cities for specific locations checkboxes
  const [desiredActivities, setDesiredActivities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showDragDropAlert, setShowDragDropAlert] = useState(true); // State for drag and drop alert visibility


  // --- Hooks ---
  const router = useRouter();
  const { toast } = useToast();

  // --- Validation Logic (Aligned with Backend Schema) ---
  const validateForm = (): boolean => {
    // Trim values before checking
    const destinationTrimmed = destination.trim();
    const arrivalCityTrimmed = arrivalCity.trim();
    const departureCityTrimmed = departureCity.trim();
    const numberOfDaysTrimmed = numberOfDays.trim();
    const allDesiredActivities = desiredActivities.join(', ').trim(); // Combine for check

    if (!destinationTrimmed) {
      toast({ title: "Missing Information", description: "Please enter a destination.", variant: TOAST_DESTRUCTIVE_VARIANT });
      return false;
    }
    // --- Enforce required fields ---
    if (!arrivalCityTrimmed) {
        toast({ title: "Missing Information", description: "Please enter the arrival city within your destination.", variant: TOAST_DESTRUCTIVE_VARIANT });
        return false;
    }
    if (!departureCityTrimmed) {
        toast({ title: "Missing Information", description: "Please enter the departure city within your destination.", variant: TOAST_DESTRUCTIVE_VARIANT });
        return false;
    }
     if (!allDesiredActivities) {
        toast({ title: "Missing Information", description: "Please select at least one desired activity or describe your interests.", variant: TOAST_DESTRUCTIVE_VARIANT });
        // Consider adding a text area for activities later if needed
        return false;
    }
    // --- ---

    if (!arrivalDate && !numberOfDaysTrimmed) {
      toast({ title: "Missing Information", description: "Please select an arrival date OR enter the number of days.", variant: TOAST_DESTRUCTIVE_VARIANT });
      return false;
    }
    if (arrivalDate && returnDate && returnDate < arrivalDate) {
      toast({ title: "Invalid Dates", description: "Return date cannot be before the arrival date.", variant: TOAST_DESTRUCTIVE_VARIANT });
      return false;
    }
    if (numberOfDaysTrimmed && !/^[1-9]\d*$/.test(numberOfDaysTrimmed)) {
        toast({ title: "Invalid Input", description: "Number of days must be a positive whole number.", variant: TOAST_DESTRUCTIVE_VARIANT });
      return false;
    }
    return true;
  };

  // --- Data Preparation Logic (Returns GenerateTravelPlanInput | null) ---
  const prepareApiInput = (): GenerateTravelPlanInput | null => {
    // Combine specific locations
    const manuallyAddedLocations = otherLocationInput.split(",").map(loc => loc.trim()).filter(Boolean);
    const allSpecificLocations = Array.from(new Set([...specificLocations, ...manuallyAddedLocations]));
    const specificLocationsString = allSpecificLocations.length > 0 ? allSpecificLocations.join(", ") : undefined;

    // Combine desired activities (already validated to be non-empty)
    const desiredActivitiesString = desiredActivities.join(", ").trim(); // Should always have content if validation passed

    // Format Dates String
    let datesString = "";
    const numDaysInt = parseInt(numberOfDays.trim(), 10);
    const isValidNumDays = !isNaN(numDaysInt) && numDaysInt > 0;

    if (arrivalDate) {
      const formattedArrival = format(arrivalDate, "yyyy-MM-dd");
      if (numberOfDays.trim() && isValidNumDays) {
        // Use format AI might understand better
        datesString = `${formattedArrival} for ${numDaysInt} days`;
      } else if (returnDate) {
        datesString = `${formattedArrival} to ${format(returnDate, "yyyy-MM-dd")}`;
      } else {
        datesString = formattedArrival; // Only arrival date
      }
    } else if (numberOfDays.trim() && isValidNumDays) {
      datesString = `Trip for ${numDaysInt} days`; // AI needs context (today?) or make start date mandatory
    } else {
      console.error("Invalid date/duration state reached preparation stage.");
      toast({ title: "Error", description: "Invalid date or duration configuration.", variant: TOAST_DESTRUCTIVE_VARIANT });
      return null;
    }

    // Prepare numberOfDays as number | undefined for the API
    // Send number only if it's the primary duration indicator (no return date)
    const numberOfDaysForApi: number | undefined =
        (numberOfDays.trim() && isValidNumDays && !returnDate)
        ? numDaysInt
        : undefined;
        // Note: If both arrival date and number of days are set (and no return date),
        // the number of days is implicitly defined by the datesString ("... for X days").
        // Sending it *again* in numberOfDays might be redundant or confusing for the AI.
        // Let's send undefined if returnDate is set OR if arrivalDate is set (as duration is in datesString).
        // Only send it if ONLY numberOfDays is the source of duration info.
        // --> Refined logic: Send if user explicitly typed it AND there's no return date.
    const finalNumberOfDaysForApi = (numberOfDays.trim() && isValidNumDays && !returnDate) ? numDaysInt : undefined;


    // Construct the input object matching GenerateTravelPlanInput type
    const input: GenerateTravelPlanInput = {
      destination: destination.trim(),
      arrivalCity: arrivalCity.trim(),     // Use correct state variable, now required
      departureCity: departureCity.trim(),   // Use correct state variable, now required
      dates: datesString,
      numberOfDays: finalNumberOfDaysForApi, // Send the parsed number or undefined
      specificLocations: specificLocationsString,
      desiredActivities: desiredActivitiesString, // Now required, send the string
      feedback: undefined, // Explicitly undefined if not used
    };

    // Final check to ensure required fields aren't accidentally empty after trim
     if (!input.destination || !input.arrivalCity || !input.departureCity || !input.dates || !input.desiredActivities) {
         console.error("Data preparation resulted in missing required fields:", input);
         toast({ title: "Error", description: "Failed to prepare data correctly. Required fields are missing.", variant: TOAST_DESTRUCTIVE_VARIANT });
         return null;
     }

    return input;
  };

    const cityLookup = (destination: string) => {
      const destinationLower = destination.trim().toLowerCase();
      let cities: string[] = [];

      if (destinationLower) {
        const standardizedDestination = alternativeCountryNames[destinationLower] || destinationLower;
        if (countryCodeMap.hasOwnProperty(standardizedDestination)) {
          cities = countryCodeMap[standardizedDestination] || [];
        } else {
          //If no cities found by country, attempt to return the most similar string
          if (alternativeCountryNames[destinationLower]) {
            cities = countryCodeMap[alternativeCountryNames[destinationLower]] || [];
          }
        }
      }
      return cities;
    }


  // --- Event Handlers ---
  const handleGeneratePlan = async () => {
    if (!validateForm()) {
      return; // Stop if validation fails
    }

    const inputData = prepareApiInput();
    if (!inputData) {
        // Error occurred during preparation (toast shown in prepareApiInput)
        return;
    }

    setIsLoading(true);

    try {
      console.log("Generating plan with input:", JSON.stringify(inputData, null, 2)); // Log validated input
      // Call the imported function, expect GenerateTravelPlanOutput
      const result: GenerateTravelPlanOutput = await generateTravelPlan(inputData);

      // Access the plan array directly from the typed result
      const generatedPlan = result.plan;

      // Check if the plan is a non-empty array
      if (Array.isArray(generatedPlan) && generatedPlan.length > 0) {
        sessionStorage.setItem(SESSION_STORAGE_PLAN_KEY, JSON.stringify(generatedPlan));
        toast({
          title: "Success!",
          description: "Your travel plan is ready!",
          variant: TOAST_DEFAULT_VARIANT,
        });
        router.push(`/planner`); // Navigate to the planner page
      } else {
        // Handle cases where AI might return success but an empty plan array
        console.warn("generateTravelPlan returned a valid structure but with an empty plan array:", result);
        toast({
          title: "Plan Generation Issue",
          description: "No specific activities could be generated for your plan. Try adjusting your preferences or being more specific.",
          variant: TOAST_DESTRUCTIVE_VARIANT,
          duration: TOAST_DURATION_MS,
        });
      }
    } catch (error) {
      console.error("Error generating travel plan:", error);
      // Display the error message from the backend or flow if available
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: "Generation Failed",
        description: `Could not generate plan. ${errorMessage} Please try again.`,
        variant: TOAST_DESTRUCTIVE_VARIANT,
        duration: TOAST_DURATION_MS,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Using useCallback for handlers that depend on state setters, though less critical here
  const handleDestinationChange = useCallback((newDestinationValue: string) => {
    const trimmedValue = newDestinationValue.trim();
    setDestination(trimmedValue); // Update state with trimmed value

    const destinationLower = trimmedValue.toLowerCase();
    let cities: string[] = [];

    if (destinationLower) {
      const standardizedDestination = alternativeCountryNames[destinationLower] || destinationLower;
        if (countryCodeMap.hasOwnProperty(standardizedDestination)) {
          cities = countryCodeMap[standardizedDestination] || [];
        } else {
          //If no cities found by country, attempt to return the most similar string
          if (alternativeCountryNames[destinationLower]) {
            cities = countryCodeMap[alternativeCountryNames[destinationLower]] || [];
          }
        }
      }

    setAvailableCities(cities);
    // Reset dependent fields on destination change
    setSpecificLocations([]);
    setOtherLocationInput("");
    setArrivalCity(""); // Reset arrival city
    setDepartureCity(""); // Reset departure city
    // Optionally reset activities if they are destination-specific
    // setDesiredActivities([]);
  }, [alternativeCountryNames, countryCodeMap]); // Dependencies


  // Generic toggle function (remains the same)
  const toggleSelection = useCallback((
    item: string,
    currentSelection: string[],
    setSelection: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setSelection((prev) =>
      prev.includes(item)
        ? prev.filter((val) => val !== item)
        : [...prev, item]
    );
  }, []); // No dependencies needed for the generic function logic


  const toggleSpecificLocation = useCallback((location: string) => {
    toggleSelection(location, specificLocations, setSpecificLocations);
  }, [specificLocations, toggleSelection]); // Add dependencies


  const toggleDesiredActivity = useCallback((activity: string) => {
    toggleSelection(activity, desiredActivities, setDesiredActivities);
  }, [desiredActivities, toggleSelection]); // Add dependencies


  // Handle input for number of days (remains the same)
  const handleNumberOfDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^[1-9]\d*$/.test(value)) {
      setNumberOfDays(value);
       // If user types in days, clear the return date as they conflict
      if (value !== "" && returnDate) {
         setReturnDate(undefined);
      }
    }
  };

  // Handle selecting a return date
  const handleReturnDateSelect = (date: Date | undefined) => {
    setReturnDate(date);
    // If user selects a return date, clear number of days input
    if (date && numberOfDays !== "") {
        setNumberOfDays("");
    }
  };

  // --- Render Logic ---
  const today = useMemo(() => { // Use useMemo for static value
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
  }, []);

  // Derived state for submit button disabled status
  const isSubmitDisabled = useMemo(() => {
      const requiredFieldsFilled = destination.trim() &&
                                arrivalCity.trim() &&
                                departureCity.trim() &&
                                desiredActivities.length > 0;
      const dateOrDurationProvided = arrivalDate || numberOfDays.trim();
      return isLoading || !requiredFieldsFilled || !dateOrDurationProvided;
  }, [isLoading, destination, arrivalCity, departureCity, desiredActivities, arrivalDate, numberOfDays]);

  const submitHintText = useMemo(() => {
      if (isLoading) return ""; // No hint when loading
      if (!destination.trim()) return "Please provide a destination.";
      if (!arrivalCity.trim()) return "Please provide the arrival city.";
      if (!departureCity.trim()) return "Please provide the departure city.";
      if (desiredActivities.length === 0) return "Please select desired activities.";
      if (!arrivalDate && !numberOfDays.trim()) return "Please provide arrival date or number of days.";
      return ""; // All good
  }, [destination, arrivalCity, departureCity, desiredActivities, arrivalDate, numberOfDays, isLoading]);


    const availableActivities = useMemo(() => {
        if (!destination) return predefinedActivities; //Return ALL if no destination, or filter based on data in the future.

        const destinationLower = destination.trim().toLowerCase();
        let activities: string[] = [];

        if (destinationLower) {
          //  const standardizedDestination = alternativeCountryNames[destinationLower] || destinationLower;
          // if (destinationLower === "japan") {
            return predefinedActivities;
          //}
        }
        return predefinedActivities;
    }, [destination, predefinedActivities]);

    const availableSpecificLocations = useMemo(() => {
        if (!destination) return [];

        return cityLookup(destination);
    }, [destination])


  return (
    
      
        
          
            
              Travel Preferences
            
            
              Fill out the form below to generate a personalized itinerary. Fields marked with * are required.
            
          
        
        
          
            {/* Destination */}
            
              
                Destination (Country or Major Region) *
              
              
                e.g., Japan, Italy, California Coast
              
            
            

            {/* Arrival/Departure Cities at Destination */}
            
              
                {/* Label updated to show requirement */}
                
                  Destination Arrival City (within Destination) *
                
                
                  e.g., Tokyo, Rome, Los Angeles (LAX)
                
              
              
                 {/* Label updated to show requirement */}
                
                  Destination Departure City *
                
                
                  e.g., Osaka, Florence, San Francisco (SFO)
                
              
            
          

            
              
                Arrival Date
                
                
                  
                    
                      
                        {arrivalDate ? format(arrivalDate, "PPP") : 
                          'Pick a date'
                        }
                      
                    
                  
                  
                    
                      
                        
                          
                           
                        
                        
                      
                      
                      
                    
                  
                
                Required unless using Number of Days.
              

              
                Number of Days
                
                
                  e.g., 7
                
                
                 Use if no Arrival Date
              
            
          

            
              
                
                  Specific Locations (Optional)
                
                
                  Select suggested cities/landmarks for '{destination}' or add your own below (comma-separated).
                
                {/* Checkboxes for available cities */}
                {availableSpecificLocations.length > 0 && (
                  
                    {availableSpecificLocations.map((city) => {
                      const cityId = `city-${city.replace(/\s+/g, '-').toLowerCase()}`;
                      return (
                        
                          
                            
                              
                                
                                
                              
                              
                                
                                  {city}
                                
                              
                            
                          
                        
                      );
                    })}
                    
                )}

                {/* Input for other locations */}
                
                    
                     Add other specific places (comma-separated)
                    
                    
                      Add other places: Eiffel Tower, Kyoto, etc.
                    
                  
                
              

              
                
                  Desired Activities *
                
                
                  Select your interests. At least one is required.
                
                 
                    {availableActivities.map((activity) => {
                      const activityId = `activity-${activity.replace(/\s+/g, '-').toLowerCase()}`;
                      return (
                        
                          
                            
                              
                                
                                
                              
                              
                                
                                  {activity}
                                
                              
                            
                          
                        
                      );
                    })}
                  
                
              
            

            
              {isLoading ? (
                
                  
                  Generating Plan...
                
              ) : (
                'Generate My Travel Plan'
              )}
            
             {/* Add hint text for disabled button state */}
             {isSubmitDisabled && !isLoading && submitHintText && (
               
                  {submitHintText}
               
             )}
          
        
      
    
  );
}

