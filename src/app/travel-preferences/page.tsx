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

    router.push(`/planner?itinerary=${encodeURIComponent(JSON.stringify(generatedItinerary))}`);
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
    if (specificLocations.includes(location)) {
      setSpecificLocations(specificLocations.filter(item => item !== location));
    } else {
      setSpecificLocations([...specificLocations, location]);
    }
  };

  const toggleDesiredActivity = (activity: string) => {
    if (desiredActivities.includes(activity)) {
      setDesiredActivities(desiredActivities.filter(item => item !== activity));
    } else {
      setDesiredActivities([...desiredActivities, activity]);
    }
  };

  return (
    
      
        
          
            <CardTitle>Travel Preferences</CardTitle>
          
          
            <CardDescription>Fill out the form below to generate a personalized itinerary.</CardDescription>
          
        
        
          
            
              Destination
            
            <Input type="text" value={destination} onChange={(e) => handleDestinationChange(e.target.value)} placeholder="e.g., Tokyo, Japan" />
          
          
            
              Departure Location
            
            <Input type="text" value={departureLocation} onChange={(e) => setDepartureLocation(e.target.value)} placeholder="e.g., New York, USA" />
          
          
            
              
                
                  Departure Date
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !departureDate && "text-muted-foreground"
                      )}
                    >
                      {departureDate ? (
                        format(departureDate, "yyyy-MM-dd")
                      ) : (
                        "Pick a date"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={departureDate}
                      onSelect={setDepartureDate}
                      disabled={returnDate ? { before: returnDate } : undefined}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {/* Place "Pick a date" label below the popover */}
              
              
                
                  Return Date
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !returnDate && "text-muted-foreground"
                      )}
                    >
                      {returnDate ? (
                        format(returnDate, "yyyy-MM-dd")
                      ) : (
                        "Pick a date"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={returnDate}
                      onSelect={setReturnDate}
                      disabled={departureDate ? { before: departureDate } : undefined}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {/* Place "Pick a date" label below the popover */}
              
            
          
          
            
              Specific Locations
            
            {availableCities.length > 0 ? (
              
                
                  {availableCities.map((city) => (
                    
                      <Checkbox
                        id={city}
                        checked={specificLocations.includes(city)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            toggleSpecificLocation(city);
                          } else {
                            toggleSpecificLocation(city);
                          }
                        }}
                      />
                      
                        {city}
                      
                    
                  ))}
                  
                    <Checkbox
                      id="other"
                      checked={useOtherLocation}
                      onCheckedChange={(checked) => {
                        setUseOtherLocation(checked);
                        if (!checked) {
                          setOtherLocation("");
                        }
                      }}
                    />
                    
                      Other:
                    
                    <Input
                      type="text"
                      value={otherLocation}
                      onChange={(e) => setOtherLocation(e.target.value)}
                      placeholder="Enter specific location"
                      disabled={!useOtherLocation}
                    />
                  
                
              
            ) : (
              <Input
                type="text"
                value={specificLocations.join(', ')}
                onChange={(e) => setSpecificLocations(e.target.value.split(',').map(item => item.trim()))}
                placeholder="e.g., Shibuya, Asakusa"
              />
            )}
          
          

            
              Desired Activities
            
            
              {predefinedActivities.map((activity) => (
                
                  <Checkbox
                    id={activity}
                    checked={desiredActivities.includes(activity)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        toggleDesiredActivity(activity);
                      } else {
                        toggleDesiredActivity(activity);
                      }
                    }}
                  />
                  
                    {activity}
                  
                
              ))}
            
          
          
            
              Style of Accommodation
            
            <Input type="text" value={accommodationStyle} onChange={(e) => setAccommodationStyle(e.target.value)} placeholder="e.g., Hotel, Hostel, Airbnb" />
          
          
            
              Nightly Cost Range
            
            <Input type="text" value={nightlyCostRange} onChange={(e) => setNightlyCostRange(e.target.value)} placeholder="e.g., $100-$200" />
          
          <Button onClick={handleGenerateItinerary} disabled={!destination}>Generate Itinerary</Button>
        
      
    
  );
}


