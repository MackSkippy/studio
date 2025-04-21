"use client";

import { useState, useEffect, useCallback } from "react";
import { refineTravelItinerary } from "@/ai/flows/refine-travel-itinerary"; // Assuming this path is correct
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Example: Using Alert for errors
import { Loader2 } from "lucide-react"; // Example: Using lucide-react for loading icon

// --- Define Types for better Type Safety ---
interface PointOfInterest {
  name: string;
  location: string;
  // Add other relevant fields if available, e.g., description, openingHours
}

interface Transportation {
  type: string;
  departureLocation: string;
  arrivalLocation: string;
  departureStation?: string;
  arrivalStation?: string;
  departureTime: string;
  arrivalTime: string;
  // Add other relevant fields, e.g., bookingReference, cost
}

interface ItineraryItem {
  day: string; // Or number
  headline: string;
  description: string;
  pointsOfInterest?: PointOfInterest[];
  transportation?: Transportation;
  // Consider adding a unique ID if possible: id?: string;
}

// --- Component ---
export default function TravelPlanner() {
  // State Definitions
  const [itinerary, setItinerary] = useState<ItineraryItem[] | null>(null); // Use null for initial/loading state
  const [feedback, setFeedback] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false); // Loading state for API calls
  const [error, setError] = useState<string | null>(null); // Separate state for API or loading errors
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true); // Track initial load from storage

  // --- Effects ---
  useEffect(() => {
    setIsInitialLoading(true);
    setError(null); // Clear previous errors on mount
    const storedItinerary = sessionStorage.getItem("generatedPlan");

    if (storedItinerary) {
      try {
        const parsedItinerary = JSON.parse(storedItinerary);
        // Basic validation: Check if it's an array
        if (Array.isArray(parsedItinerary)) {
          setItinerary(parsedItinerary);
        } else {
          console.error("Stored itinerary is not an array:", parsedItinerary);
          setError("Failed to load itinerary: Invalid format stored.");
          setItinerary(null); // Ensure itinerary is null if format is bad
        }
      } catch (parseError) {
        console.error("Error parsing itinerary from session storage:", parseError);
        setError("Failed to load itinerary: Could not parse stored data.");
        setItinerary(null); // Ensure itinerary is null on parse error
      }
    } else {
      // Explicitly set itinerary to empty array or keep null and handle in render
      // Using null might be clearer to differentiate "not loaded" from "loaded but empty"
      // Let's set it to null and let the renderer decide the message.
       setItinerary(null);
       // Optional: Set an info message instead of an error if desired
       // setError("No itinerary found. Please generate one first.");
    }
    setIsInitialLoading(false);
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Handlers ---
  const handleRefineItinerary = useCallback(async () => {
    // Ensure we have a valid itinerary structure to refine
    if (!Array.isArray(itinerary)) {
      setError("Cannot refine: Current itinerary is not valid.");
      return;
    }
    if (!feedback.trim()) {
        setError("Please provide feedback to refine the itinerary.")
        return; // Should be caught by button disabled state, but good failsafe
    }

    setIsLoading(true);
    setError(null); // Clear previous errors before new request

    const input = {
      itinerary: JSON.stringify(itinerary), // Stringify the valid itinerary array
      feedback: feedback.trim(),
      preferences: "", // Placeholder for future preferences
    };

    try {
      const result = await refineTravelItinerary(input);
      // Validate the refined itinerary structure before setting state
      if (result?.refinedItinerary) {
         try {
            const parsedRefinedItinerary = JSON.parse(result.refinedItinerary);
            if (Array.isArray(parsedRefinedItinerary)) {
              setItinerary(parsedRefinedItinerary);
              sessionStorage.setItem('generatedPlan', JSON.stringify(parsedRefinedItinerary));

            } else {
              console.error("Refined itinerary is not an array:", result);
              // Keep the old itinerary, show an error
              setError("Failed to refine itinerary: Invalid response from refinement service. Refined itinerary is not a valid JSON array.");
            }
         } catch (parseError) {
            console.error("Error parsing refined itinerary from refinement service:", parseError);
            // Keep the old itinerary, show an error
            setError("Failed to refine itinerary: Could not parse refined itinerary data.");
         }
        setFeedback(""); // Clear feedback field on success
        // Optionally save the refined itinerary back to session storage
      } else {
         console.error("Refined itinerary is missing or has invalid format:", result);
        // Keep the old itinerary, show an error
        setError("Failed to refine itinerary: Invalid response from refinement service.");
      }
    } catch (refineError) {
      console.error("Error refining itinerary:", refineError);
      // Keep the old itinerary, show an error
      setError(`Failed to refine itinerary. ${refineError instanceof Error ? refineError.message : 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [itinerary, feedback]); // Dependencies for the callback

  // --- Rendering Logic ---
  const renderMapLink = (query: string) => {
    // Correct Google Maps search URL
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const renderItineraryContent = () => {
    if (isInitialLoading) {
      return (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <p className="ml-2 text-gray-600">Loading itinerary...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!itinerary) {
        return <p className="text-gray-600">No itinerary generated yet. Please use the travel preferences form to create one.</p>;
    }

    if (itinerary.length === 0) {
      return <p className="text-gray-600">Your itinerary is currently empty.</p>;
    }

    // Render the actual itinerary list
    return (
      <ul className="space-y-6">
        {itinerary.map((item, index) => (
          // Using index as key is acceptable if items don't have unique IDs and list order is stable per render
          <li key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
             <h3 className="font-semibold text-lg mb-1">{item.headline}</h3>
            <p className="mb-3 text-sm text-gray-700">{item.description}</p>

            {/* Points of Interest */}
            {item.pointsOfInterest && item.pointsOfInterest.length > 0 && (
              <div className="mt-3 pl-2 border-l-2 border-gray-200 ml-1">
                <h4 className="font-medium text-md mb-1">Points of Interest:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {item.pointsOfInterest.map((poi, poiIndex) => (
                    <li key={poiIndex} className="text-sm">
                      {poi.location ? (
                        <a
                          href={renderMapLink(`${poi.name}, ${poi.location}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {poi.name}
                        </a>
                      ) : (
                        <span>{poi.name}</span> // Display name without link if no location
                      )}
                      {poi.location && <span className="text-gray-600"> ({poi.location})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Transportation */}
            {item.transportation && (
              <div className="mt-3 pl-2 border-l-2 border-gray-200 ml-1">
                <h4 className="font-medium text-md mb-1">Transportation:</h4>
                 <div className="text-sm space-y-0.5">
                     <p><strong>Type:</strong> {item.transportation.type}</p>
                     <p>
                       <strong>From:</strong>{" "}
                       {item.transportation.departureStation || item.transportation.departureLocation ? (
                        <a
                         href={renderMapLink(item.transportation.departureStation || item.transportation.departureLocation)}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-blue-600 hover:underline"
                       >
                         {item.transportation.departureStation || item.transportation.departureLocation}
                       </a>
                       ) : (
                        <span>{item.transportation.departureStation || item.transportation.departureLocation}</span>
                       )}
                       <span className="text-gray-600"> @ {item.transportation.departureTime}</span>
                     </p>
                     <p>
                       <strong>To:</strong>{" "}
                       {item.transportation.arrivalStation || item.transportation.arrivalLocation ? (
                         <a
                           href={renderMapLink(item.transportation.arrivalStation || item.transportation.arrivalLocation)}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-blue-600 hover:underline"
                         >
                           {item.transportation.arrivalStation || item.transportation.arrivalLocation}
                         </a>
                       ) : (
                         <span>{item.transportation.arrivalStation || item.transportation.arrivalLocation}</span>
                       )}
                        <span className="text-gray-600"> @ {item.transportation.arrivalTime}</span>
                     </p>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  // --- Component Return ---
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4"> {/* Added max-width */}
      <h1 className="text-3xl font-bold mb-6 text-center">Generated Itinerary</h1>
      {/* Display general errors above cards if needed */}
       {/* {error && !isInitialLoading && ( // Show API errors prominently if desired
           <Alert variant="destructive" className="mb-6">
               <AlertTitle>Refinement Error</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
           </Alert>
       )} */}

      <div className="grid grid-cols-1 gap-6">
        {/* Itinerary Display Card */}
        <Card>
          <CardHeader>
            <CardTitle>Itinerary</CardTitle>
            <CardDescription>
              View your personalized travel itinerary below. Provide feedback to refine it.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {/* Render loading, error, or itinerary */}
            {renderItineraryContent()}
          </CardContent>
        </Card>

        {/* Feedback Card - Only show if an itinerary exists */}
        {Array.isArray(itinerary) && itinerary.length > 0 && (
           <Card>
             <CardHeader>
               <CardTitle>Refine Your Itinerary</CardTitle>
               <CardDescription>
                 Tell us what you'd like to change, add, or remove.
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <Textarea
                 value={feedback}
                 onChange={(e) => setFeedback(e.target.value)}
                 placeholder="e.g., 'Add more historical sites on Day 3', 'Find restaurants with vegetarian options near the hotel', 'Can we switch the museum visit on Day 2 with the park visit on Day 1?'"
                 rows={4} // Suggest setting rows for better initial size
                 disabled={isLoading} // Disable textarea during API call
               />
                {/* Display refinement-specific error near the button */}
               {error && !isInitialLoading && (
                   <p className="text-sm text-red-600">{error}</p>
               )}
               <Button
                 onClick={handleRefineItinerary}
                 disabled={isLoading || !feedback.trim() || !Array.isArray(itinerary)} // Disable if loading, no feedback, or no valid itinerary
               >
                 {isLoading ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     Refining...
                   </>
                 ) : (
                   'Refine Itinerary'
                 )}
               </Button>
             </CardContent>
           </Card>
        )}

      </div>
    </div>
  );
}
