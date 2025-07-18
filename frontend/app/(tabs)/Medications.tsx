import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, Platform, TextInput, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Svg, Circle } from 'react-native-svg';

const COLORS = {
  primary: '#307351',
  secondary: '#7BE0AD',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
};

function CustomHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 32 }} />
    </View>
  );
}

function AddMedicationModalForm({ onSuccess }: { onSuccess: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image picker handler
  const pickImage = async () => {
    setError(null);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  // Upload handler
  const handleSave = async () => {
    if (!image) {
      setError('Please select an image.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      // Get user_id from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated.');
        setUploading(false);
        return;
      }
      // Convert image to data URL if not already
      let imageDataUrl = image;
      if (!image.startsWith('data:')) {
        // Fetch the image and convert to base64
        const response = await fetch(image);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(blob);
        imageDataUrl = await base64Promise;
      }
      // Debug: Log payload
      console.log('Sending to backend:', { image: imageDataUrl.slice(0, 100) + '...', user_id: user.id });
      // Send to backend
      const res = await fetch('http://172.20.10.3:3001/api/ocr/medication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl, user_id: user.id }),
      });
      // Debug: Log response status
      console.log('Backend response status:', res.status);
      const result = await res.json();
      // Debug: Log response body
      console.log('Backend response body:', result);
      if (!res.ok) {
        setError(result.error || 'Failed to process image.');
      } else {
        onSuccess();
      }
    } catch (e) {
      console.log('Upload error:', e);
      setError('Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={modalStyles.container}>
      <Text style={modalStyles.header}>Add Medication</Text>
      <View style={modalStyles.uploadContainer}>
        <TouchableOpacity style={modalStyles.uploadBox} onPress={pickImage}>
          {image ? (
            <>
              <View style={{ width: '100%', height: 100, borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
                <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
              <Text style={modalStyles.uploadText}>Change Image</Text>
            </>
          ) : (
            <>
              <Ionicons name="camera" size={48} color={COLORS.gray} />
              <Text style={modalStyles.uploadText}>Upload Prescription Slip</Text>
            </>
          )}
        </TouchableOpacity>
        {error && <Text style={{ color: COLORS.error, marginTop: 8 }}>{error}</Text>}
      </View>
      <TouchableOpacity style={modalStyles.saveButton} onPress={handleSave} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={modalStyles.saveButtonText}>Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function EditMedicationModalForm({ medication, onSuccess, onCancel }: { medication: any, onSuccess: () => void, onCancel: () => void }) {
  const [name, setName] = useState(medication.name || '');
  const [dosage, setDosage] = useState(medication.dosage || '');
  const [frequency, setFrequency] = useState(medication.frequency || '');
  const [reminderTimes, setReminderTimes] = useState<string[]>(medication.reminder_times || []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Handler for saving edits
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated.');
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('medications').update({
        name,
        dosage,
        frequency,
        reminder_times: reminderTimes,
      }).eq('medication_id', medication.medication_id);
      if (error) {
        setError(error.message);
      } else {
        onSuccess();
      }
    } catch (e: any) {
      setError('Failed to update medication.');
    } finally {
      setSaving(false);
    }
  };

  // Simple UI for editing (expand as needed)
  return (
    <View style={modalStyles.container}>
      <Text style={modalStyles.header}>Edit Medication</Text>
      <TextInput
        style={modalStyles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={modalStyles.input}
        placeholder="Dosage"
        value={dosage}
        onChangeText={setDosage}
      />
      <TextInput
        style={modalStyles.input}
        placeholder="Frequency"
        value={frequency}
        onChangeText={setFrequency}
      />
      {/* Reminder times editing can be improved later */}
      {error && <Text style={{ color: COLORS.error, marginTop: 8 }}>{error}</Text>}
      <TouchableOpacity style={modalStyles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={modalStyles.saveButtonText}>Save</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={[modalStyles.saveButton, { backgroundColor: COLORS.gray, marginTop: 8 }]} onPress={onCancel}>
        <Text style={modalStyles.saveButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 320,
    maxHeight: Platform.OS === 'ios' ? 600 : 540,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 12,
  },
  uploadContainer: {
    alignItems: 'center',
    marginVertical: 18,
  },
  uploadBox: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.lightGray,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadText: {
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: COLORS.lightGray,
  },
});

// Helper to get next scheduled time from reminder_times array
function getNextReminderTime(reminder_times: string[]) {
  if (!reminder_times || !Array.isArray(reminder_times) || reminder_times.length === 0) return 'No reminders';
  const now = new Date();
  const todayTimes = reminder_times
    .map(t => {
      const [h, m, s] = t.split(':');
      const d = new Date();
      d.setHours(Number(h), Number(m), Number(s || 0), 0);
      return d;
    })
    .filter(d => d > now)
    .sort((a, b) => a.getTime() - b.getTime());
  if (todayTimes.length > 0) {
    return todayTimes[0].toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    // Next reminder is tomorrow
    const [h, m, s] = reminder_times[0].split(':');
    const d = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    d.setHours(Number(h), Number(m), Number(s || 0), 0);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

// Helper to get today's untaken scheduled times and progress
function getDoseProgress(reminder_times: string[], logs: any[], medication_id: string) {
  if (!reminder_times || !Array.isArray(reminder_times) || reminder_times.length === 0) return { taken: 0, total: 0, nextDose: null, allTaken: true };
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  // Get logs for this medication and today
  const todayLogs = logs.filter(l => l.medication_id === medication_id && l.log_date === todayStr && l.status === 'taken');
  // Map of taken times
  const takenTimes = new Set(todayLogs.map(l => l.log_time));
  // Find next untaken time
  const now = new Date();
  const untakenTimes = reminder_times.filter(t => !takenTimes.has(t));
  let nextDose = null;
  if (untakenTimes.length > 0) {
    // Find the next untaken time that is still in the future, else the earliest untaken
    const futureUntaken = untakenTimes.filter(t => {
      const [h, m, s] = t.split(':');
      const d = new Date();
      d.setHours(Number(h), Number(m), Number(s || 0), 0);
      return d > now;
    });
    nextDose = (futureUntaken.length > 0 ? futureUntaken[0] : untakenTimes[0]);
  }
  return {
    taken: todayLogs.length,
    total: reminder_times.length,
    nextDose,
    allTaken: todayLogs.length >= reminder_times.length
  };
}

// Add back the ProgressCircle helper
function ProgressCircle({ progress, size = 18, strokeWidth = 3, color = COLORS.primary }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference},${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Helper to get next dose time, now supports next day logic
function getNextDoseTime(reminder_times: string[], logs: any[], medication_id: string, days_remaining: number) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayLogs = logs.filter(l => l.medication_id === medication_id && l.log_date === todayStr && l.status === 'taken');
  const takenTimes = new Set(todayLogs.map(l => l.log_time));
  const now = new Date();
  const untakenTimes = reminder_times.filter(t => !takenTimes.has(t));
  if (untakenTimes.length > 0) {
    // Next untaken time today
    const futureUntaken = untakenTimes.filter(t => {
      const [h, m, s] = t.split(':');
      const d = new Date();
      d.setHours(Number(h), Number(m), Number(s || 0), 0);
      return d > now;
    });
    return futureUntaken.length > 0 ? futureUntaken[0] : untakenTimes[0];
  } else if (days_remaining > 0) {
    // All taken today, show first time for tomorrow
    return `Tomorrow: ${reminder_times[0]}`;
  } else {
    return null;
  }
}

// In Medications component, add a function to decrement days_remaining in the DB
async function decrementDaysRemaining(medication_id: string) {
  // Fetch current value
  const { data, error } = await supabase
    .from('medications')
    .select('days_remaining')
    .eq('medication_id', medication_id)
    .single();
  if (error || !data) return;
  const newDays = Math.max((data.days_remaining ?? 1) - 1, 0);
  await supabase
    .from('medications')
    .update({ days_remaining: newDays })
    .eq('medication_id', medication_id);
}

export default function Medications() {
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]); // Store today's logs

  // Helper to get today's date in YYYY-MM-DD
  function getTodayDateStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  // Fetch medications and today's logs
  useEffect(() => {
    const fetchMedicationsAndLogs = async () => {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      // Fetch medications
      const { data: meds, error: medsError } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user.id);
      if (medsError) {
        setError('Failed to fetch medications');
        setMedications([]);
      } else {
        setMedications(meds || []);
      }
      // Fetch today's logs
      const { data: logData, error: logError } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', getTodayDateStr());
      if (!logError) setLogs(logData || []);
      setLoading(false);
    };
    fetchMedicationsAndLogs();
  }, []);

  // Helper to get today's status for a medication
  function getTodayStatus(medication_id: string) {
    const log = logs.find(l => l.medication_id === medication_id);
    return log && log.status === 'taken' ? 'Taken' : 'Pending';
  }

  // Handler for Mark as Taken
  const handleMarkAsTaken = async (medication: any, doseTime: string | null) => {
    if (!doseTime) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = getTodayDateStr();
    // Prevent duplicate logs for this dose
    if (logs.find(l => l.medication_id === medication.medication_id && l.log_date === today && l.log_time === doseTime)) return;
    const { error } = await supabase.from('medication_logs').insert({
      user_id: user.id,
      medication_id: medication.medication_id,
      log_date: today,
      log_time: doseTime,
      status: 'taken',
    });
    if (!error) {
      const newLogs = [...logs, {
        user_id: user.id,
        medication_id: medication.medication_id,
        log_date: today,
        log_time: doseTime,
        status: 'taken',
      }];
      setLogs(newLogs);
      // If all doses for today are now taken, decrement days_remaining in DB and refresh medications
      const progress = getDoseProgress(medication.reminder_times, newLogs, medication.medication_id);
      if (progress.allTaken && medication.days_remaining > 0) {
        await decrementDaysRemaining(medication.medication_id);
        // Refresh medications list
        const { data: meds, error: medsError } = await supabase
          .from('medications')
          .select('*')
          .eq('user_id', user.id);
        if (!medsError) setMedications(meds || []);
      }
    }
  };

  const handleExplain = (medication: any) => {
    // TODO: Implement explanation logic (e.g., open modal, call bot API)
    alert(`Explain: ${medication.name}`);
  };
  const handleEdit = (medication: any) => {
    setSelectedMedication(medication);
    setShowEditModal(true);
  };
  const handleDelete = (medication: any) => {
    // TODO: Implement delete logic (e.g., confirm and remove from DB)
    alert(`Delete: ${medication.name}`);
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Medications" />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : medications.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.watermarkContainer}>
            <Ionicons name="alert-circle-outline" size={120} color={COLORS.lightGray} style={styles.watermarkIcon} />
            <Text style={styles.emptyText}>No medication. Add medication to view them.</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => item.medication_id?.toString() || Math.random().toString()}
          renderItem={({ item }) => {
            const progress = getDoseProgress(item.reminder_times, logs, item.medication_id);
            return (
              <View style={styles.medicationCard} accessible={true} accessibilityLabel={`Medication card for ${item.name}`}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.medicationName}>{item.name || 'Unnamed Medication'}</Text>
                  <View style={{ width: 120 }}>
                    {progress.taken === 0 ? (
                      <View style={[styles.statusPill, styles.statusPending]}>
                        <Ionicons name="time-outline" size={18} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.statusText}>Pending</Text>
                      </View>
                    ) : progress.allTaken ? (
                      <View style={[styles.statusPill, styles.statusTaken]}>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.statusText}>All taken</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusPill, styles.statusPartial]}>
                        <Ionicons name="ellipse-outline" size={18} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.statusText}>{`${progress.taken}/${progress.total} taken`}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', marginTop: 4, marginBottom: 2 }}>
              {item.dosage && (
                    <Text style={styles.medicationDetail}>Dosage: <Text style={{ fontWeight: 'bold' }}>{item.dosage}</Text></Text>
              )}
              {item.frequency && (
                    <Text style={[styles.medicationDetail, { marginLeft: 16 }]}>Frequency: <Text style={{ fontWeight: 'bold' }}>{item.frequency}</Text></Text>
              )}
            </View>
                <Text style={styles.medicationDetail}>
  {item.days_remaining > 0 || item.days_remaining === null
    ? `${item.days_remaining ?? '?'} day${item.days_remaining === 1 ? '' : 's'} left`
    : 'Course complete'}
</Text>
                <Text style={[styles.medicationDetail, { marginBottom: 4 }]}>Next dose: <Text style={{ fontWeight: 'bold' }}>{getNextDoseTime(item.reminder_times, logs, item.medication_id, item.days_remaining)}</Text></Text>
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    onPress={() => handleMarkAsTaken(item, progress.nextDose)}
                    style={[styles.cardActionBtn, { backgroundColor: COLORS.primary }, progress.allTaken && { backgroundColor: '#b7e4c7' }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${item.name} as taken`}
                    disabled={progress.allTaken || !progress.nextDose || item.days_remaining === 0}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="checkmark-done" size={20} color="#fff" />
                      <Text style={[styles.cardActionText, progress.allTaken && { color: COLORS.white }, { marginLeft: 6 }]}>Taken</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleEdit(item)}
                    style={[styles.cardActionBtn, { backgroundColor: COLORS.primary }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.name}`}
                  >
                    <Ionicons name="create-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    style={[styles.cardActionBtn, { backgroundColor: COLORS.error }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.name}`}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 12 }}
        />
      )}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionButtonVertical} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Add Medication</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AddMedicationModalForm onSuccess={() => {
              setShowAddModal(false);
              // Refresh medications list
              (async () => {
                setLoading(true);
                setError(null);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                  setError('User not authenticated');
                  setLoading(false);
                  return;
                }
                const { data, error } = await supabase
                  .from('medications')
                  .select('*')
                  .eq('user_id', user.id);
                if (error) {
                  setError('Failed to fetch medications');
                  setMedications([]);
                } else {
                  setMedications(data || []);
                }
                setLoading(false);
              })();
            }} />
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMedication && (
              <EditMedicationModalForm
                medication={selectedMedication}
                onSuccess={async () => {
                  setShowEditModal(false);
                  setSelectedMedication(null);
                  // Refresh medications list
                  setLoading(true);
                  setError(null);
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) {
                    setError('User not authenticated');
                    setLoading(false);
                    return;
                  }
                  const { data: meds, error: medsError } = await supabase
                    .from('medications')
                    .select('*')
                    .eq('user_id', user.id);
                  if (medsError) {
                    setError('Failed to fetch medications');
                    setMedications([]);
                  } else {
                    setMedications(meds || []);
                  }
                  setLoading(false);
                }}
                onCancel={() => {
                  setShowEditModal(false);
                  setSelectedMedication(null);
                }}
              />
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white, padding: 0 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    color: COLORS.white,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  medicationCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  medicationName: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  medicationDetail: {
    fontSize: 15,
    color: COLORS.gray,
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
  },
  actionButtonVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginVertical: 6,
    width: 220,
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  watermarkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
    minHeight: 180,
  },
  watermarkIcon: {
    position: 'absolute',
    opacity: 0.18,
    top: 10,
    left: '50%',
    marginLeft: -60,
    zIndex: 0,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 0,
    minHeight: 480,
    maxHeight: Platform.OS === 'ios' ? 600 : 540,
    width: '100%',
    alignSelf: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  actionIconBtn: {
    padding: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    minWidth: 70,
    justifyContent: 'center',
  },
  statusTaken: {
    backgroundColor: '#38b000',
  },
  statusPending: {
    backgroundColor: '#f59e42',
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  cardActionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray,
    borderRadius: 8,
    padding: 10,
    marginRight: 4,
    minWidth: 44,
    minHeight: 44,
    position: 'relative',
    overflow: 'hidden',
  },
  cardActionText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 15,
  },
  statusPartial: {
    backgroundColor: '#fbbf24',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6,
    width: '100%',
    height: 18,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
    zIndex: 0,
  },
  progressBarText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 13,
    zIndex: 1,
  },
}); 