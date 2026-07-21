export interface Category {
  id: string;
  label: string;
  color: string;
}

export interface UserProfile {
  userId: string;
  categories: Category[];
  onboardingComplete?: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  activity: string;
  categoryId: string;
  durationMinutes: number;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  categoryId: string;
  targetHoursPerDay: number;
  specificObjectives: string;
  isActive: boolean;
}

export interface JournalEntry {
  id: string;
  userId: string;
  date: string;
  content: string;
  mood?: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  time: string;
  category?: string;
  isCompleted: boolean;
}
