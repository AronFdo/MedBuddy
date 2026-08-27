import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

class NotificationService {
  private expoPushToken: string | null = null;

  async initialize() {
    // Request permissions
    await this.requestPermissions();
    
    // Register for push notifications
    await this.registerForPushNotificationsAsync();
    
    // Set up notification channels for Android
    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();
    }
    
    // Set up notification listeners
    this.setupNotificationListeners();
  }

  private async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }

    return true;
  }

  private async registerForPushNotificationsAsync(profileId?: string) {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '3c472a99-4df0-4d85-acd1-93bdb24b0f30', // EAS project ID
      });
  
      this.expoPushToken = token.data;
      console.log('Expo push token:', this.expoPushToken);
  
      // 🔹 Save token in Supabase
      if (profileId && this.expoPushToken) {
        const { error } = await supabase
          .from("user_push_tokens")
          .upsert({
            profile_id: profileId,
            token: this.expoPushToken,
            updated_at: new Date().toISOString(),
          }, { onConflict: "profile_id" });
  
        if (error) {
          console.error("Error saving push token:", error);
        } else {
          console.log("Push token saved to Supabase");
        }
      }
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  }
  

  private async setupAndroidChannels() {
    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'Medication Reminders',
      description: 'Notifications for medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#307351',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('appointment-reminders', {
      name: 'Appointment Reminders',
      description: 'Notifications for upcoming appointments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#307351',
      sound: 'default',
    });
  }

  private setupNotificationListeners() {
    // Handle notification received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification tap
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
      
      // Handle different notification types
      if (data?.type === 'medication') {
        this.handleMedicationNotificationTap(data);
      } else if (data?.type === 'appointment') {
        this.handleAppointmentNotificationTap(data);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  private handleMedicationNotificationTap(data: any) {
    // Navigate to medications screen and potentially mark as taken
    console.log('Medication notification tapped:', data);
    // This will be handled by the navigation system
  }

  private handleAppointmentNotificationTap(data: any) {
    // Navigate to appointments screen
    console.log('Appointment notification tapped:', data);
    // This will be handled by the navigation system
  }

  // Schedule medication reminder
  async scheduleMedicationReminder(reminder: MedicationReminder): Promise<string> {
    const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
    
    const trigger: Notifications.DailyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Time for Your Medication',
        body: `Take ${reminder.medicationName} (${reminder.dosage})`,
        data: {
          type: 'medication',
          medicationId: reminder.medicationId,
          medicationName: reminder.medicationName,
          dosage: reminder.dosage,
        },
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'medication-reminders' }),
      },
      trigger,
      identifier: `medication-${reminder.medicationId}-${reminder.reminderTime}`,
    });

    console.log('Scheduled medication reminder:', notificationId);
    return notificationId;
  }

  // Schedule appointment reminder
  async scheduleAppointmentReminder(reminder: AppointmentReminder): Promise<string> {
    const appointmentDate = new Date(`${reminder.appointmentDate}T${reminder.appointmentTime}`);
    const reminderTime = new Date(appointmentDate.getTime() - (60 * 60 * 1000)); // 1 hour before

    // Only schedule if reminder time is in the future
    if (reminderTime <= new Date()) {
      console.log('Appointment reminder time is in the past, skipping');
      return '';
    }

    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderTime,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Upcoming Appointment',
        body: `You have an appointment with ${reminder.doctorName} in 1 hour`,
        data: {
          type: 'appointment',
          appointmentId: reminder.appointmentId,
          doctorName: reminder.doctorName,
          appointmentTime: reminder.appointmentTime,
          appointmentDate: reminder.appointmentDate,
        },
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'appointment-reminders' }),
      },
      trigger,
      identifier: `appointment-${reminder.appointmentId}`,
    });

    console.log('Scheduled appointment reminder:', notificationId);
    return notificationId;
  }

  // Cancel medication reminders for a specific medication
  async cancelMedicationReminders(medicationId: string) {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.identifier?.startsWith(`medication-${medicationId}`)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log('Cancelled medication reminder:', notification.identifier);
      }
    }
  }

  // Cancel appointment reminder
  async cancelAppointmentReminder(appointmentId: string) {
    await Notifications.cancelScheduledNotificationAsync(`appointment-${appointmentId}`);
    console.log('Cancelled appointment reminder:', appointmentId);
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all scheduled notifications');
  }

  // Get all scheduled notifications
  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Schedule all medication reminders for a user
  async scheduleAllMedicationReminders(profileId: string) {
    try {
      const { data: medications, error } = await supabase
        .from('medications')
        .select('*')
        .eq('profile_id', profileId)
        .gt('days_remaining', 0);

      if (error) {
        console.error('Error fetching medications:', error);
        return;
      }

      if (!medications) return;

      // Cancel existing medication reminders first
      await this.cancelAllMedicationReminders(profileId);

      // Schedule new reminders
      for (const medication of medications) {
        if (medication.reminder_times && medication.reminder_times.length > 0) {
          for (const reminderTime of medication.reminder_times) {
            const reminder: MedicationReminder = {
              medicationId: medication.medication_id,
              medicationName: medication.name,
              dosage: medication.dosage,
              reminderTime: reminderTime,
              frequency: medication.frequency,
            };

            await this.scheduleMedicationReminder(reminder);
          }
        }
      }

      console.log('Scheduled all medication reminders');
    } catch (error) {
      console.error('Error scheduling medication reminders:', error);
    }
  }

  // Schedule all appointment reminders for a user
  async scheduleAllAppointmentReminders(profileId: string) {
    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('profile_id', profileId)
        .eq('attended', false)
        .gte('date', new Date().toISOString().slice(0, 10));

      if (error) {
        console.error('Error fetching appointments:', error);
        return;
      }

      if (!appointments) return;

      // Cancel existing appointment reminders first
      await this.cancelAllAppointmentReminders(profileId);

      // Schedule new reminders
      for (const appointment of appointments) {
        const reminder: AppointmentReminder = {
          appointmentId: appointment.appointment_id,
          doctorName: appointment.doctor_name,
          appointmentTime: appointment.time,
          appointmentDate: appointment.date,
        };

        await this.scheduleAppointmentReminder(reminder);
      }

      console.log('Scheduled all appointment reminders');
    } catch (error) {
      console.error('Error scheduling appointment reminders:', error);
    }
  }

  // Cancel all medication reminders for a user
  private async cancelAllMedicationReminders(profileId: string) {
    try {
      const { data: medications } = await supabase
        .from('medications')
        .select('medication_id')
        .eq('profile_id', profileId);

      if (medications) {
        for (const medication of medications) {
          await this.cancelMedicationReminders(medication.medication_id);
        }
      }
    } catch (error) {
      console.error('Error cancelling medication reminders:', error);
    }
  }

  // Cancel all appointment reminders for a user
  private async cancelAllAppointmentReminders(profileId: string) {
    try {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_id')
        .eq('profile_id', profileId);

      if (appointments) {
        for (const appointment of appointments) {
          await this.cancelAppointmentReminder(appointment.appointment_id);
        }
      }
    } catch (error) {
      console.error('Error cancelling appointment reminders:', error);
    }
  }

  // Get push token for server-side notifications
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();


