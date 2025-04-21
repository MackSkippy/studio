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
  const [isLoading, setIsLoading] = useState(false); // State for loading indicator

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
    setIsLoading(true); // Start loading
    const input = {
      itinerary: JSON.stringify(itinerary),
      feedback,
      preferences: "" // Assuming preferences might be added later
    };
    try {
      const result = await refineTravelItinerary(input);
      setItinerary(result?.refinedItinerary || "No itinerary refined.");
      setFeedback(""); // Clear feedback after successful refinement
    } catch (error) {
        console.error("Error refining itinerary:", error);
        // Optionally, show a toast or error message to the user
        setItinerary(prev => ({ ...prev, error: "Failed to refine itinerary." })); // Append error info if possible
    } finally {
      setIsLoading(false); // Stop loading regardless of success or error
    }
  };

  const renderItineraryOutline = () => {
    try {
      if (itinerary === '') {
        return <Textarea value={"Loading itinerary..."} readOnly className="min-h-[200px]" />;
      }

      if (typeof itinerary === 'string') {
         // Handle specific string messages
         if (itinerary.startsWith("No itinerary generated yet") || itinerary.startsWith("Error loading itinerary")) {
            return <Textarea value={itinerary} readOnly className="min-h-[200px]" />;
         }
         // Attempt to parse if it might be a JSON string that failed initial parsing
         try {
             const parsed = JSON.parse(itinerary);
             setItinerary(parsed); // Update state if parsing succeeds
             // Re-render will happen, might need better handling to avoid loops
             return <Textarea value={"Parsing itinerary..."} readOnly className="min-h-[200px]" />;
         } catch (e) {
             return <Textarea value={\`Invalid itinerary format: ${itinerary}\`} readOnly className="min-h-[200px]" />;
         }
      }

      if (itinerary.error) { // Check for error appended during refinement failure
          return <Textarea value={`Error: ${itinerary.error}

Previous Itinerary:
${JSON.stringify(itinerary, null, 2)}`} readOnly className="min-h-[200px]" />;
      }

      if (!Array.isArray(itinerary)) {
        // It might be an object if not an array, try stringifying for display
        return <Textarea value={\`Invalid itinerary format: ${JSON.stringify(itinerary, null, 2)}\`} readOnly className="min-h-[200px]" />;
      }

      if (itinerary.length === 0) {
          return <Textarea value={"Itinerary is empty."} readOnly className="min-h-[200px]" />;
      }

      return (
        <ul className="space-y-4">
          {itinerary.map((item, index) => (
            <li key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
              <h3 className="font-semibold text-lg mb-1">{item.day}</h3>
              <p className="mb-2 text-sm text-gray-600">{item.description}</p>

              {/* Points of Interest */}
              {item.pointsOfInterest && item.pointsOfInterest.length > 0 && (
                <div className="mt-2">
                  <h4 className="font-medium text-md mb-1">Points of Interest:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {item.pointsOfInterest.map((poi, poiIndex) => (
                      <li key={poiIndex} className="text-sm">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name + ', ' + poi.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
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
                  <h4 className="font-medium text-md mb-1">Transportation:</h4>
                  <p className="text-sm">Type: {item.transportation.type}</p>
                  <p className="text-sm">
                    Departure Location:{" "}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        item.transportation.departureLocation
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {item.transportation.departureLocation}
                    </a>
                  </p>
                  <p className="text-sm">
                    Arrival Location:{" "}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        item.transportation.arrivalLocation
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {item.transportation.arrivalLocation}
                    </a>
                  </p>
                  <p className="text-sm">Departure Time: {item.transportation.departureTime}</p>
                  <p className="text-sm">Arrival Time: {item.transportation.arrivalTime}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      );
    } catch (error) {
       console.error("Error rendering itinerary:", error);
       // Display the raw itinerary data if rendering fails
       const rawItinerary = typeof itinerary === 'string' ? itinerary : JSON.stringify(itinerary, null, 2);
       return <Textarea value={\`Error rendering itinerary. Raw data:

${rawItinerary}\`} readOnly className="min-h-[200px]" />;
    }
  };


  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Generated Itinerary</h1>
      <div className="grid grid-cols-1 gap-6">
        <div>
          {/* Added margin-bottom mb-6 */}
          <Card className="mb-6">
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
            <CardContent className="space-y-4">
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., Add more cultural activities on Day 2, Find cheaper restaurants, I prefer trains over buses."
                disabled={isLoading} // Disable textarea during loading
              />
              <Button onClick={handleRefineItinerary} disabled={isLoading || !feedback.trim()}>
                {isLoading ? 'Refining...' : 'Refine Itinerary'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

