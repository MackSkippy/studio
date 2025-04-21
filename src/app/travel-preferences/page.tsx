"use client";

import { useState, useEffect, useCallback } from "react";
import { generateTravelItinerary } from "@/ai/flows/generate-travel-itinerary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label"; // Added Label import

const topCities = {
  "us": [
    "New York",
    "Los Angeles",
    "Chicago",
    "Houston",
    "Phoenix",
    "Philadelphia",
    "San Antonio",
    "San Diego",
    "Dallas",
    "San Jose",
  ],
  "uk": [
    "London",
    "Birmingham",
    "Glasgow",
    "Liverpool",
    "Bristol",
    "Manchester",
    "Sheffield",
    "Leeds",
    "Edinburgh",
    "Leicester"
  ],
  "japan": [
    "Tokyo",
    "Yokohama",
    "Osaka",
    "Nagoya",
    "Sapporo",
    "Fukuoka",
    "Kawasaki",
    "Kyoto",
    "Saitama",
    "Hiroshima",
  ],
  "france": [
    "Paris",
    "Marseille",
    "Lyon",
    "Toulouse",
    "Nice",
    "Nantes",
    "Strasbourg",
    "Montpellier",
    "Bordeaux",
    "Lille",
  ],
  "india": [
    "Mumbai",
    "Delhi",
    "Bangalore",
    "Hyderabad",
    "Chennai",
    "Kolkata",
    "Pune",
    "Ahmedabad",
    "Jaipur",
    "Lucknow"
  ]
};

async function getTopActivities(destination: string): Promise<string[]> {
  await new Promise(resolve => setTimeout(resolve, 500));
  switch (destination.toLowerCase()) {
    case 'tokyo':
      return [
        "Visit the Sensō-ji Temple",
        "Explore the Meiji Shrine",
        "Wander through the Shibuya Crossing",
        "Experience the Tsukiji Outer Market",
        "Climb the Tokyo Skytree",
        "Relax in the Shinjuku Gyoen National Garden",
        "Discover the Ginza district",
        "Visit the Imperial Palace",
        "Explore the Ueno Park and Museums",
        "Enjoy the nightlife in Roppongi",
        "Take a day trip to Hakone",
        "Visit the Ghibli Museum",
        "Attend a Sumo Wrestling Match",
        "Experience a Traditional Tea Ceremony",
        "Shop in Akihabara",
      ];
    case 'paris':
      return [
        "Visit the Eiffel Tower",
        "Explore the Louvre Museum",
        "Stroll along the Champs-Élysées",
        "Visit the Notre-Dame Cathedral",
        "Explore the Montmartre neighborhood",
        "Visit the Sacré-Cœur Basilica",
        "Take a boat tour on the Seine",
        "Visit the Palace of Versailles",
        "Explore the Latin Quarter",
        "Visit the Musée d'Orsay",
        "Relax in the Jardin du Luxembourg",
        "Visit the Arc de Triomphe",
        "Explore the Marais district",
        "Visit the Centre Pompidou",
        "Attend a cabaret show at the Moulin Rouge",
      ];
    case 'new york':
      return [
        "Visit Times Square",
        "See the Statue of Liberty",
        "Walk through Central Park",
        "Visit the Metropolitan Museum of Art",
        "See a Broadway Show",
        "Visit the Empire State Building",
        "Explore Greenwich Village",
        "Visit the 9/11 Memorial & Museum",
        "Walk the Brooklyn Bridge",
        "Visit the American Museum of Natural History",
        "Explore the High Line",
        "Visit the One World Observatory",
        "Explore the Lower East Side",
        "Visit the Guggenheim Museum",
        "See a Yankee Game"
      ];
    default:
      return [];
  }
}

