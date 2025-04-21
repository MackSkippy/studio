"use client";

import { useState, useEffect } from "react";
import { generateTravelItinerary } from "@/ai/flows/generate-travel-itinerary";
import { recommendAccommodationTransport } from "@/ai/flows/recommend-accommodation-transport";
import { refineTravelItinerary } from "@/ai/flows/refine-travel-itinerary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TravelPlanner() {
  const [destination, setDestination] = useState("");
  const [departureLocation, setDepartureLocation] = useState("");
  const [dates, setDates] = useState("");
  const [specificLocations, setSpecificLocations] = useState("");
  const [desiredActivities, setDesiredActivities] = useState("");
  const [itinerary, setItinerary] = useState("");
  const [feedback, setFeedback] = useState("");
  const [accommodationRecommendations, setAccommodationRecommendations] = useState("");
  const [transportationRecommendations, setTransportationRecommendations] = useState("");

  useEffect(() => {
    const initialItinerary = async () => {
      const defaultInput = {
        destination: "Tokyo, Japan",
        departureLocation: "New York, USA",
        dates: "2024-03-15 to 2024-03-22",
        specificLocations: "Shibuya, Asakusa",
        desiredActivities: "Sightseeing, Food tour",
        feedback: "",
      };
      const result = await generateTravelItinerary(defaultInput);
      const generatedItinerary = result?.itinerary || "No itinerary generated.";
      setItinerary(generatedItinerary);

      // Optionally, set the input fields with the default values
      setDestination(defaultInput.destination);
      setDepartureLocation(defaultInput.departureLocation);
      setDates(defaultInput.dates);
      setSpecificLocations(defaultInput.specificLocations);
      setDesiredActivities(defaultInput.desiredActivities);

      // Recommend Accommodation and Transport with the initially generated itinerary
      const recommendInput = {
        destination: defaultInput.destination,
        departureLocation: defaultInput.departureLocation,
        departureTime: defaultInput.dates,
        itinerary: generatedItinerary,
        preferences: "",
      };
      const recommendResult = await recommendAccommodationTransport(recommendInput);
      setAccommodationRecommendations(JSON.stringify(recommendResult?.accommodations, null, 2) || "No accommodations recommended.");
      setTransportationRecommendations(JSON.stringify(recommendResult?.transportationOptions, null, 2) || "No transportations recommended.");
    };

    initialItinerary();
  }, []);

  const handleGenerateItinerary = async () => {
    const input = {
      destination,
      departureLocation,
      dates,
      specificLocations,
      desiredActivities,
      feedback: "",
    };
    const result = await generateTravelItinerary(input);
    const generatedItinerary = result?.itinerary || "No itinerary generated.";
    setItinerary(generatedItinerary);

    // Recommend Accommodation and Transport with the newly generated itinerary
    const recommendInput = {
      destination,
      departureLocation,
      departureTime: dates,
      itinerary: generatedItinerary,
      preferences: feedback,
    };
    const recommendResult = await recommendAccommodationTransport(recommendInput);
    setAccommodationRecommendations(JSON.stringify(recommendResult?.accommodations, null, 2) || "No accommodations recommended.");
    setTransportationRecommendations(JSON.stringify(recommendResult?.transportationOptions, null, 2) || "No transportations recommended.");
  };

  const handleRecommendAccommodationTransport = async () => {
    const input = {
      destination,
      departureLocation,
      departureTime: dates,
      itinerary,
      preferences: feedback,
    };
    const result = await recommendAccommodationTransport(input);
    setAccommodationRecommendations(JSON.stringify(result?.accommodations, null, 2) || "No accommodations recommended.");
    setTransportationRecommendations(JSON.stringify(result?.transportationOptions, null, 2) || "No transportations recommended.");
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
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Dates</label>
                <Input type="text" value={dates} onChange={(e) => setDates(e.target.value)} placeholder="e.g., 2024-03-15 to 2024-03-22" />
              </div>
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Specific Locations</label>
                <Input type="text" value={specificLocations} onChange={(e) => setSpecificLocations(e.target.value)} placeholder="e.g., Shibuya, Asakusa" />
              </div>
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Desired Activities</label>
                <Input type="text" value={desiredActivities} onChange={(e) => setDesiredActivities(e.target.value)} placeholder="e.g., Sightseeing, Food tour" />
              </div>
              <Button onClick={handleGenerateItinerary}>Generate Itinerary</Button>
              <Button onClick={handleRecommendAccommodationTransport}>Recommend Accommodation and Transport</Button>
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
              <Textarea value={itinerary} readOnly className="min-h-[200px]" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Accommodation Recommendations</CardTitle>
              <CardDescription>Recommended accommodations based on your itinerary.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={accommodationRecommendations} readOnly className="min-h-[100px]" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Transportation Recommendations</CardTitle>
              <CardDescription>Recommended transportation options.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={transportationRecommendations} readOnly className="min-h-[100px]" />
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
      </div>
    </div>
  );
}
