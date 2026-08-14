const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL;
const API_BASE_URL = `${SITE_URL?.replace(/\/$/, '')}/wp-json/elk/v1`;

export class ApiService {
  static async fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
  }

  /**
   * Fetch data from a specific endpoint with generic type wrapping
   */
  static async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    try {
      const url = new URL(`${API_BASE_URL}/${endpoint}`);
      if (params) {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      }
      console.log(url);
      const response = await this.fetchWithTimeout(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return data as T;
      } catch (parseErr) {
        console.warn('ApiService received non-JSON response. Skipping.', text.slice(0, 200));
        throw new Error('Invalid JSON response from API');
      }
    } catch (error) {
      console.error('ApiService GET error:', error);
      throw error;
    }
  }

  /**
   * Specialized sync fetch
   */
  static async fetchSyncData(isDelta = false, lastSyncTime?: string): Promise<Record<string, unknown>> {
    const params: Record<string, string> = { t: String(Date.now()) };
    if (isDelta && lastSyncTime) {
      params.sync = 'incremental';
      params.last_sync = lastSyncTime;
    } else {
      params.sync = 'full';
    }
    return this.get<Record<string, unknown>>('data', params);
  }
}
