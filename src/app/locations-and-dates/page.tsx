tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LocationsAndDatesProps {
  onNext?: () => void; 
}

const TravelPreferences: React.FC<LocationsAndDatesProps> = ({ onNext }) => {
 const [destination, setDestination] = useState("");
  const [arrivalCity, setArrivalCity] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [numberOfDays, setNumberOfDays] = useState("");

  const handleNext = () => {
    if (onNext) {
      onNext();
    }
  };
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-4 sm:p-8">
        <CardHeader> 
          <CardTitle className="text-2xl font-bold">
            Travel Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6"> 
          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              placeholder="Enter destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arrivalCity">Arrival City</Label>
            <Input
              id="arrivalCity"
              placeholder="Enter arrival city"
              value={arrivalCity}
              onChange={(e) => setArrivalCity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="departureCity">Departure City</Label>
            <Input
              id="departureCity"
              placeholder="Enter departure city"
              value={departureCity}
              onChange={(e) => setDepartureCity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Calendar mode="single" selected={date} onSelect={setDate} />
            {date && (
              <p className="text-sm text-muted-foreground">
                Selected Date: {format(date, "PPP")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberOfDays">Number of Days</Label>
            <Input
              type="number"
              id="numberOfDays"
              placeholder="Enter number of days"
              value={numberOfDays}
              onChange={(e) => setNumberOfDays(e.target.value)}
            />
          </div>
          <Button onClick={handleNext}>Next</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TravelPreferences;