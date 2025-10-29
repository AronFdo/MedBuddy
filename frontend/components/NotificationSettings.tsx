import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../lib/notificationService';

const COLORS = {
  primary: '#307351',
  secondary: '#7BE0AD',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
};

interface NotificationSettingsProps {
  profileId?: string;
}

export default function NotificationSettings({ profileId }: NotificationSettingsProps) {
  const [medicationReminders, setMedicationReminders] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    checkNotificationPermissions();
  }, []);

  const checkNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionGranted(status === 'granted');
  };

  const requestNotificationPermissions = async () => {
    setLoading(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive medication and appointment reminders.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      Alert.alert('Error', 'Failed to request notification permissions.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMedicationReminders = async (enabled: boolean) => {
    if (!profileId) {
      Alert.alert('Error', 'Profile not found. Please select a profile first.');
      return;
    }

    setLoading(true);
    try {
      if (enabled) {
        await notificationService.scheduleAllMedicationReminders(profileId);
      } else {
        // Cancel all medication reminders
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of scheduledNotifications) {
          if (notification.identifier?.startsWith('medication-')) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          }
        }
      }
      setMedicationReminders(enabled);
    } catch (error) {
      console.error('Error toggling medication reminders:', error);
      Alert.alert('Error', 'Failed to update medication reminders.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAppointmentReminders = async (enabled: boolean) => {
    if (!profileId) {
      Alert.alert('Error', 'Profile not found. Please select a profile first.');
      return;
    }

    setLoading(true);
    try {
      if (enabled) {
        await notificationService.scheduleAllAppointmentReminders(profileId);
      } else {
        // Cancel all appointment reminders
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of scheduledNotifications) {
          if (notification.identifier?.startsWith('appointment-')) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          }
        }
      }
      setAppointmentReminders(enabled);
    } catch (error) {
      console.error('Error toggling appointment reminders:', error);
      Alert.alert('Error', 'Failed to update appointment reminders.');
    } finally {
      setLoading(false);
    }
  };

  const viewScheduledNotifications = async () => {
    try {
      const scheduled = await notificationService.getScheduledNotifications();
      const medicationCount = scheduled.filter(n => n.identifier?.startsWith('medication-')).length;
      const appointmentCount = scheduled.filter(n => n.identifier?.startsWith('appointment-')).length;
      
      Alert.alert(
        'Scheduled Notifications',
        `Medication reminders: ${medicationCount}\nAppointment reminders: ${appointmentCount}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error fetching scheduled notifications:', error);
      Alert.alert('Error', 'Failed to fetch scheduled notifications.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Updating settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="notifications" size={24} color={COLORS.primary} />
        <Text style={styles.title}>Notification Settings</Text>
      </View>

      {!permissionGranted && (
        <View style={styles.permissionWarning}>
          <Ionicons name="warning" size={20} color={COLORS.error} />
          <Text style={styles.warningText}>
            Notifications are not enabled. Please grant permission to receive reminders.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestNotificationPermissions}>
            <Text style={styles.permissionButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
        </View>
      )}

      {permissionGranted && (
        <>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="medical" size={20} color={COLORS.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Medication Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get notified when it's time to take your medications
                </Text>
              </View>
            </View>
            <Switch
              value={medicationReminders}
              onValueChange={toggleMedicationReminders}
              trackColor={{ false: COLORS.lightGray, true: COLORS.secondary }}
              thumbColor={medicationReminders ? COLORS.primary : COLORS.gray}
              disabled={!permissionGranted}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="calendar" size={20} color={COLORS.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Appointment Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get notified 1 hour before your appointments
                </Text>
              </View>
            </View>
            <Switch
              value={appointmentReminders}
              onValueChange={toggleAppointmentReminders}
              trackColor={{ false: COLORS.lightGray, true: COLORS.secondary }}
              thumbColor={appointmentReminders ? COLORS.primary : COLORS.gray}
              disabled={!permissionGranted}
            />
          </View>

          <TouchableOpacity style={styles.infoButton} onPress={viewScheduledNotifications}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoButtonText}>View Scheduled Notifications</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
          </TouchableOpacity>
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: Notifications help you stay on track with your health routine
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 8,
  },
  permissionWarning: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 14,
    marginLeft: 8,
    marginRight: 8,
  },
  permissionButton: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 18,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    marginTop: 16,
  },
  infoButtonText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 8,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: COLORS.gray,
    fontSize: 14,
  },
});
