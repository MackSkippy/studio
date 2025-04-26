export interface PointOfInterest {
  name: string;
  location: string;
  description: string;
}

export interface Transportation {
  type: string;
  departureLocation: string;
  arrivalLocation: string;
  departureStation?: string;
  arrivalStation?: string;
  departureTime: string;
  arrivalTime: string;
}

export interface ItineraryItem {
  day: string;
  headline: string;
  description: string;
  pointsOfInterest?: PointOfInterest[];
  transportation?: Transportation;
}
