"use client";

// --- Core React/Next Imports ---
import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

// --- Third-Party Libraries ---
import { format } from "date-fns";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";

// --- Internal Libs & Utils ---
import { cn } from "@/lib/utils";

// --- Hooks ---
import { useToast } from "@/hooks/use-toast";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toaster";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Data Imports ---
import countryData from "@/data/countries.json";

// --- Types ---
interface CountryData {
  countryCodeMap: { [key: string]: string[] };
  alternativeCountryNames: { [key: string]: string };
}

type ValidationResult = string | null; // Error message or null if valid

// Define a type for the data being stored
interface LocationDateData {
  destination: string;
  arrivalCity: string;
  departureCity: string;
  arrivalDate?: string; // Store as ISO string
  returnDate?: string; // Store as ISO string
  numberOfDays?: number;
  specificLocations: string[];
  otherLocationInput: string;
}

// --- Constants ---
const SESSION_STORAGE_LOCATIONS_DATES_KEY = "locationDateData";
const TOAST_DESTRUCTIVE_VARIANT = "destructive" as const;
const TOAST_DEFAULT_VARIANT = "default" as const;
const TOAST_DURATION_MS = 5000;

// --- Data Extraction ---
const { countryCodeMap, alternativeCountryNames } = countryData as CountryData;

