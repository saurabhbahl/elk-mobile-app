const API_BASE_URL = 'https://ftfgifts.com/elk/wp-json/elk/v1';

export class ApiService {
  /**
   * Fetch data from a specific endpoint with generic type wrapping
   */
  static async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    try {
      const url = new URL(`${API_BASE_URL}/${endpoint}`);
      if (params) {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      }
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('ApiService GET error:', error);
      throw error;
    }
  }

  /**
   * Specialized sync fetch
   */
  static async fetchSyncData(): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>('data', { sync: 'full' });
  }
}
