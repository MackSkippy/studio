"use client";

import { useState, useEffect, useCallback } from "react";
import { generateTravelItinerary } from "@/ai/flows/generate-travel-itinerary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Stub function for fetching cities.  Should be replaced with API call.
async function getTopCities(country: string): Promise<string[]> {
  // Replace with actual API call
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    "Tokyo",
    "New York",
    "London",
    "Paris",
    "Rome",
    "Beijing",
    "Sydney",
    "Moscow",
    "Berlin",
    "Madrid",
  ];
}

export default function TravelPreferences() {
  const [destination, setDestination] = useState("");
  const [departureLocation, setDepartureLocation] = useState("Mountain View, CA");
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [specificLocations, setSpecificLocations] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [desiredActivities, setDesiredActivities] = useState("");
  const [accommodationStyle, setAccommodationStyle] = useState("");
  const [nightlyCostRange, setNightlyCostRange] = useState("");
  const router = useRouter();

  const handleGenerateItinerary = async () => {
    if (!destination) {
      alert("Please enter a destination.");
      return;
    }

    const input = {
      destination,
      departureLocation,
      dates: departureDate && returnDate ? `${format(departureDate, "yyyy-MM-dd")} to ${format(returnDate, "yyyy-MM-dd")}` : '',
      specificLocations: specificLocations.join(', '),
      desiredActivities,
      accommodationStyle,
      nightlyCostRange,
      feedback: "",
    };
    const result = await generateTravelItinerary(input);
    let generatedItinerary: any;
    try {
      generatedItinerary = JSON.parse(JSON.stringify(result?.itinerary)) || "No itinerary generated.";
    } catch (e) {
      generatedItinerary = "No itinerary generated.";
    }

    router.push(`/planner?itinerary=${encodeURIComponent(JSON.stringify(generatedItinerary))}`);
  };

  const handleDestinationChange = useCallback(async (newDestination: string) => {
    setDestination(newDestination);
    // Check if the destination is a country
    const isCountry = newDestination === 'Japan' || newDestination === 'USA' || newDestination === 'France'; // Example check

    if (isCountry) {
      const cities = await getTopCities(newDestination);
      setAvailableCities(cities);
    } else {
      setAvailableCities([]);
    }
  }, []);

  useEffect(() => {
    if (destination) {
      handleDestinationChange(destination);
    }
  }, [destination, handleDestinationChange]);

  const toggleSpecificLocation = (location: string) => {
    if (specificLocations.includes(location)) {
      setSpecificLocations(specificLocations.filter(item => item !== location));
    } else {
      setSpecificLocations([...specificLocations, location]);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Travel Preferences</h1>
      <Card>
        <CardHeader>
          <CardTitle>Enter Your Travel Details</CardTitle>
          <CardDescription>Fill out the form below to generate a personalized itinerary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Destination</label>
            <Input type="text" value={destination} onChange={(e) => handleDestinationChange(e.target.value)} placeholder="e.g., Tokyo, Japan" />
          </div>
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Departure Location</label>
            <Input type="text" value={departureLocation} onChange={(e) => setDepartureLocation(e.target.value)} placeholder="e.g., New York, USA" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Departure Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !departureDate && "text-muted-foreground"
                    )}
                  >
                    {departureDate ? (
                      format(departureDate, "yyyy-MM-dd")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={departureDate}
                    onSelect={setDepartureDate}
                    disabled={returnDate ? { before: returnDate } : undefined}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {/* Place "Pick a date" label below the popover */}
            </div>
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Return Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !returnDate && "text-muted-foreground"
                    )}
                  >
                    {returnDate ? (
                      format(returnDate, "yyyy-MM-dd")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={returnDate}
                    onSelect={setReturnDate}
                    disabled={departureDate ? { before: departureDate } : undefined}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {/* Place "Pick a date" label below the popover */}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Specific Locations</label>
            {availableCities.length > 0 ? (
              <Select onValueChange={(value) => setSpecificLocations([value])}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="text"
                value={specificLocations.join(', ')}
                onChange={(e) => setSpecificLocations(e.target.value.split(',').map(item => item.trim()))}
                placeholder="e.g., Shibuya, Asakusa"
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Desired Activities</label>
            <Input type="text" value={desiredActivities} onChange={(e) => setDesiredActivities(e.target.value)} placeholder="e.g., Sightseeing, Food tour" />
          </div>
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Style of Accommodation</label>
            <Input type="text" value={accommodationStyle} onChange={(e) => setAccommodationStyle(e.target.value)} placeholder="e.g., Hotel, Hostel, Airbnb" />
          </div>
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nightly Cost Range</label>
            <Input type="text" value={nightlyCostRange} onChange={(e) => setNightlyCostRange(e.target.value)} placeholder="e.g., $100-$200" />
          </div>
          <Button onClick={handleGenerateItinerary}>Generate Itinerary</Button>
        </CardContent>
      </Card>
    </div>
  );
}
