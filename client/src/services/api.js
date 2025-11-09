/**
 * API service for communicating with the backend
 */
export class APIService {
  constructor(baseURL = 'http://localhost:8787') {
    this.baseURL = baseURL;
  }

  /**
   * Generic API request method
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async checkHealth() {
    return this.request('/health');
  }

  /**
   * Upload and ingest user stories
   */
  async ingestUserStories(file, clearExisting = false) {
    const formData = new FormData();
    formData.append('file', file);
    if (clearExisting) {
      formData.append('clearExisting', 'true');
    }

    const response = await fetch(`${this.baseURL}/ingest/user-stories`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Retrieve user stories
   */
  async retrieveUserStories(data) {
    return this.request('/retrieve/user-stories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// Default API service instance
export const apiService = new APIService();
