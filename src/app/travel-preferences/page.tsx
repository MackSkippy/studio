"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Button
} from "@/components/ui/button";
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
  generateTravelPlan,
  type GenerateTravelPlanInput,
} from "@/ai/flows/generate-travel-itinerary";

import { ACTIVITIES } from "@/data/activities";
import countryData from "@/data/countries.json";

const SESSION_STORAGE_TRAVEL_PREFERENCES_KEY = "travelPreferences"; // Store preferences for generating final itinerary
const TOAST_DESTRUCTIVE_VARIANT = "destructive" as const;
const TOAST_DEFAULT_VARIANT = "default" as const;
const TOAST_DURATION_MS = 5000;

interface CityData {
  [countryCode: string]: string[];
}

// Extract the cities
const cityData: CityData = countryData.countryCodeMap;
const ActivitiesGrid = ({ selectedActivities, toggleActivity }: { selectedActivities: string[], toggleActivity: (activity: string) => void }) => (
  <div className="grid grid-cols-3 gap-2">
    {ACTIVITIES.map((activity) => (
      <div key={activity} className="flex items-center space-x-2">
        <Checkbox
          id={`activity-${activity}`}
          checked={selectedActivities.includes(activity)}
          onCheckedChange={() => toggleActivity(activity)}
        />
        <Label htmlFor={`activity-${activity}`} className="font-normal">
          {activity}
        </Label>
      </div>
    ))}
  </div>
);

export default function TravelPreferences() {
  const router = useRouter();
  const { toast } = useToast();

  const [destination, setDestination] = useState("");
  const [arrivalCity, setArrivalCity] = useState("");
  const [departureCity, setDepartureCity] = useState("Mountain View, CA");
  const [arrivalDate, setArrivalDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [numberOfDays, setNumberOfDays] = useState<number | undefined>(undefined); // number of days
  const [specificLocations, setSpecificLocations] = useState<string[]>([]);
  const [otherLocationInput, setOtherLocationInput] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const handleDestinationChange = (newDestinationValue: string) => {
      setDestination(newDestinationValue);
      setSpecificLocations([]); // Clear specific locations when destination changes
      setOtherLocationInput(""); // Clear other location input when destination changes
  };

  const toggleSpecificLocation = useCallback((location: string) => {
      setSpecificLocations((prev) =>
          prev.includes(location) ? prev.filter((val) => val !== location) : [...prev, location]
      );
  }, []);

  const toggleActivity = useCallback((activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((val) => val !== activity) : [...prev, activity]
    );
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!destination.trim()) {
      toast({
        title: "Error",
        description: "Please enter a destination.",
        variant: TOAST_DESTRUCTIVE_VARIANT,
        duration: TOAST_DURATION_MS,
      });
      return;
    }

    setIsLoading(true);
    try {
      const datesString = arrivalDate && returnDate ? `${format(arrivalDate, "yyyy-MM-dd")} to ${format(returnDate, "yyyy-MM-dd")}` : '';

      const input: GenerateTravelPlanInput = {
        destination: destination.trim(),
        departureCity: departureCity.trim(),
        arrivalCity: arrivalCity.trim(),
        dates: datesString,
        numberOfDays: numberOfDays,
        specificLocations: specificLocations.length > 0 ? specificLocations.join(", ") : otherLocationInput.trim(),
        desiredActivities: selectedActivities.join(", "),
        feedback: ""
      };

      //Store travel preferences to reuse them on the review page
      sessionStorage.setItem(SESSION_STORAGE_TRAVEL_PREFERENCES_KEY, JSON.stringify(input));

      toast({
        title: "Generating Plan",
        description: "Sit tight and let's go",
        variant: TOAST_DEFAULT_VARIANT,
        duration: TOAST_DURATION_MS,
      });
      router.push("/planner");
    } catch (error: any) {
      console.error("Error generating travel plan:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate travel plan.",
        variant: TOAST_DESTRUCTIVE_VARIANT,
        duration: TOAST_DURATION_MS,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCitiesForDestination = (dest: string): string[] => {
    const destLower = dest.trim().toLowerCase();
    const standardizedDestination =
      countryData.alternativeCountryNames[destLower] || destLower;
    return cityData[standardizedDestination] || [];
  };

  const availableCities = getCitiesForDestination(destination);
  const hasAvailableCities = availableCities && availableCities.length > 0;

  const today = new Date();

  return (
    
      <Toaster />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Plan Your Next Adventure</CardTitle>
          <CardDescription>
            Fill out the form below to generate a personalized itinerary. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            
              <Label htmlFor="destination" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Destination *</Label>
              <Input
                type="text"
                id="destination"
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                placeholder="e.g., Tokyo, Japan"
                required
              />
            

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Arrival City */}
              
                <Label htmlFor="arrivalCity" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Destination Arrival City *</Label>
                <Input
                  type="text"
                  id="arrivalCity"
                  value={arrivalCity}
                  onChange={(e) => setArrivalCity(e.target.value)}
                  placeholder="e.g., Tokyo, Rome, Los Angeles (LAX)"
                  disabled={!destination.trim()}
                  required
                />
              

              {/* Destination Departure City */}
              
                <Label htmlFor="departureCity" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Destination Departure City *</Label>
                <Input
                  type="text"
                  id="departureCity"
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                  placeholder="e.g., Osaka, Florence, San Francisco (SFO)"
                  disabled={!destination.trim()}
                  required
                />
              
            </div>

            {/* Dates / Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Arrival Date */}
              
                <Label htmlFor="arrivalDatePopover">Arrival Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="arrivalDatePopover"
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
                      onSelect={setArrivalDate}
                      disabled={(date) => date < today}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">Optional. Use if specific date is known.</p>
              

              {/* Return Date */}
              
                <Label htmlFor="returnDatePopover">Return Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="returnDatePopover"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !returnDate && "text-muted-foreground"
                      )}
                      disabled={!arrivalDate}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {returnDate ? format(returnDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={returnDate}
                      onSelect={setReturnDate}
                      disabled={(date) => date < (arrivalDate || today)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">Optional. Use if specific date is known.</p>
              

              {/* Number of Days */}
              
                <Label htmlFor="numberOfDays" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Number of Days</Label>
                <Input
                  type="number"
                  id="numberOfDays"
                  value={numberOfDays || ""}
                  onChange={(e) => setNumberOfDays(Number(e.target.value))}
                  placeholder="e.g., 7"
                />
                <p className="text-xs text-muted-foreground">Use if no Return Date. Clears 'Return Date'.</p>
              
            </div>

            
              <Label htmlFor="specificLocations" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Specific Locations</Label>
              {hasAvailableCities ? (
                <ScrollArea className="h-32 w-full rounded-md border p-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableCities.map((city) => (
                      
                        <Checkbox
                          id={`city-${city}`}
                          checked={specificLocations.includes(city)}
                          onCheckedChange={() => toggleSpecificLocation(city)}
                        />
                        <Label htmlFor={`city-${city}`} className="font-normal">
                          {city}
                        </Label>
                      
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <Input
                  type="text"
                  id="otherLocations"
                  placeholder="e.g., Eiffel Tower, Kyoto, Zion National Park"
                  value={otherLocationInput}
                  onChange={(e) => setOtherLocationInput(e.target.value)}
                  disabled={!destination.trim()}
                />
              )}
            

            
              <Label htmlFor="activities" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Desired Activities</Label>
              <ActivitiesGrid
                selectedActivities={selectedActivities}
                toggleActivity={toggleActivity}
              />
            

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                "Generate Plan"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    
  );
}
