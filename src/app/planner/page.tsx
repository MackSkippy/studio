"use client";

import React, { useState, useEffect, useCallback, ChangeEvent } from "react";
import { refineTravelItinerary } from "@/ai/flows/refine-travel-itinerary"; // Assuming path is correct
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { ItineraryItem, PointOfInterest, Transportation } from "@/types/types";
import {DragDropContext, Droppable, Draggable} from 'react-beautiful-dnd';

// --- Constants ---
const SESSION_STORAGE_KEY = "generatedPlan";

// --- Helper Functions ---
const generateMapLink = (query: string): string => {
  // Correct Google Maps search URL structure
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

// --- Sub-Components ---

/**
 * Renders a single item (day) in the itinerary.
 */
interface ItineraryItemViewProps {
    item: ItineraryItem;
    index: number; // Add index prop
}
const ItineraryItemView: React.FC<ItineraryItemViewProps> = ({ item, index }) => {
  // Determine the label: Use item.day if it looks like a date, otherwise use "Day X"
  const dayLabel = item.day && isNaN(Date.parse(item.day)) ? item.day : `Day ${index + 1}`;

  return (
    <li className="border-b pb-4 last:border-b-0 last:pb-0">
       {/* Combine Day Label with Headline */}
      <h3 className="font-semibold text-lg mb-1 text-muted-foreground">
        <span className="font-bold">{dayLabel}:</span> {item.headline}
      </h3>
      <p className="mb-3 text-sm text-muted-foreground">{item.description}</p>

      {/* Points of Interest */}
      {item.pointsOfInterest && item.pointsOfInterest.length > 0 && (
        <div className="mt-3 pl-2 border-l-2 border-gray-200 ml-1">
          <h4 className="font-medium text-md mb-1 text-muted-foreground">Points of Interest:</h4>
          <ul className="list-disc list-inside space-y-1">
            {item.pointsOfInterest.map((poi, poiIndex) => (
              // Use poi.name or a unique ID if available as key for better stability
              // Include index in the key to ensure uniqueness if poi names repeat across days
              <li key={`${item.name}-${poiIndex}`} className="text-sm text-muted-foreground">
                {poi.location ? (
                  <a
                    href={generateMapLink(`${poi.name}, ${poi.location}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {poi.name}
                  </a>
                ) : (
                  <span>{poi.name}</span>
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
          <h4 className="font-medium text-md mb-1 text-muted-foreground">Transportation:</h4>
          <div className="text-sm space-y-0.5">
             <p className="text-muted-foreground"><strong>Type:</strong> {item.transportation.type}</p>
             <p className="text-muted-foreground">
               <strong>From:</strong>{" "}
               {item.transportation.departureStation || item.transportation.departureLocation ? (
                 <a
                   href={generateMapLink(item.transportation.departureStation || item.transportation.departureLocation)}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-blue-600 hover:underline"
                 >
                   {item.transportation.departureStation || item.transportation.departureLocation}
                 </a>
               ) : (
                 <span>{item.transportation.departureStation || item.transportation.departureLocation || 'N/A'}</span>
               )}
               <span className="text-gray-600"> @ {item.transportation.departureTime}</span>
             </p>
             <p className="text-muted-foreground">
                <strong>To:</strong>{" "}
                {item.transportation.arrivalStation || item.transportation.arrivalLocation ? (
                  <a
                    href={generateMapLink(item.transportation.arrivalStation || item.transportation.arrivalLocation)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {item.transportation.arrivalStation || item.transportation.arrivalLocation}
                  </a>
                ) : (
                  <span>{item.transportation.arrivalStation || item.transportation.arrivalLocation || 'N/A'}</span>
                )}
                 <span className="text-gray-600"> @ {item.transportation.arrivalTime}</span>
               </p>
           </div>
        </div>
      )}
    </li>
  );
};


/**
 * Displays the itinerary list or handles loading/error/empty states.
 */
interface ItineraryDisplayProps {
  itinerary: ItineraryItem[] | null;
  isLoading: boolean;
  error: string | null;
}
const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ itinerary, isLoading, error }) => {
  if (isLoading) {
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
        <AlertTitle>Error Loading Itinerary</AlertTitle>
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
  const onDragEnd = (result: any) => {
        if (!result.destination) {
          return;
        }

        const items = Array.from(itinerary);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setItinerary(items as ItineraryItem[]);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(items));
      };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided, snapshot) => (
            <ul
              className="space-y-6"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {itinerary.map((item, index) => (
                 <Draggable key={item.day} draggableId={item.day} index={index}>
                      {(provided) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="border-b pb-4 last:border-b-0 last:pb-0"
                        >
                          <ItineraryItemView item={item} index={index} />
                        </li>
                      )}
                    </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </>
  );
};


/**
 * Renders the form for submitting refinement feedback.
 */
interface RefinementFormProps {
    feedback: string;
    onFeedbackChange: (value: string) => void;
    onSubmit: () => void;
    isRefining: boolean;
    refinementError: string | null;
    isDisabled: boolean; // Combined disabled state
}
const RefinementForm: React.FC<RefinementFormProps> = ({
    feedback,
    onFeedbackChange,
    onSubmit,
    isRefining,
    refinementError,
    isDisabled
}) => {
  return (
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
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onFeedbackChange(e.target.value)}
          placeholder="e.g., 'Add more historical sites on Day 3', 'Find restaurants with vegetarian options near the hotel', 'Can we switch the museum visit on Day 2 with the park visit on Day 1?'"
          rows={4}
          disabled={isDisabled} // Disable textarea when refining or form is invalid
        />
        {/* Display refinement-specific error */}
        {refinementError && (
           <p className="text-sm text-red-600">{refinementError}</p>
        )}
        <Button
          onClick={onSubmit}
          disabled={isDisabled || !feedback.trim()} // Also disable if feedback is empty
          className="w-full"
        >
          {isRefining ? (
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
  );
};


// --- Main Component ---
export default function TravelPlanner() {
  // State Definitions
  const [itinerary, setItinerary] = useState<ItineraryItem[] | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true); // Loading from storage
  const [isRefining, setIsRefining] = useState<boolean>(false); // Loading during refinement API call
  const [error, setError] = useState<string | null>(null); // General error (initial load, unexpected)
  const [refinementError, setRefinementError] = useState<string | null>(null); // Specific error for refinement
  const [isGeneratedItinerary, setIsGeneratedItinerary] = useState<boolean>(false);

  // --- Effects ---
  // Load initial itinerary from session storage on mount
  useEffect(() => {
    setIsLoadingInitial(true);
    setError(null);
    setRefinementError(null); // Clear all errors on mount

    try {
        const storedItinerary = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (storedItinerary) {
            const parsedItinerary = JSON.parse(storedItinerary);
            if (Array.isArray(parsedItinerary)) {
                // TODO: Consider adding more robust validation here (e.g., using Zod)
                // to ensure the structure matches ItineraryItem[]
                setItinerary(parsedItinerary);
            } else {
                console.error("Stored itinerary is not an array:", parsedItinerary);
                setError("Failed to load itinerary: Invalid format in storage.");
                setItinerary(null);
            }
        } else {
             // No itinerary found in storage is not an error state, just empty.
             setItinerary(null);
        }
    } catch (parseError) {
        console.error("Error parsing itinerary from session storage:", parseError);
        setError("Failed to load itinerary: Could not parse stored data.");
        setItinerary(null);
    } finally {
        setIsLoadingInitial(false);
    }
  }, []); // Empty dependency array runs only once on mount

  // --- Handlers ---
  const handleRefineItinerary = useCallback(async () => {
    // Basic validation before API call
    if (!Array.isArray(itinerary)) {
      setRefinementError("Cannot refine: Current itinerary is not loaded or invalid.");
      return;
    }
    if (!feedback.trim()) {
       setRefinementError("Please provide feedback to refine the itinerary.");
       return;
    }

    setIsRefining(true);
    setError(null); // Clear general errors
    setRefinementError(null); // Clear previous refinement errors

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
             // TODO: Add runtime validation (e.g., Zod) for parsedRefinedItinerary
             setItinerary(parsedRefinedItinerary);
             sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsedRefinedItinerary));
             setFeedback(""); // Clear feedback field on success
          } else {
            console.error("Refined itinerary data is not an array:", parsedRefinedItinerary);
            setRefinementError("Failed to refine: The updated itinerary format is invalid.");
          }
        } catch (parseError) {
          console.error("Error parsing refined itinerary:", parseError, result.refinedItinerary);
          setRefinementError("Failed to refine: Could not understand the updated itinerary format.");
        }
      } else {
        console.error("Refinement response missing 'refinedItinerary':", result);
        setRefinementError("Failed to refine: No updated itinerary was received from the service.");
      }
    } catch (apiError) {
      console.error("Error calling refineTravelItinerary API:", apiError);
      const message = apiError instanceof Error ? apiError.message : 'An unknown error occurred.';
      setRefinementError(`Failed to refine itinerary: ${message}`);
    } finally {
      setIsRefining(false);
    }
  }, [itinerary, feedback]); // Dependencies for the callback

  const handleGenerateItinerary = useCallback(async () => {
    setIsLoadingInitial(true);
    setError(null); // Clear any existing errors

    try {
      const storedPrefs = sessionStorage.getItem(SESSION_STORAGE_TRAVEL_PREFERENCES_KEY);

      if (!storedPrefs) {
        setError("No travel preferences found. Please fill out the form again.");
        return;
      }

      const parsedPrefs = JSON.parse(storedPrefs);

      const result = await generateTravelPlan(parsedPrefs);

      if (result?.plan) {
        setItinerary(result.plan);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(result.plan));
        setIsGeneratedItinerary(true);
      } else {
        setError("Failed to generate itinerary. Please try again.");
      }
    } catch (apiError) {
      console.error("Error calling generateTravelItinerary API:", apiError);
      const message = apiError instanceof Error ? apiError.message : 'An unknown error occurred.';
      setError(`Failed to generate itinerary: ${message}`);
    } finally {
      setIsLoadingInitial(false);
    }
  }, []);

  // --- Derived State ---
  const showRefinementForm = Array.isArray(itinerary) && itinerary.length > 0;
  const isRefinementDisabled = isRefining || isLoadingInitial; // Disable form during any loading state
  const isGenerateItineraryDisabled = isLoadingInitial;

  // --- Render ---
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Generated Itinerary</h1>

      {/* Display general errors (like initial load failure) prominently */}
      {error && !isLoadingInitial && (
         <Alert variant="destructive" className="mb-6">
             <AlertTitle>Error</AlertTitle>
             <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Itinerary Display Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Trip Plan</CardTitle>
            <CardDescription>
              View your personalized travel itinerary below.
            </CardDescription>
          </CardHeader>
          <CardContent>
          {isGeneratedItinerary ? (
              <ItineraryDisplay
                itinerary={itinerary}
                isLoading={isLoadingInitial}
                error={null} // Initial load errors handled above the card
              />
            ) : (
              <div className="flex justify-center">
                <Button onClick={handleGenerateItinerary} disabled={isGenerateItineraryDisabled}>
                  {isLoadingInitial ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Generate Itinerary"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Card - Conditionally Rendered */}
        {showRefinementForm && (
          <RefinementForm
            feedback={feedback}
            onFeedbackChange={setFeedback}
            onSubmit={handleRefineItinerary}
            isRefining={isRefining}
            refinementError={refinementError}
            isDisabled={isRefinementDisabled}
          />
        )}
      </div>
    </div>
  );
}
