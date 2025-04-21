/**
 * Represents a location with latitude and longitude coordinates.
 */
export interface Location {
  /**
   * The latitude of the location.
   */
  lat: number;
  /**
   * The longitude of the location.
   */
  lng: number;
}

export interface TransportationOption {
  type: 'flight' | 'train';
  departureLocation: string;
  arrivalLocation: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  url: string;
}

/**
 * Asynchronously retrieves transportation options for a given location.
 *
 * @param departureLocation
 * @param arrivalLocation
 * @param departureTime
 * @returns A promise that resolves to a list of TransportationOption.
 */
export async function getTransportationOptions(
  departureLocation: string,
  arrivalLocation: string,
  departureTime: string
): Promise<TransportationOption[]> {
  // TODO: Implement this by calling an API.
  return [
    {
      type: 'flight',
      departureLocation: 'JFK',
      arrivalLocation: 'LAX',
      departureTime: '2024-03-15T10:00:00',
      arrivalTime: '2024-03-15T13:00:00',
      price: 300,
      url: 'https://example.com/flight1'
    },
    {
      type: 'train',
      departureLocation: 'New York',
      arrivalLocation: 'Los Angeles',
      departureTime: '2024-03-15T10:00:00',
      arrivalTime: '2024-03-17T13:00:00',
      price: 150,
      url: 'https://example.com/train1'
    }
  ];
}
