import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#307351',
  secondary: '#7BE0AD',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
  warning: '#fbbf24',
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

// Sample medication data
const sampleMedications = [
  { id: '1', name: 'Aspirin', time: '09:00', status: 'upcoming' },
  { id: '2', name: 'Metformin', time: '09:30', status: 'upcoming' },
  { id: '3', name: 'Lisinopril', time: '08:00', status: 'missed' },
  { id: '4', name: 'Atorvastatin', time: '07:00', status: 'missed' },
];

function FloatingBotButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{
        position: 'absolute',
        bottom: 32,
        right: 24,
        backgroundColor: COLORS.primary,
        borderRadius: 32,
        width: 64,
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 100,
      }}
      onPress={onPress}
      accessibilityLabel="Open AI Chatbot"
    >
      <Ionicons name="chatbubbles-outline" size={32} color={COLORS.white} />
    </TouchableOpacity>
  );
}

function ChatBotModal({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const [messages, setMessages] = useState<any[]>([]); // { sender: 'user'|'bot', message: string }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: 'user', message: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessages(prev => [...prev, { sender: 'bot', message: 'You must be logged in to use the AI assistant.' }]);
        setLoading(false);
        return;
      }
      const res = await fetch('http://172.20.10.3:3001/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, message: userMsg.message }),
      });
      const json = await res.json();
      setMessages(prev => [...prev, { sender: 'bot', message: json.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { sender: 'bot', message: 'Sorry, something went wrong.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: 420, maxHeight: '90%', paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderColor: COLORS.lightGray }}>
              <Ionicons name="chatbubbles-outline" size={26} color={COLORS.primary} style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.primary, flex: 1 }}>MedBuddy AI</Text>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <Ionicons name="close" size={28} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1, paddingHorizontal: 18, marginTop: 8, marginBottom: 8 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                  <View style={{
                    backgroundColor: msg.sender === 'user' ? COLORS.primary : COLORS.lightGray,
                    borderRadius: 16,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    maxWidth: '80%',
                  }}>
                    <Text style={{ color: msg.sender === 'user' ? COLORS.white : COLORS.primary, fontSize: 16 }}>{msg.message}</Text>
                  </View>
                </View>
              ))}
              {loading && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 }}>
                  <View style={{ backgroundColor: COLORS.lightGray, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, maxWidth: '80%' }}>
                    <ActivityIndicator color={COLORS.primary} size="small" />
                  </View>
                </View>
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 2 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: COLORS.lightGray, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, fontSize: 16, marginRight: 8 }}
                placeholder="Ask MedBuddy anything..."
                value={input}
                onChangeText={setInput}
                editable={!loading}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity onPress={sendMessage} disabled={loading || !input.trim()} style={{ opacity: loading || !input.trim() ? 0.5 : 1 }}>
                <Ionicons name="send" size={28} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function HomeDashboard() {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [showBot, setShowBot] = useState(false);

  useEffect(() => {
    const fetchName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', user.id)
          .single();
        if (!error && data && data.name) {
          setName(data.name);
        } else {
          setName(null);
        }
        // Fetch medications for this user
        const { data: meds, error: medsError } = await supabase
          .from('medications')
          .select('*')
          .eq('user_id', user.id);
        if (!medsError && meds) {
          setMedications(meds);
        } else {
          setMedications([]);
        }
        // Fetch appointments for this user
        const { data: appts, error: apptError } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', user.id);
        if (!apptError && appts) {
          setAppointments(appts);
        } else {
          setAppointments([]);
        }
        // Fetch today's medication logs
        const todayStr = new Date().toISOString().slice(0, 10);
        const { data: logData, error: logError } = await supabase
          .from('medication_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', todayStr);
        if (!logError && logData) {
          setLogs(logData);
        } else {
          setLogs([]);
        }
      }
      setLoading(false);
    };
    fetchName();
  }, []);

  // Re-fetch logs when a medication log is updated (polling or subscribe in production)
  // For now, add a function to refresh logs and call it after a log update elsewhere if needed
  const refreshLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: logData, error: logError } = await supabase
      .from('medication_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', todayStr);
    if (!logError && logData) {
      setLogs(logData);
    } else {
      setLogs([]);
    }
  };

  // Filter medications for upcoming hour and missed
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  // Assume each medication has a reminder_times array and logs for today
  const todayStr = now.toISOString().slice(0, 10);
  const upcoming: any[] = [];
  const missed: any[] = [];
  medications.forEach(med => {
    if (Array.isArray(med.reminder_times)) {
      med.reminder_times.forEach((t: string) => {
        const [h, m] = t.split(':').map(Number);
        const medMinutes = h * 60 + m;
        // Check if this dose has a log for today
        const taken = logs.some(l => l.medication_id === med.medication_id && l.log_time === t && l.log_date === todayStr && l.status === 'taken');
        if (!taken && medMinutes >= nowMinutes && medMinutes < nowMinutes + 60) {
          upcoming.push({ id: med.medication_id + t, name: med.name, time: t });
        } else if (!taken && medMinutes < nowMinutes) {
          missed.push({ id: med.medication_id + t, name: med.name, time: t });
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

  return (
    <View style={styles.dashboardBg}>
      {/* Greeting */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.greetingBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.greetingContainer}>
          <Ionicons name="sunny-outline" size={40} color={COLORS.white} style={{ marginRight: 16 }} />
          <Text style={styles.greeting}>{getGreeting(name)}</Text>
        </View>
      </LinearGradient>
      {/* Upcoming Medications */}
      <View style={styles.sectionDivider} />
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="alarm-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
        <Text style={styles.sectionTitle}>Upcoming Medications (Next Hour)</Text>
      </View>
      {upcoming.length === 0 ? (
        <View style={styles.emptyState}><Ionicons name="checkmark-done-outline" size={22} color={COLORS.gray} /><Text style={styles.emptyText}>No medications in the next hour.</Text></View>
      ) : (
        <FlatList
          data={upcoming}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.medCardUpcoming, styles.cardShadow]}>
              <MaterialIcons name="medication" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.medCardText}>{item.name}</Text>
              <View style={styles.pillUpcoming}><Text style={styles.pillText}>{item.time}</Text></View>
            </View>
          )}
        />
      )}
      {/* Missed Medications */}
      <View style={styles.sectionDivider} />
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="close-circle-outline" size={20} color={COLORS.error} style={{ marginRight: 8 }} />
        <Text style={styles.sectionTitle}>Missed Medications</Text>
      </View>
      {missed.length === 0 ? (
        <View style={styles.emptyState}><Ionicons name="checkmark-circle-outline" size={22} color={COLORS.gray} /><Text style={styles.emptyText}>No missed medications.</Text></View>
      ) : (
        <FlatList
          data={missed}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.medCardMissed, styles.cardShadow]}>
              <MaterialIcons name="medication" size={22} color={COLORS.error} style={{ marginRight: 8 }} />
              <Text style={styles.medCardText}>{item.name}</Text>
              <View style={styles.pillMissed}><Text style={styles.pillText}>{item.time}</Text></View>
            </View>
          )}
        />
      )}
      {/* Upcoming Appointments */}
      <View style={styles.sectionDivider} />
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
        <Text style={styles.sectionTitle}>Upcoming Appointments (Next 7 Days)</Text>
      </View>
      {upcomingAppointments.length === 0 ? (
        <View style={styles.emptyState}><Ionicons name="calendar-outline" size={22} color={COLORS.gray} /><Text style={styles.emptyText}>No upcoming appointments.</Text></View>
      ) : (
        <FlatList
          data={upcomingAppointments}
          keyExtractor={item => item.id || item.date}
          renderItem={({ item }) => (
            <View style={[styles.appointmentCard, styles.cardShadow]}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={{ marginRight: 8, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.appointmentDate}>{item.date}</Text>
                <Text style={styles.appointmentDoctor}>{item.doctor_name}</Text>
                {item.visit_reason && <Text style={styles.appointmentReason}>{item.visit_reason}</Text>}
                {item.notes && <Text style={styles.appointmentNotes}>{item.notes}</Text>}
              </View>
              <View style={styles.pillAppointment}><Text style={styles.pillText}>Upcoming</Text></View>
            </View>
          )}
        />
      )}
      <FloatingBotButton onPress={() => setShowBot(true)} />
      <ChatBotModal visible={showBot} onClose={() => setShowBot(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardBg: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: { flex: 1, backgroundColor: COLORS.white, padding: 0 },
  greetingBg: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    marginTop: 64,
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 28, // more padding
    paddingHorizontal: 24,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginLeft: 12,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  medCardUpcoming: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  medCardMissed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffeaea',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  medCardText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
    flex: 1,
  },
  medCardTime: {
    fontSize: 15,
    color: COLORS.gray,
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 4,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  appointmentDate: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  appointmentDoctor: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  appointmentReason: {
    fontSize: 15,
    color: COLORS.gray,
    marginBottom: 2,
  },
  appointmentNotes: {
    fontSize: 14,
    color: COLORS.gray,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 10,
    marginHorizontal: 16,
    borderRadius: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    marginTop: 2,
    paddingHorizontal: 24,
  },
  cardShadow: {
    shadowColor: COLORS.primary,
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 3,
  },
  pillUpcoming: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginLeft: 8,
    alignSelf: 'center',
  },
  pillMissed: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginLeft: 8,
    alignSelf: 'center',
  },
  pillAppointment: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginLeft: 8,
    alignSelf: 'center',
  },
  pillText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    gap: 8,
  },
}); 