export default function LocationsAndDates() {
  // --- State ---
  const [destination, setDestination] = useState("");
  const [arrivalCity, setArrivalCity] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [arrivalDate, setArrivalDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [numberOfDays, setNumberOfDays] = useState<string>(""); // Keep as string for input control
  const [specificLocations, setSpecificLocations] = useState<string[]>([]);
  const [otherLocationInput, setOtherLocationInput] = useState("");
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- Hooks ---
  const router = useRouter();
  const { toast } = useToast();

  // --- Validation Logic ---
  const validateForm = (): ValidationResult => {
    const destinationTrimmed = destination.trim();
    const arrivalCityTrimmed = arrivalCity.trim();
    const departureCityTrimmed = departureCity.trim();
    const numberOfDaysTrimmed = numberOfDays.trim();
    const numDaysInt = parseInt(numberOfDaysTrimmed, 10);
    const isValidNumDays = !isNaN(numDaysInt) && numDaysInt > 0;

    if (!destinationTrimmed) return "Please enter a destination.";
    if (!arrivalCityTrimmed) return "Please enter the arrival city.";
    if (!departureCityTrimmed) return "Please enter the departure city.";

    // Check if either date or valid duration is provided
    if (!arrivalDate && !isValidNumDays) {
        return "Please select an arrival date OR enter a valid number of days (positive whole number).";
    }

    // Check if ONLY number of days is provided and if it's valid
    if (!arrivalDate && numberOfDaysTrimmed && !isValidNumDays) {
        return "Number of days must be a positive whole number.";
    }

    // Check date consistency if both are provided
    if (arrivalDate && returnDate && returnDate < arrivalDate) {
      return "Return date cannot be before the arrival date.";
    }

    return null; // Form is valid
  };

  // --- Data Preparation Logic ---
  const prepareLocationDateData = (): LocationDateData | null => {
    const manuallyAddedLocations = otherLocationInput
      .split(",")
      .map((loc) => loc.trim())
      .filter(Boolean);
    const allSpecificLocations = Array.from(
      new Set([...specificLocations, ...manuallyAddedLocations])
    );

    const numDaysInt = parseInt(numberOfDays.trim(), 10);
    const finalNumberOfDays = (!isNaN(numDaysInt) && numDaysInt > 0) ? numDaysInt : undefined;

    const data: LocationDateData = {
        destination: destination.trim(),
        arrivalCity: arrivalCity.trim(),
        departureCity: departureCity.trim(),
        arrivalDate: arrivalDate?.toISOString(),
        returnDate: returnDate?.toISOString(),
        numberOfDays: finalNumberOfDays,
        specificLocations: allSpecificLocations, // Use the combined list
        otherLocationInput: otherLocationInput.trim(), // Store the raw input too, might be useful
    };

    // Basic check, though validation should prevent this
    if (!data.destination || !data.arrivalCity || !data.departureCity || (!data.arrivalDate && !data.numberOfDays)) {
        console.error("Data preparation failed unexpectedly after validation:", data);
        toast({ title: "Internal Error", description: "Failed to prepare data correctly.", variant: TOAST_DESTRUCTIVE_VARIANT });
        return null;
    }

    return data;
  };

  // --- City Lookup Helper ---
  const cityLookup = useCallback(
    (dest: string): string[] => {
      const destLower = dest.trim().toLowerCase();
      if (!destLower) return [];
      const standardizedDestination = alternativeCountryNames[destLower] || destLower;
      if (Object.prototype.hasOwnProperty.call(countryCodeMap, standardizedDestination)) {
        return countryCodeMap[standardizedDestination] || [];
      }
      return [];
    },
    [countryCodeMap, alternativeCountryNames]
  );

  // --- Event Handlers ---
  const handleConfirmPlacesAndDates = () => {
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Missing Information",
        description: validationError,
        variant: TOAST_DESTRUCTIVE_VARIANT,
      });
      return;
    }

    const locationData = prepareLocationDateData();
    if (!locationData) {
        // Error already toasted in prepareLocationDateData
        return;
    }

    setIsLoading(true);

    try {
        // Store data in session storage
        sessionStorage.setItem(SESSION_STORAGE_LOCATIONS_DATES_KEY, JSON.stringify(locationData));
        console.log("Stored Location/Date Data:", JSON.stringify(locationData, null, 2));

        toast({
            title: "Places and Dates Confirmed",
            description: "Now, let's select your activity preferences.",
            variant: TOAST_DEFAULT_VARIANT,
        });

        // Navigate to the activities page
        router.push('/activities');

    } catch (error) {
        console.error("Error storing data or navigating:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({
            title: "Error Proceeding",
            description: `Could not save preferences: ${errorMessage}`,
            variant: TOAST_DESTRUCTIVE_VARIANT,
            duration: TOAST_DURATION_MS,
        });
        setIsLoading(false); // Ensure loading state is reset on error
    }
    // No finally block needed for setIsLoading(false) if navigation always happens on success
    // However, if navigation could fail client-side, add finally:
    // finally { setIsLoading(false); }
  };

  const handleDestinationChange = useCallback(
    (newDestinationValue: string) => {
      setDestination(newDestinationValue);
      const cities = cityLookup(newDestinationValue);
      setAvailableCities(cities);
      setSpecificLocations([]);
      setOtherLocationInput("");
      setArrivalCity("");
      setDepartureCity("");
    },
    [cityLookup]
  );

  const toggleSelection = useCallback(
    (
      item: string,
      currentSelection: string[],
      setSelection: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
      setSelection((prev) =>
        prev.includes(item)
          ? prev.filter((val) => val !== item)
          : [...prev, item]
      );
    },
    []
  );

  const toggleSpecificLocation = useCallback(
    (location: string) => {
      toggleSelection(location, specificLocations, setSpecificLocations);
    },
    [specificLocations, toggleSelection]
  );

  const handleNumberOfDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^[1-9]\d*$/.test(value)) {
        setNumberOfDays(value);
        if (value !== "" && returnDate) {
            setReturnDate(undefined);
        }
    }
  };

  const handleArrivalDateSelect = (date: Date | undefined) => {
    setArrivalDate(date);
    if (!date) {
      setReturnDate(undefined);
    }
  };

  const handleReturnDateSelect = (date: Date | undefined) => {
    setReturnDate(date);
    if (date && numberOfDays !== "") {
      setNumberOfDays("");
    }
  };

  // --- Derived State & Render Logic ---
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { isDisabled: isSubmitDisabled, hint: submitHintText } = useMemo(() => {
      const validationError = validateForm();
      const isDisabled = isLoading || !!validationError;
      const hint = isLoading ? null : validationError;
      return { isDisabled, hint };
  }, [isLoading, destination, arrivalCity, departureCity, arrivalDate, numberOfDays, returnDate]); // Removed desiredActivities dependency

  // --- JSX ---
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Places and Dates</CardTitle>
          <CardDescription>
            Tell us where and when you want to travel. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">Destination (Country or Major Region) *</Label>
            <Input
              id="destination"
              placeholder="e.g., Japan, Italy, California Coast"
              value={destination}
              onChange={(e) => handleDestinationChange(e.target.value)}
            />
          </div>

          {/* Arrival/Departure Cities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="arrivalCity">Destination Arrival City *</Label>
              <Input
                id="arrivalCity"
                placeholder="e.g., Tokyo, Rome, Los Angeles (LAX)"
                value={arrivalCity}
                onChange={(e) => setArrivalCity(e.target.value)}
                disabled={!destination.trim()}
              />
            </div>
            <div className="space-y-2">
                <Label htmlFor="departureCity">Destination Departure City *</Label>
                <Input
                  id="departureCity"
                  placeholder="e.g., Osaka, Florence, San Francisco (SFO)"
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                  disabled={!destination.trim()}
                />
            </div>
          </div>

          {/* Dates / Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Arrival Date */}
            <div className="space-y-2">
                <Label htmlFor="arrivalDatePopover">Arrival Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                      <Button
                        id="arrivalDatePopover"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !arrivalDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {arrivalDate ? format(arrivalDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={arrivalDate}
                        onSelect={handleArrivalDateSelect}
                        disabled={(date) => date < today}
                        initialFocus
                      />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">Required unless using Number of Days.</p>
            </div>

            {/* Return Date */}
            <div className="space-y-2">
                <Label htmlFor="returnDatePopover">Return Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                      <Button
                          id="returnDatePopover"
                          variant={"outline"}
                          className={cn(
                          "w-full justify-start text-left font-normal",
                          !returnDate && "text-muted-foreground"
                          )}
                          disabled={!arrivalDate || !!numberOfDays.trim()}
                      >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {returnDate ? format(returnDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                          mode="single"
                          selected={returnDate}
                          onSelect={handleReturnDateSelect}
                          disabled={(date) => date < (arrivalDate || today)}
                          initialFocus
                      />
                    </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">Optional. Clears 'Number of Days'.</p>
            </div>

            {/* Number of Days */}
            <div className="space-y-2">
              <Label htmlFor="numberOfDays">Number of Days</Label>
              <Input
                id="numberOfDays"
                type="text"
                inputMode="numeric"
                pattern="[1-9]\d*"
                placeholder="e.g., 7"
                value={numberOfDays}
                onChange={handleNumberOfDaysChange}
                disabled={!!returnDate}
              />
              <p className="text-xs text-muted-foreground">Use if no Return Date. Clears 'Return Date'.</p>
            </div>
          </div>

          {/* Specific Locations */}
          <div className="space-y-2">
              <Label>Specific Locations (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Select suggested cities for '{destination.trim() || "your destination"}' or add your own below.
              </p>
              {availableCities.length > 0 && (
                <ScrollArea className="h-32 w-full rounded-md border p-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableCities.map((city) => {
                      const cityId = `city-${city.replace(/\s+/g, '-').toLowerCase()}`;
                      return (
                        <div key={cityId} className="flex items-center space-x-2">
                          <Checkbox
                            id={cityId}
                            checked={specificLocations.includes(city)}
                            onCheckedChange={() => toggleSpecificLocation(city)}
                            aria-labelledby={`${cityId}-label`}
                          />
                          <Label htmlFor={cityId} id={`${cityId}-label`} className="font-normal cursor-pointer">
                            {city}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
              <div className="pt-2 space-y-1">
                  <Label htmlFor="otherLocations" className="text-sm font-medium">
                  Add other specific places (comma-separated)
                  </Label>
                  <Input
                    id="otherLocations"
                    placeholder="e.g., Eiffel Tower, Kyoto, Zion National Park"
                    value={otherLocationInput}
                    onChange={(e) => setOtherLocationInput(e.target.value)}
                    disabled={!destination.trim()}
                  />
              </div>
          </div>

          {/* Submit Button & Hint */}
          <div className="flex flex-col items-center space-y-2 pt-4">
              <Button
                type="button"
                onClick={handleConfirmPlacesAndDates}
                disabled={isSubmitDisabled}
                className="w-full md:w-auto px-8 py-3"
                size="lg"
                aria-describedby={submitHintText ? "submit-hint" : undefined}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Saving...
                  </>
                ) : (
                  'Confirm Places and Dates' // Changed button text
                )}
              </Button>
              {isSubmitDisabled && !isLoading && submitHintText && (
                <p id="submit-hint" className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {submitHintText}
                </p>
              )}
          </div>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}
