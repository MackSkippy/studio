"use client";

import { useState } from "react";
import { generateTravelItinerary } from "@/ai/flows/generate-travel-itinerary";
import { refineTravelItinerary } from "@/ai/flows/refine-travel-itinerary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function TravelPlanner() {
  const [destination, setDestination] = useState("");
  const [departureLocation, setDepartureLocation] = useState("Mountain View, CA");
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [specificLocations, setSpecificLocations] = useState("");
  const [desiredActivities, setDesiredActivities] = useState("");
  const [accommodationStyle, setAccommodationStyle] = useState("");
  const [nightlyCostRange, setNightlyCostRange] = useState("");
  const [itinerary, setItinerary] = useState("");
  const [feedback, setFeedback] = useState("");

  const handleGenerateItinerary = async () => {
    const input = {
      destination,
      departureLocation,
      dates: departureDate && returnDate ? `${format(departureDate, "yyyy-MM-dd")} to ${format(returnDate, "yyyy-MM-dd")}` : '',
      specificLocations,
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
    setItinerary(generatedItinerary);

    // Optionally, set the input fields with the generated values
    setDestination(input.destination);
    setDepartureLocation(input.departureLocation);
    setSpecificLocations(input.specificLocations);
    setDesiredActivities(input.desiredActivities);
    setAccommodationStyle(input.accommodationStyle);
    setNightlyCostRange(input.nightlyCostRange);
  };

  const handleRefineItinerary = async () => {
    const input = {
      itinerary,
      feedback,
      preferences: ""
    };
    const result = await refineTravelItinerary(input);
    setItinerary(result?.refinedItinerary || "No itinerary refined.");
  };

  const renderItineraryOutline = () => {
    try {
      if (itinerary === '') {
        return <Textarea value={"No itinerary generated yet"} readOnly className="min-h-[200px]" />;
      }

      if (typeof itinerary === 'string') {
        return <Textarea value={itinerary} readOnly className="min-h-[200px]" />;
      }

      if (!Array.isArray(itinerary)) {
        return <Textarea value="Invalid itinerary format." readOnly className="min-h-[200px]" />;
      }

      return (
        <ul>
          {itinerary.map((item, index) => (
            <li key={index} className="mb-4">
              <h3 className="font-semibold">{item.day}</h3>
              <p className="mb-2">{item.description}</p>

              {item.accommodation && (
                <div className="mt-2">
                  <h4 className="font-semibold">Accommodation:</h4>
                  <p>Name: {item.accommodation.name}</p>
                  <p>Location: {item.accommodation.location}</p>
                  <p>Price: {item.accommodation.price}</p>
                  <p>Rating: {item.accommodation.rating}</p>
                  <p>
                    URL:
                    <a href={item.accommodation.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                      {item.accommodation.url}
                    </a>
                  </p>
                </div>
              )}

              {item.transportation && (
                <div className="mt-2">
                  <h4 className="font-semibold">Transportation:</h4>
                  <p>Type: {item.transportation.type}</p>
                  <p>Departure Location: {item.transportation.departureLocation}</p>
                  <p>Arrival Location: {item.transportation.arrivalLocation}</p>
                  <p>Departure Time: {item.transportation.departureTime}</p>
                  <p>Arrival Time: {item.transportation.arrivalTime}</p>
                  <p>Price: {item.transportation.price}</p>
                  <p>
                    URL:
                    <a href={item.transportation.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                      {item.transportation.url}
                    </a>
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      );
    } catch (error) {
      return <Textarea value={itinerary} readOnly className="min-h-[200px]" />;
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Plan Your Trip</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Travel Preferences</CardTitle>
              <CardDescription>Enter your travel details to generate a personalized itinerary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Destination</label>
                <Input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g., Tokyo, Japan" />
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
                </div>
              </div>
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Specific Locations</label>
                <Input type="text" value={specificLocations} onChange={(e) => setSpecificLocations(e.target.value)} placeholder="e.g., Shibuya, Asakusa" />
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
          <Card>
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
              <CardDescription>Provide feedback to refine the itinerary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="e.g., Too many activities, not enough free time" />
              <Button onClick={handleRefineItinerary}>Refine Itinerary</Button>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Itinerary</CardTitle>
              <CardDescription>View your personalized travel itinerary.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderItineraryOutline()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
