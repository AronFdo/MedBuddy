import * as SecureStore from 'expo-secure-store';

const NOTIFICATIONS_ENABLED_KEY = 'medbuddy_notifications_enabled';

export interface MedicationReminder {
  medicationId: string;
  medicationName: string;
  dosage: string;
  reminderTime: string;
  frequency: number;
}

export interface AppointmentReminder {
  appointmentId: string;
  doctorName: string;
  appointmentTime: string;
  appointmentDate: string;
}

/**
 * In-app notification preferences only.
 * OS / Expo push & local notifications have been removed.
 */
class NotificationService {
  async isEnabled(): Promise<boolean> {
    const value = await SecureStore.getItemAsync(NOTIFICATIONS_ENABLED_KEY);
    // Default on until the user turns them off in Settings
    return value !== 'false';
  }

  async setEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(
      NOTIFICATIONS_ENABLED_KEY,
      enabled ? 'true' : 'false'
    );
  }

  async scheduleMedicationReminder(_reminder: MedicationReminder): Promise<string> {
    return '';
  }

  async scheduleAppointmentReminder(_reminder: AppointmentReminder): Promise<string> {
    return '';
  }

  async cancelMedicationReminders(_medicationId: string): Promise<void> {}

  async cancelAppointmentReminder(_appointmentId: string): Promise<void> {}

  async cancelAllNotifications(): Promise<void> {}

  async getScheduledNotifications(): Promise<[]> {
    return [];
  }

  async scheduleAllMedicationReminders(_profileId: string): Promise<void> {}

  async scheduleAllAppointmentReminders(_profileId: string): Promise<void> {}
}

export const notificationService = new NotificationService();
