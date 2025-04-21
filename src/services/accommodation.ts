/**
 * Represents a geographical location with latitude and longitude coordinates.
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

export interface Accommodation {
  name: string;
  location: string;
  price: number;
  rating: number;
  url: string;
  imageUrl: string;
}

/**
 * Asynchronously retrieves accommodation options for a given location.
 *
 * @param location
 * @returns A promise that resolves to a list of Accommodations.
 */
export async function getAccommodations(location: string): Promise<Accommodation[]> {
  // TODO: Implement this by calling an API.
  return [
    {
      name: 'Hilton',
      location: 'New York',
      price: 200,
      rating: 4.5,
      url: 'https://example.com/hilton',
      imageUrl: 'https://example.com/hilton.jpg'
    },
    {
      name: 'Holiday Inn',
      location: 'New York',
      price: 150,
      rating: 4.0,
      url: 'https://example.com/holidayinn',
      imageUrl: 'https://example.com/holidayinn.jpg'
    }
  ];
}