const predefinedActivities = [
  "Scenery",
  "Cultural hubs",
  "Historical Landmarks",
  "Museums",
  "Street Food",
  "Fine Dining",
  "Unique Goods",
  "Clothes Shopping",
  "Pools and Beaches",
  "Spas and Onsens",
  "Hiking",
  "Extreme Sports",
  "Animal Encounters",
  "Festivals",
  "Theme Parks",
  "Bars and Nightclubs",
  "Craft Beer/Wine/Liquor",
  "Sports",
];

export default function TravelPreferences() {
  const [destination, setDestination] = useState("");
  const [departureLocation, setDepartureLocation] = useState("Mountain View, CA");
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [specificLocations, setSpecificLocations] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [desiredActivities, setDesiredActivities] = useState<string[]>([]);
  const [availableActivities, setAvailableActivities] = useState<string[]>([]);
  const [accommodationStyle, setAccommodationStyle] = useState("");
  const [nightlyCostRange, setNightlyCostRange] = useState("");
  const [otherLocation, setOtherLocation] = useState("");
  const [useOtherLocation, setUseOtherLocation] = useState(false);
  const router = useRouter();

  const handleGenerateItinerary = async () => {
    if (!destination) {
      alert("Please enter a destination.");
      return;
    }

    let allSpecificLocations = [...specificLocations];
    if (useOtherLocation && otherLocation) {
      allSpecificLocations.push(otherLocation);
    }

    const input = {
      destination,
      departureLocation,
      dates: departureDate && returnDate ? `${format(departureDate, "yyyy-MM-dd")} to ${format(returnDate, "yyyy-MM-dd")}` : '',
      specificLocations: allSpecificLocations.join(', '),
      desiredActivities: desiredActivities.join(', '),
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

    // Store the itinerary in session storage
    sessionStorage.setItem('generatedItinerary', JSON.stringify(generatedItinerary));

    router.push(`/planner`);
  };

  const handleDestinationChange = useCallback(async (newDestination: string) => {
    setDestination(newDestination);
    const destinationLower = newDestination.toLowerCase();

    // Check if the destination is a country
    const isCountry = Object.keys(topCities).includes(destinationLower);

    if (isCountry) {
      setAvailableCities(topCities[destinationLower as keyof typeof topCities]);
    } else {
      setAvailableCities([]);
    }

    const activities = await getTopActivities(newDestination);
    setAvailableActivities(activities);

    setSpecificLocations([]); // Clear specific locations when destination changes
    setDesiredActivities([]); // Clear specific activities when destination changes
  }, []);

  useEffect(() => {
    if (destination) {
      handleDestinationChange(destination);
    }
  }, [destination, handleDestinationChange]);

  const toggleSpecificLocation = (location: string) => {
    setSpecificLocations(prev => 
      prev.includes(location) 
        ? prev.filter(item => item !== location) 
        : [...prev, location]
    );
  };

  const toggleDesiredActivity = (activity: string) => {
    setDesiredActivities(prev => 
      prev.includes(activity) 
        ? prev.filter(item => item !== activity) 
        : [...prev, activity]
    );
  };

  return (
    <div className="container mx-auto p-4"> {/* Added container div */}
      <Card> {/* Added Card wrapper */}
        <CardHeader> {/* Added CardHeader wrapper */}
          <CardTitle>Travel Preferences</CardTitle>
          <CardDescription>Fill out the form below to generate a personalized itinerary.</CardDescription>
        </CardHeader> {/* Closed CardHeader */}
        <CardContent className="space-y-6"> {/* Added CardContent wrapper with spacing */} 
          
          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Input id="destination" type="text" value={destination} onChange={(e) => handleDestinationChange(e.target.value)} placeholder="e.g., Tokyo, Japan" />
          </div>
          
          {/* Departure Location */}
          <div className="space-y-2">
             <Label htmlFor="departureLocation">Departure Location</Label>
             <Input id="departureLocation" type="text" value={departureLocation} onChange={(e) => setDepartureLocation(e.target.value)} placeholder="e.g., New York, USA" />
          </div>
          
          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Departure Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal", // Changed width to full
                        !departureDate && "text-muted-foreground"
                      )}
                    >
                      {departureDate ? (
                        format(departureDate, "PPP") // Use nicer format
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
                      disabled={returnDate ? { before: new Date(), after: returnDate } : { before: new Date() }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
             </div>
             <div className="space-y-2">
                <Label>Return Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal", // Changed width to full
                        !returnDate && "text-muted-foreground"
                      )}
                    >
                      {returnDate ? (
                        format(returnDate, "PPP") // Use nicer format
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
                      disabled={departureDate ? { before: departureDate } : { before: new Date() }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
             </div>
          </div>

          {/* Specific Locations */}
          {(availableCities.length > 0 || useOtherLocation || !destination) && (
            <div className="space-y-2">
              <Label>Specific Locations (optional)</Label>
              {availableCities.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                  {availableCities.map((city) => (
                    <div key={city} className="flex items-center space-x-2">
                      <Checkbox
                        id={`city-${city}`}
                        checked={specificLocations.includes(city)}
                        onCheckedChange={() => toggleSpecificLocation(city)}
                      />
                      <Label htmlFor={`city-${city}`} className="font-normal">{city}</Label>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center space-x-2 pt-2">
                 <Checkbox
                   id="other-location-toggle"
                   checked={useOtherLocation}
                   onCheckedChange={(checked) => {
                     setUseOtherLocation(Boolean(checked));
                     if (!checked) {
                       setOtherLocation("");
                     }
                   }}
                 />
                 <Label htmlFor="other-location-toggle" className="font-normal">Add another specific location</Label>
              </div>
              {useOtherLocation && (
                <Input
                  type="text"
                  value={otherLocation}
                  onChange={(e) => setOtherLocation(e.target.value)}
                  placeholder="Enter specific location not listed above"
                  className="mt-2"
                />
              )}
            </div>
          )}
          {availableCities.length === 0 && !useOtherLocation && destination && (
            <div className="space-y-2">
                <Label htmlFor="specific-locations-text">Specific Locations (optional, comma-separated)</Label>
                <Input
                    id="specific-locations-text"
                    type="text"
                    value={specificLocations.join(', ')}
                    onChange={(e) => setSpecificLocations(e.target.value.split(',').map(item => item.trim()).filter(Boolean))}
                    placeholder="e.g., Shibuya, Asakusa"
                />
            </div>
          )}

          {/* Desired Activities */}
          <div className="space-y-2">
             <Label>Desired Activities (select all that apply)</Label>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                {predefinedActivities.map((activity) => (
                   <div key={activity} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`activity-${activity}`}
                        checked={desiredActivities.includes(activity)}
                        onCheckedChange={() => toggleDesiredActivity(activity)} 
                      />
                      <Label htmlFor={`activity-${activity}`} className="font-normal">{activity}</Label>
                   </div>
                ))}
             </div>
          </div>
          
          {/* Accommodation Style */}
          <div className="space-y-2">
            <Label htmlFor="accommodationStyle">Style of Accommodation (optional)</Label>
            <Input id="accommodationStyle" type="text" value={accommodationStyle} onChange={(e) => setAccommodationStyle(e.target.value)} placeholder="e.g., Hotel, Hostel, Airbnb" />
          </div>
          
          {/* Nightly Cost Range */}
          <div className="space-y-2">
            <Label htmlFor="nightlyCostRange">Nightly Cost Range (optional)</Label>
            <Input id="nightlyCostRange" type="text" value={nightlyCostRange} onChange={(e) => setNightlyCostRange(e.target.value)} placeholder="e.g., $100-$200" />
          </div>
          
          <Button onClick={handleGenerateItinerary} disabled={!destination || !(departureDate && returnDate)} className="w-full">Generate Itinerary</Button>
        </CardContent> {/* Closed CardContent */}
      </Card> {/* Closed Card */}
    </div> // Closed container div
  );
}
