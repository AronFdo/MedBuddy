import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from '../../lib/ProfileContext';

const COLORS = {
  primary: '#307351',
  secondary: '#7BE0AD',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
  warning: '#fbbf24',
  success: '#10B981',
  info: '#3B82F6',
};

// Helper to get greeting
function getGreeting(name: string | null) {
  const hour = new Date().getHours();
  let greeting = 'Hello';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';
  else greeting = 'Good evening';
  return `${greeting}${name ? ', ' + name : ''}!`;
}

// Helper function to get today's date string
function getTodayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

// Helper function to get next reminder time
function getNextReminderTime(reminder_times: string[]) {
  if (!reminder_times || reminder_times.length === 0) return null;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Find the next reminder time
  for (const time of reminder_times) {
    const [h, m] = time.split(':').map(Number);
    const reminderMinutes = h * 60 + m;
    if (reminderMinutes > nowMinutes) {
      return time;
    }
  }
  
  // If no future reminders today, return the first one for tomorrow
  return reminder_times[0];
}

// Helper function to check if medication dose was taken
function isDoseTaken(medication_id: string, doseTime: string, logs: any[]) {
  const todayStr = getTodayDateStr();
  return logs.some(log => 
    log.medication_id === medication_id && 
    log.log_time === doseTime && 
    log.log_date === todayStr && 
    log.status === 'taken'
  );
}

// Helper function to format time
function formatTime(time: string) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

// Helper function to get time until reminder
function getTimeUntil(time: string) {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const reminderTime = new Date();
  reminderTime.setHours(hours, minutes, 0, 0);
  
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }
  
  const diff = reminderTime.getTime() - now.getTime();
  const hoursDiff = Math.floor(diff / (1000 * 60 * 60));
  const minutesDiff = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hoursDiff > 0) {
    return `${hoursDiff}h ${minutesDiff}m`;
  } else {
    return `${minutesDiff}m`;
  }
}

// Helper function to get time since a missed dose
function getTimeSince(time: string) {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const doseTime = new Date();
  doseTime.setHours(hours, minutes, 0, 0);
  
  // If the dose time is in the future today, it means it's for tomorrow
  if (doseTime > now) {
    doseTime.setDate(doseTime.getDate() - 1);
  }
  
  const diff = now.getTime() - doseTime.getTime();
  const hoursDiff = Math.floor(diff / (1000 * 60 * 60));
  const minutesDiff = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hoursDiff > 0) {
    return `${hoursDiff}h ${minutesDiff}m`;
  } else {
    return `${minutesDiff}m`;
  }
}





