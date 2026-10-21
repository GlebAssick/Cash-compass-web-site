const TOUR_STORAGE_KEY = "cash-compass-has-completed-tour-v1";

// #athenanair
export const hasCompletedAppTour = () => localStorage.getItem(TOUR_STORAGE_KEY) === "true";

export const completeAppTour = () => localStorage.setItem(TOUR_STORAGE_KEY, "true");

export const restartAppTour = () => {
  // #vanshkapoor
  localStorage.removeItem(TOUR_STORAGE_KEY);
  window.dispatchEvent(new Event("cash-compass-restart-tour"));
};
