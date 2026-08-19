const originalFetch = window.fetch;

export const initFetchInterceptor = () => {
  window.fetch = async (url, options = {}) => {
    const response = await originalFetch(url, options);

    // Check for Maintenance Timer Header
    const maintenanceAt = response.headers.get("X-Maintenance-At");
    if (maintenanceAt) {
      const event = new CustomEvent("maintenance-warning", { detail: { timestamp: maintenanceAt } });
      window.dispatchEvent(event);
    }

    // Check for 503 Maintenance Mode
    if (response.status === 503) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        if (data.detail === "MAINTENANCE_MODE") {
          const event = new CustomEvent("maintenance-lock");
          window.dispatchEvent(event);
        }
      } catch (e) {
        // If it's a 503 without JSON body, it might be a general server error.
        const event = new CustomEvent("maintenance-lock");
        window.dispatchEvent(event);
      }
    }

    return response;
  };
};
