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
  type PreliminaryPlanOutput,
} from "@/ai/flows/generate-travel-itinerary"; // Import generateTravelPlan

const SESSION_STORAGE_PRELIMINARY_KEY = "preliminaryPlan";
const SESSION_STORAGE_PLAN_KEY = "generatedPlan"; // Constant for storing the final plan
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
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedPreliminaryPlan = sessionStorage.getItem(SESSION_STORAGE_PRELIMINARY_KEY);
    if (storedPreliminaryPlan) {
      try {
        const parsedPlan: PreliminaryPlanOutput = JSON.parse(storedPreliminaryPlan);
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
      //TODO: Fetch input from session storage that was used to generate the preliminary plan
      //It should be the same input the user entered on the travel-preferences page
      //const inputData = sessionStorage.getItem('travelPreferencesInput');
      //const input: GenerateTravelPlanInput = JSON.parse(inputData);

      //Call to generateTravelPlan API
      //const finalItinerary: GenerateTravelPlanOutput = await generateTravelPlan(input);
      //sessionStorage.setItem(SESSION_STORAGE_PLAN_KEY, JSON.stringify(finalItinerary));

      //Basic navigation to the generated plan
      //router.push('/planner');
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
      // TODO: Implement logic to track which POIs are selected.
      // This could involve adding/removing them from a selectedPois state.
      console.log(`Toggled Point of Interest: ${poi.name}`);
    },
    []
  );

  const toggleActivity = useCallback(
    (activity: string) => {
      // TODO: Implement logic to track which activities are selected.
      console.log(`Toggled Activity: ${activity}`);
    },
    []
  );

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Review Your Preliminary Plan</CardTitle>
          <CardDescription>
            Review the suggested points of interest and activities. Provide feedback and approve to generate the final itinerary.
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
