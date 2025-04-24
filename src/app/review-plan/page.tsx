"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import {
  Button
} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  generateTravelPlan,
  type GenerateTravelPlanInput,
  type GenerateTravelPlanOutput,
} from "@/ai/flows/generate-travel-itinerary"; // Import generateTravelPlan

const SESSION_STORAGE_PRELIMINARY_KEY = "preliminaryPlan";
const SESSION_STORAGE_PLAN_KEY = "generatedPlan"; // Constant for storing the final plan
const SESSION_STORAGE_TRAVEL_PREFERENCES_KEY = "travelPreferences"; // Constant for storing travel preferences
const TOAST_DESTRUCTIVE_VARIANT = "destructive" as const;
const TOAST_DEFAULT_VARIANT = "default" as const;
const TOAST_DURATION_MS = 5000;

interface PointOfInterest {
  name: string;
  location: string;
  description: string;
}

interface ReviewPlanProps { }

const ReviewPlan: React.FC<ReviewPlanProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [pointsOfInterest, setPointsOfInterest] = useState<PointOfInterest[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [selectedPointsOfInterest, setSelectedPointsOfInterest] = useState<PointOfInterest[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedPreliminaryPlan = sessionStorage.getItem(SESSION_STORAGE_PRELIMINARY_KEY);
    if (storedPreliminaryPlan) {
      try {
        const parsedPlan = JSON.parse(storedPreliminaryPlan);
        setPointsOfInterest(parsedPlan.pointsOfInterest || []);
        setActivities(parsedPlan.activities || []);
      } catch (error) {
        console.error("Error parsing preliminary plan from session storage:", error);
        toast({
          title: "Error",
          description: "Failed to load preliminary plan. Please generate again.",
          variant: TOAST_DESTRUCTIVE_VARIANT,
          duration: TOAST_DURATION_MS,
        });
        router.push("/travel-preferences"); // Redirect to preferences page on error
      }
    } else {
      toast({
        title: "No Plan Found",
        description: "No preliminary plan found. Please generate one first.",
        variant: TOAST_DESTRUCTIVE_VARIANT,
        duration: TOAST_DURATION_MS,
      });
      router.push("/travel-preferences"); // Redirect to preferences page if no plan
    }
  }, [router, toast]);

  const handleGenerateFinalItinerary = async () => {
    setIsLoading(true);
    try {
      // Fetch input from session storage that was used to generate the preliminary plan
      const inputData = sessionStorage.getItem(SESSION_STORAGE_TRAVEL_PREFERENCES_KEY);

      if (!inputData) {
          toast({
              title: "Error",
              description: "Travel preferences not found. Please fill out the form again.",
              variant: TOAST_DESTRUCTIVE_VARIANT,
              duration: TOAST_DURATION_MS,
          });
          router.push("/travel-preferences");
          return;
      }

      const input: GenerateTravelPlanInput = JSON.parse(inputData);
      // Update the input with selected points of interest and activities
      const selectedPOI = selectedPointsOfInterest.map(poi => poi.name).join(', ');
      const selectedActs = selectedActivities.join(', ');
      const feedbackString = `Include these points of interest: ${selectedPOI}. Include these activities: ${selectedActs}.`;

      const updatedInput: GenerateTravelPlanInput = {
          ...input,
          feedback: feedbackString, // Include the feedback about selected POIs and Activities
      };

      // Call to generateTravelPlan API
      const finalItinerary: GenerateTravelPlanOutput = await generateTravelPlan(updatedInput);
      sessionStorage.setItem(SESSION_STORAGE_PLAN_KEY, JSON.stringify(finalItinerary));

      toast({
        title: "Success!",
        description: "Final itinerary generated!",
        variant: TOAST_DEFAULT_VARIANT,
        duration: TOAST_DURATION_MS,
      });
      router.push('/planner');

    } catch (error) {
      console.error("Error generating travel plan:", error);
      toast({
        title: "Error",
        description: "Failed to generate the final itinerary. Please try again.",
        variant: TOAST_DESTRUCTIVE_VARIANT,
        duration: TOAST_DURATION_MS,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePointOfInterest = useCallback(
    (poi: PointOfInterest) => {
      setSelectedPointsOfInterest(prev => {
        const alreadySelected = prev.some(item => item.name === poi.name && item.location === poi.location);
        if (alreadySelected) {
          return prev.filter(item => !(item.name === poi.name && item.location === poi.location));
        } else {
          return [...prev, poi];
        }
      });
    },
    []
  );

  const toggleActivity = useCallback(
    (activity: string) => {
      setSelectedActivities(prev => {
        if (prev.includes(activity)) {
          return prev.filter(item => item !== activity);
        } else {
          return [...prev, activity];
        }
      });
    },
    []
  );

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Review Suggested Itinerary Elements</CardTitle>
          <CardDescription>
            Review the suggested points of interest and activities. Select the ones you like, and then generate the final itinerary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Points of Interest */}
          <div className="space-y-2">
            <Label>Points of Interest</Label>
            {pointsOfInterest.map((poi) => (
              <div key={`${poi.name}-${poi.location}`} className="flex items-center space-x-2">
                <Checkbox
                  id={`poi-${poi.name}-${poi.location}`}
                  checked={selectedPointsOfInterest.some(item => item.name === poi.name && item.location === poi.location)}
                  onCheckedChange={() => togglePointOfInterest(poi)}
                />
                <Label htmlFor={`poi-${poi.name}-${poi.location}`} className="font-normal">
                  {poi.name} ({poi.location}) - {poi.description}
                </Label>
              </div>
            ))}
          </div>

          {/* Activities */}
          <div className="space-y-2">
            <Label>Activities</Label>
            {activities.map((activity) => (
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

          {/* Generate Final Itinerary Button */}
          <Button
            onClick={handleGenerateFinalItinerary}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Final Itinerary...
              </>
            ) : (
              "Generate Final Itinerary"
            )}
          </Button>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
};

export default ReviewPlan;
