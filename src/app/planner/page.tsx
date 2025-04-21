"use client";

import { useState, useEffect } from "react";
import { refineTravelItinerary } from "@/ai/flows/refine-travel-itinerary";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams, useRouter } from 'next/navigation';

export default function TravelPlanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // const initialItinerary = searchParams.get('itinerary') || "";
  const [itinerary, setItinerary] = useState<any>(''); //initialItinerary ? JSON.parse(initialItinerary) : '');
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    // Retrieve the itinerary from session storage
    const storedItinerary = sessionStorage.getItem('generatedPlan');
    if (storedItinerary) {
      try {
        setItinerary(JSON.parse(storedItinerary));
      } catch (error) {
        console.error("Error parsing itinerary from session storage:", error);
        setItinerary("Error loading itinerary.");
      }
    } else {
      setItinerary("No itinerary generated yet. Please fill out travel preferences to begin.");
    }
  }, []);

  const handleRefineItinerary = async () => {
    const input = {
      itinerary: JSON.stringify(itinerary),
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

              {/* Points of Interest */}
              {item.pointsOfInterest && item.pointsOfInterest.length > 0 && (
                <div>
                  <h4 className="font-semibold">Points of Interest:</h4>
                  <ul>
                    {item.pointsOfInterest.map((poi, poiIndex) => (
                      <li key={poiIndex}>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500"
                        >
                          {poi.name} ({poi.location})
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Transportation */}
              {item.transportation && (
                <div className="mt-2">
                  <h4 className="font-semibold">Transportation:</h4>
                  <p>Type: {item.transportation.type}</p>
                  <p>
                    Departure Location:{" "}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        item.transportation.departureLocation
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500"
                    >
                      {item.transportation.departureLocation}
                    </a>
                  </p>
                  <p>
                    Arrival Location:{" "}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        item.transportation.arrivalLocation
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500"
                    >
                      {item.transportation.arrivalLocation}
                    </a>
                  </p>
                  <p>Departure Time: {item.transportation.departureTime}</p>
                  <p>Arrival Time: {item.transportation.arrivalTime}</p>
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
      <h1 className="text-2xl font-bold mb-4">Generated Itinerary</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
