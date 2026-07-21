import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_KEY = '@prism_daily_reminder';
const REMINDER_TIME_KEY = '@prism_daily_reminder_time';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  async registerForPushNotificationsAsync(): Promise<boolean> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return false;
      }
      return true;
    } else {
      console.log('Must use physical device for Push Notifications');
      return false;
    }
  },

  async scheduleDailyReminder(hour: number = 21, minute: number = 0): Promise<void> {
    const hasPermission = await this.registerForPushNotificationsAsync();
    if (!hasPermission) return;

    // Cancel existing ones to avoid duplicates
    await this.cancelAllReminders();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to Reflect 🌙",
        body: "Take a moment to log your day's activities and write a journal entry.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    await AsyncStorage.setItem(REMINDER_KEY, 'true');
    await AsyncStorage.setItem(REMINDER_TIME_KEY, JSON.stringify({ hour, minute }));
  },

  async cancelAllReminders(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.setItem(REMINDER_KEY, 'false');
  },

  async isReminderEnabled(): Promise<boolean> {
    const value = await AsyncStorage.getItem(REMINDER_KEY);
    return value === 'true';
  },
  
  async getReminderTime(): Promise<{hour: number, minute: number}> {
    const value = await AsyncStorage.getItem(REMINDER_TIME_KEY);
    if (value) {
      return JSON.parse(value);
    }
    return { hour: 21, minute: 0 };
  }
};