function NotificationCard({ 
  type, 
  title, 
  subtitle, 
  time, 
  icon, 
  color, 
  onPress 
}: { 
  type: 'medication' | 'appointment' | 'reminder';
  title: string;
  subtitle: string;
  time: string;
  icon: string;
  color: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity 
      style={[styles.notificationCard, { borderLeftColor: color }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.notificationIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{title}</Text>
        <Text style={styles.notificationSubtitle}>{subtitle}</Text>
        <View style={styles.notificationTimeRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.gray} />
          <Text style={styles.notificationTime}>{time}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
    </TouchableOpacity>
  );
}

function QuickStatsCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
  // Create a more sophisticated background color based on the theme
  const getBackgroundColor = (color: string) => {
    if (color === COLORS.primary) return '#E8F5E8'; // Light green background
    if (color === COLORS.secondary) return '#F0FDF4'; // Very light green background
    if (color === COLORS.error) return '#FEF2F2'; // Light red background
    return '#F8FAFC'; // Default light background
  };

  return (
    <View style={[styles.quickStatsCard, { backgroundColor: getBackgroundColor(color) }]}>
      <View style={[styles.quickStatsIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={24} color={COLORS.white} />
      </View>
      <Text style={[styles.quickStatsValue, { color: color }]}>{value}</Text>
      <Text style={styles.quickStatsTitle}>{title}</Text>
    </View>
  );
}

export default function HomeDashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Fetch data when profile changes
  useEffect(() => {
    const fetchData = async () => {
      if (!profile) {
        setMedications([]);
        setAppointments([]);
        setLogs([]);
        setHealthRecords([]);
        setRecentActivity([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch medications for this profile with prescription data
        const { data: meds, error: medsError } = await supabase
          .from('medications')
          .select(`
            *,
            prescriptions:prescription_id (id, doctor_name, issued_date, notes)
          `)
          .eq('profile_id', profile.id);
        if (!medsError && meds) {
          console.log('Fetched medications:', meds);
          console.log('Sample medication fields:', meds[0] ? Object.keys(meds[0]) : 'No medications');
          setMedications(meds);
        } else {
          console.error('Medications fetch error:', medsError);
          setMedications([]);
        }

        // Fetch appointments for this profile
        const { data: appts, error: apptError } = await supabase
          .from('appointments')
          .select('*')
          .eq('profile_id', profile.id);
        if (!apptError && appts) {
          setAppointments(appts);
        } else {
          setAppointments([]);
        }

        // Fetch health records for this profile
        const { data: records, error: recordsError } = await supabase
          .from('health_records')
          .select('*')
          .eq('profile_id', profile.id);
        if (!recordsError && records) {
          setHealthRecords(records);
        } else {
          setHealthRecords([]);
        }

        // Fetch recent medication logs for this profile (last 2 days)
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10);
        const { data: logData, error: logError } = await supabase
          .from('medication_logs')
          .select('*')
          .eq('profile_id', profile.id)
          .gte('log_date', twoDaysAgoStr)
          .order('log_date', { ascending: false });
        if (!logError && logData) {
          setLogs(logData);
        } else {
          setLogs([]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setMedications([]);
        setAppointments([]);
        setLogs([]);
        setHealthRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  // Re-fetch logs when a medication log is updated
  const refreshLogs = async () => {
    if (!profile) return;
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10);
    const { data: logData, error: logError } = await supabase
      .from('medication_logs')
      .select('*')
      .eq('profile_id', profile.id)
      .gte('log_date', twoDaysAgoStr)
      .order('log_date', { ascending: false });
    if (!logError && logData) {
      setLogs(logData);
    } else {
      setLogs([]);
    }
  };

  // Generate recent activity from the last 2 days
  const generateRecentActivity = () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)); // 2 days ago in milliseconds
    
    console.log('Generating recent activity for last 2 days from:', twoDaysAgo.toISOString());
    console.log('Total medications:', medications.length);
    console.log('Total appointments:', appointments.length);
    console.log('Total health records:', healthRecords.length);
    console.log('Total logs:', logs.length);
    
    const activity: any[] = [];

    // Add recent medication logs
    logs.forEach(log => {
      const logDate = new Date(`${log.log_date}T00:00:00`);
      if (logDate >= twoDaysAgo) {
        const medication = medications.find(m => m.medication_id === log.medication_id);
        activity.push({
          id: `log_${log.id}`,
          type: 'medication_log',
          title: `Took ${medication?.name || 'medication'}`,
          subtitle: `Medication dose taken`,
          time: `${formatTime(log.log_time)} • ${log.log_date}`,
          icon: 'checkmark-circle',
          color: COLORS.success,
          timestamp: new Date(`${log.log_date}T${log.log_time}`).getTime(),
          date: log.log_date
        });
      }
    });

    // Add recently added/updated medications
    medications.forEach(med => {
      console.log('Checking medication:', med.name, 'created_at:', med.created_at, 'updated_at:', med.updated_at, 'prescription:', med.prescriptions);
      
      // Use prescription issued_date as primary, fallback to medication created_at
      const prescriptionDate = med.prescriptions?.issued_date ? new Date(med.prescriptions.issued_date) : null;
      const createdDate = med.created_at ? new Date(med.created_at) : new Date();
      const updatedDate = med.updated_at ? new Date(med.updated_at) : createdDate;
      
      // Check if medication was created, updated, or prescription was issued in the last 2 days
      const isRecent = (prescriptionDate && prescriptionDate >= twoDaysAgo) || 
                      createdDate >= twoDaysAgo || 
                      updatedDate >= twoDaysAgo;
      
      console.log('Medication dates - prescription:', prescriptionDate, 'created:', createdDate, 'updated:', updatedDate, 'twoDaysAgo:', twoDaysAgo, 'isRecent:', isRecent);
      
      if (isRecent) {
        console.log('Adding medication to activity:', med.name);
        const displayDate = prescriptionDate || createdDate;
        const displayText = prescriptionDate ? 'Prescribed' : 'Added';
        
        activity.push({
          id: `med_${med.medication_id || med.id}`,
          type: 'medication',
          title: `${displayText} ${med.name}`,
          subtitle: `${med.dosage} • ${med.frequency}x/day${med.prescriptions?.doctor_name ? ` • Dr. ${med.prescriptions.doctor_name}` : ''}`,
          time: displayDate.toLocaleDateString(),
          icon: 'medkit',
          color: COLORS.primary,
          timestamp: displayDate.getTime(),
          date: displayDate.toISOString().slice(0, 10)
        });
      }
    });

    // Add recently added/updated appointments
    appointments.forEach(appt => {
      const createdDate = appt.created_at ? new Date(appt.created_at) : new Date();
      const updatedDate = appt.updated_at ? new Date(appt.updated_at) : createdDate;
      const isRecent = createdDate >= twoDaysAgo || updatedDate >= twoDaysAgo;
      
      if (isRecent) {
        activity.push({
          id: `appt_${appt.appointment_id}`,
          type: 'appointment',
          title: `Appointment with ${appt.doctor_name}`,
          subtitle: appt.visit_reason || 'Medical appointment',
          time: appt.date,
          icon: 'calendar',
          color: COLORS.info,
          timestamp: createdDate.getTime(),
          date: appt.date
        });
      }
    });

    // Add recently added/updated health records
    healthRecords.forEach(record => {
      const createdDate = record.created_at ? new Date(record.created_at) : new Date();
      const updatedDate = record.updated_at ? new Date(record.updated_at) : createdDate;
      const isRecent = createdDate >= twoDaysAgo || updatedDate >= twoDaysAgo;
      
      if (isRecent) {
        activity.push({
          id: `record_${record.id}`,
          type: 'health_record',
          title: `Health record: ${record.title}`,
          subtitle: record.details?.substring(0, 50) + (record.details?.length > 50 ? '...' : ''),
          time: record.event_date,
          icon: 'medical',
          color: COLORS.warning,
          timestamp: createdDate.getTime(),
          date: record.event_date
        });
      }
    });

    // Sort by timestamp (most recent first) and take top 8
    const sortedActivity = activity
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);
    
    console.log('Generated activity items:', sortedActivity.length, 'items:', sortedActivity);
    
    // If no recent activity found, show a message instead of old medications
    if (sortedActivity.length === 0) {
      console.log('No recent activity found in the last 2 days');
      return [];
    }
    
    return sortedActivity;
  };

  // Update recent activity when data changes
  useEffect(() => {
    if (medications.length > 0 || appointments.length > 0 || healthRecords.length > 0 || logs.length > 0) {
      const activity = generateRecentActivity();
      setRecentActivity(activity);
    }
  }, [medications, appointments, healthRecords, logs]);

  // Filter medications for upcoming hour and missed
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = getTodayDateStr();
  const upcoming: any[] = [];
  const missed: any[] = [];
  
  medications.forEach(med => {
    if (Array.isArray(med.reminder_times) && med.reminder_times.length > 0) {
      med.reminder_times.forEach((t: string) => {
        const [h, m] = t.split(':').map(Number);
        const medMinutes = h * 60 + m;
        // Check if this dose has a log for today
        const taken = isDoseTaken(med.medication_id, t, logs);
        
        if (!taken && medMinutes >= nowMinutes && medMinutes < nowMinutes + 60) {
          upcoming.push({ 
            id: med.medication_id + t, 
            name: med.name, 
            time: t,
            medication_id: med.medication_id 
          });
        } else if (!taken && medMinutes < nowMinutes) {
          missed.push({ 
            id: med.medication_id + t, 
            name: med.name, 
            time: t,
            medication_id: med.medication_id 
          });
        }
      });
    }
  });

  // Filter appointments for the coming week
  const today = new Date();
  const weekFromNow = new Date(today);
  weekFromNow.setDate(today.getDate() + 7);
  const upcomingAppointments = appointments.filter(appt => {
    if (!appt.date) return false;
    const apptDate = new Date(appt.date);
    return apptDate >= today && apptDate <= weekFromNow;
  });

  // Calculate quick stats
  const totalMedications = medications.length;
  const activeMedications = medications.filter(m => m.days_remaining === null || m.days_remaining > 0).length;
  const todayTaken = logs.filter(l => l.status === 'taken').length;
  const upcomingApptCount = upcomingAppointments.length;

  // Show loading state
  if (profileLoading || loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Show no profile state
  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Ionicons name="person-circle-outline" size={64} color={COLORS.gray} style={{ marginBottom: 16 }} />
        <Text style={[styles.greeting, { color: COLORS.gray, textAlign: 'center' }]}>No profile selected</Text>
        <Text style={{ color: COLORS.gray, textAlign: 'center', marginTop: 8 }}>
          Please create or select a profile in the Profile tab to view your dashboard.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Profile Picture */}
        <View style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={styles.profileImageContainer}>
              {profile.profile_pic_url ? (
                <Image 
                  source={{ uri: profile.profile_pic_url }} 
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                  <Ionicons name="person" size={40} color={COLORS.primary} />
                </View>
              )}
            </View>
            <Text style={styles.greeting}>{getGreeting(profile?.name || null)}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStatsContainer}>
          <View style={styles.quickStatsRow}>
            <QuickStatsCard 
              title="Active Meds" 
              value={activeMedications.toString()} 
              icon="medkit" 
              color={COLORS.primary} 
            />
            <QuickStatsCard 
              title="Doses Taken" 
              value={todayTaken.toString()} 
              icon="checkmark-circle" 
              color={COLORS.secondary} 
            />
          </View>
          <View style={styles.quickStatsRow}>
            <QuickStatsCard 
              title="Upcoming" 
              value={upcoming.length.toString()} 
              icon="alarm" 
              color={COLORS.primary} 
            />
            <QuickStatsCard 
              title="Doses Missed" 
              value={missed.length.toString()} 
              icon="close-circle" 
              color={COLORS.error} 
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Today's Notifications</Text>
          </View>
          
          {upcoming.length === 0 && missed.length === 0 && upcomingAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle" size={48} color={COLORS.success} />
              <Text style={styles.emptyStateTitle}>All caught up!</Text>
              <Text style={styles.emptyStateSubtitle}>No pending notifications for today.</Text>
            </View>
          ) : (
            <View style={styles.notificationsList}>
              {/* Upcoming Medications */}
              {upcoming.map(item => (
                <NotificationCard
                  key={item.id}
                  type="medication"
                  title={item.name}
                  subtitle="Time to take your medication"
                  time={`${formatTime(item.time)} (in ${getTimeUntil(item.time)})`}
                  icon="alarm"
                  color={COLORS.warning}
                />
              ))}
              
              {/* Missed Medications */}
              {missed.map(item => (
                <NotificationCard
                  key={item.id}
                  type="medication"
                  title={item.name}
                  subtitle="Missed medication dose"
                  time={`${formatTime(item.time)} (${getTimeSince(item.time)} ago)`}
                  icon="close-circle"
                  color={COLORS.error}
                />
              ))}
              
              {/* Upcoming Appointments */}
              {upcomingAppointments.slice(0, 3).map(item => (
                <NotificationCard
                  key={item.appointment_id || item.date}
                  type="appointment"
                  title={item.doctor_name}
                  subtitle={item.visit_reason || 'Appointment'}
                  time={new Date(item.date).toLocaleDateString()}
                  icon="calendar"
                  color={COLORS.info}
                />
              ))}
            </View>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Recent Activity (Last 2 Days)</Text>
          </View>
          
          <View style={styles.activityList}>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
                    <Ionicons name={activity.icon as any} size={16} color={activity.color} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {activity.title}
                    </Text>
                    <Text style={styles.activitySubtitle}>
                      {activity.subtitle}
                    </Text>
                    <Text style={styles.activityTime}>
                      {activity.time}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyActivityText}>No recent activity</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Add bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white, padding: 0 },
  headerGradient: {
    borderRadius: 24,
    marginTop: 64,
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(240, 249, 244, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(48, 115, 81, 0.1)',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  quickStatsContainer: {
    marginHorizontal: 20,
    marginBottom: 28,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  quickStatsCard: {
    flex: 1,
    aspectRatio: 1.2,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(48, 115, 81, 0.1)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  quickStatsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickStatsValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
  },
  quickStatsTitle: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 8,
  },
  notificationsList: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: COLORS.gray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  notificationTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 13,
    color: COLORS.gray,
    marginLeft: 4,
  },
  activityList: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: COLORS.gray,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.gray,
    opacity: 0.8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 10,
  },
  emptyStateSubtitle: {
    fontSize: 15,
    color: COLORS.gray,
    marginTop: 4,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyActivityText: {
    fontSize: 15,
    color: COLORS.gray,
  },
}); 