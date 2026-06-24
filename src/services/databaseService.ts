import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  deleteDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ActivityLog, Goal, JournalEntry, Reminder, UserProfile, Category } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'learning', label: 'Learning', color: '#8884d8' },
  { id: 'work', label: 'Work', color: '#82ca9d' },
  { id: 'personal', label: 'Personal', color: '#ffc658' },
  { id: 'health', label: 'Health', color: '#ff8042' },
  { id: 'leisure', label: 'Leisure', color: '#0088fe' },
];

export const databaseService = {
  // User Profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async createUserProfile(userId: string): Promise<void> {
    const path = `users/${userId}`;
    try {
      await setDoc(doc(db, 'users', userId), {
        userId,
        categories: DEFAULT_CATEGORIES,
        onboardingComplete: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Activity Logs
  subscribeToLogs(userId: string, date: string, callback: (logs: ActivityLog[]) => void) {
    const path = 'activityLogs';
    const q = query(
      collection(db, path),
      where('userId', '==', userId),
      where('date', '==', date),
      orderBy('hour', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
      callback(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveLog(log: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<void> {
    const logId = `${log.userId}_${log.date}_${log.hour}`;
    const path = `activityLogs/${logId}`;
    try {
      await setDoc(doc(db, 'activityLogs', logId), {
        ...log,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Goals
  subscribeToGoals(userId: string, callback: (goals: Goal[]) => void) {
    const path = 'goals';
    const q = query(collection(db, path), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const goals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
      callback(goals);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveGoal(goal: Omit<Goal, 'id'>): Promise<void> {
    const goalId = `${goal.userId}_${goal.categoryId}`;
    const path = `goals/${goalId}`;
    try {
      await setDoc(doc(db, 'goals', goalId), goal);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteGoal(goalId: string): Promise<void> {
    const path = `goals/${goalId}`;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'goals', goalId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deleteLog(logId: string): Promise<void> {
    const path = `activityLogs/${logId}`;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'activityLogs', logId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deleteReminder(reminderId: string): Promise<void> {
    const path = `reminders/${reminderId}`;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'reminders', reminderId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Journals
  async getJournalEntry(userId: string, date: string): Promise<JournalEntry | null> {
    const path = 'journals';
    try {
      const q = query(collection(db, path), where('userId', '==', userId), where('date', '==', date));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as JournalEntry;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async saveJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<void> {
    const entryId = `${entry.userId}_${entry.date}`;
    const path = `journals/${entryId}`;
    try {
      await setDoc(doc(db, 'journals', entryId), {
        ...entry,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
