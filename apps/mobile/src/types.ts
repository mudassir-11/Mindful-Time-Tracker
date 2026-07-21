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
  date: string;
  hour: number;
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
  isCompleted: boolean;
  category?: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', label: 'Work', color: '#2d6a4f' },
  { id: 'project', label: 'Project', color: '#8a124e' },
  { id: 'learning', label: 'Learning', color: '#4c1d95' },
  { id: 'personal', label: 'Personal', color: '#b45309' },
  { id: 'health', label: 'Health', color: '#9a3412' },
  { id: 'leisure', label: 'Leisure', color: '#1e3a8a' },
];
