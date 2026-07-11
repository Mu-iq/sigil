export interface ActivityPoint {
  date: string;
  count: number;
}

export interface ActivityFetchResult {
  login: string;
  points: ActivityPoint[];
}

/** Display model for the activity graph. */
export interface ActivityModel {
  points: ActivityPoint[];
  total: number;
  max: number;
  /** Average per day over the window, rounded to one decimal. */
  average: number;
  startDate: string | null;
  endDate: string | null;
}
