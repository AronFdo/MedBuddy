import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, Alert, Dimensions, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useProfile } from '../../lib/ProfileContext';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import DownloadedReports from '../../components/DownloadedReports';



const COLORS = {
  primary: '#307351',
  secondary: '#7BE0AD',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
  success: '#10B981',
};

function CustomHeader({ title, onDownloadedReportsPress }: { title: string; onDownloadedReportsPress?: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {onDownloadedReportsPress && (
        <TouchableOpacity style={styles.headerButton} onPress={onDownloadedReportsPress}>
          <Ionicons name="folder-open" size={24} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const TABS = ['Appointments', 'Health Records'];

function AddAppointmentModalForm({ onSuccess, onCancel, profileId }: { onSuccess: () => void, onCancel: () => void, profileId: string | null }) {
  const [doctorName, setDoctorName] = useState('');
  const [visitReason, setVisitReason] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!profileId) {
        setError('No profile selected. Please create or select a profile in the Profile tab.');
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('appointments').insert({
        profile_id: profileId,
        doctor_name: doctorName,
        visit_reason: visitReason,
        date: date ? date.toISOString().slice(0, 10) : null,
        notes,
      });
      if (error) {
        setError(error.message);
      } else {
        onSuccess();
      }
    } catch (e: any) {
      setError('Failed to add appointment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={modalStyles.container}>
      <Text style={modalStyles.header}>Add Appointment</Text>
      <TextInput
        style={modalStyles.input}
        placeholder="Doctor's Name"
        value={doctorName}
        onChangeText={setDoctorName}
        placeholderTextColor={COLORS.gray}
      />
      <TextInput
        style={modalStyles.input}
        placeholder="Reason for Visit"
        value={visitReason}
        onChangeText={setVisitReason}
      />
      <TouchableOpacity style={modalStyles.input} onPress={() => setShowDatePicker(true)}>
        <Text style={{ color: date ? COLORS.primary : COLORS.gray }}>
          {date ? date.toDateString() : 'Select Date'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}
      <TextInput
        style={[modalStyles.input, { height: 60 }]}
        placeholder="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholderTextColor={COLORS.gray}
      />
      {error && <Text style={{ color: COLORS.error, marginTop: 8 }}>{error}</Text>}
      <TouchableOpacity style={modalStyles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={modalStyles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[modalStyles.saveButton, { backgroundColor: COLORS.gray, marginTop: 8 }]} onPress={onCancel}>
        <Text style={modalStyles.saveButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

function EditAppointmentModalForm({ appointment, onSuccess, onCancel }: { appointment: any, onSuccess: () => void, onCancel: () => void }) {
  const [doctorName, setDoctorName] = useState(appointment.doctor_name || '');
  const [visitReason, setVisitReason] = useState(appointment.visit_reason || '');
  const [date, setDate] = useState<Date | null>(appointment.date ? new Date(appointment.date) : new Date());
  const [notes, setNotes] = useState(appointment.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('appointments').update({
        doctor_name: doctorName,
        visit_reason: visitReason,
        date: date ? date.toISOString().slice(0, 10) : null,
        notes,
      }).eq('appointment_id', appointment.appointment_id);
      if (error) {
        setError(error.message);
      } else {
        onSuccess();
      }
    } catch (e: any) {
      setError('Failed to update appointment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={modalStyles.container}>
      <Text style={modalStyles.header}>Edit Appointment</Text>
      <TextInput
        style={modalStyles.input}
        placeholder="Doctor's Name"
        value={doctorName}
        onChangeText={setDoctorName}
        placeholderTextColor={COLORS.gray}
      />
      <TextInput
        style={modalStyles.input}
        placeholder="Reason for Visit"
        value={visitReason}
        onChangeText={setVisitReason}
      />
      <TouchableOpacity style={modalStyles.input} onPress={() => setShowDatePicker(true)}>
        <Text style={{ color: date ? COLORS.primary : COLORS.gray }}>
          {date ? date.toDateString() : 'Select Date'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}
      <TextInput
        style={[modalStyles.input, { height: 60 }]}
        placeholder="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholderTextColor={COLORS.gray}
      />
      {error && <Text style={{ color: COLORS.error, marginTop: 8 }}>{error}</Text>}
      <TouchableOpacity style={modalStyles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={modalStyles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[modalStyles.saveButton, { backgroundColor: COLORS.gray, marginTop: 8 }]} onPress={onCancel}>
        <Text style={modalStyles.saveButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}



function AttendedModal({ appointment, onClose, onSave }: { appointment: any, onClose: () => void, onSave: (notes: string) => void }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Mark appointment as attended
      await supabase
        .from('appointments')
        .update({ attended: true, attended_date: new Date().toISOString() })
        .eq('appointment_id', appointment.appointment_id);

      // Create health record from appointment notes
      if (notes.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('health_records').insert({
            profile_id: appointment.profile_id,
            title: `Appointment with ${appointment.doctor_name}`,
            details: notes,
            record_type: 'Appointment Follow-up',
            event_date: appointment.date || new Date().toISOString().slice(0, 10),
          });
        }
      }

      onSave(notes);
    } catch (error) {
      console.error('Error marking appointment as attended:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={true} animationType="fade" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={modalStyles.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[modalStyles.container, { maxHeight: '85%', maxWidth: '90%' }]}>
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <Text style={modalStyles.header}>Mark as Attended</Text>
                  <View style={{ marginVertical: 16 }}>
                    <Text style={{ fontSize: 16, color: COLORS.gray, marginBottom: 8 }}>
                      Appointment: {appointment.doctor_name}
                    </Text>
                    <Text style={{ fontSize: 14, color: COLORS.gray, marginBottom: 16 }}>
                      Date: {appointment.date}
                    </Text>
                  </View>
                  
                  <Text style={{ fontSize: 16, color: COLORS.primary, fontWeight: 'bold', marginBottom: 8 }}>
                    Appointment Notes (optional)
                  </Text>
                  <Text style={{ fontSize: 14, color: COLORS.gray, marginBottom: 12 }}>
                    Add notes about what happened during the appointment. These will be saved as a health record.
                  </Text>
                  
                  <TextInput
                    style={[modalStyles.input, { height: 120, textAlignVertical: 'top' }]}
                    placeholder="Enter appointment notes..."
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={5}
                    blurOnSubmit={false}
                  />
                </ScrollView>
                
                {/* Fixed buttons at bottom */}
                <View style={{ marginTop: 16 }}>
                  <TouchableOpacity 
                    style={[modalStyles.saveButton, { backgroundColor: COLORS.success }]} 
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={modalStyles.saveButtonText}>Mark as Attended</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[modalStyles.saveButton, { backgroundColor: COLORS.gray, marginTop: 8 }]} 
                    onPress={onClose}
                  >
                    <Text style={modalStyles.saveButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Health Records Form Component
function HealthRecordForm({
  onSuccess,
  onCancel,
  record,
  profile,
}: {
  onSuccess: (newRecord: any) => void;
  onCancel: () => void;
  record: any | null;
  profile: any;
}) {
  const [title, setTitle] = useState('');
  const [recordType, setRecordType] = useState('General Check-up');
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordTypes = ['General Check-up', 'Lab Result', 'Vaccination', 'Symptom Log', 'Procedure', 'Allergy', 'Medication Change'];

  useEffect(() => {
    if (record) {
      setTitle(record.title || '');
      setRecordType(record.record_type || 'General Check-up');
      setEventDate(record.event_date ? new Date(record.event_date) : new Date());
    } else {
      // Reset form for new record
      setTitle('');
      setRecordType('General Check-up');
      setEventDate(new Date());
    }
  }, [record]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setError('User not authenticated');
        setSaving(false);
        return;
      }

      if (!profile?.id) {
        setError('No profile selected. Please create or select a profile in the Profile tab.');
      setSaving(false);
      return;
    }

    const recordData = {
        profile_id: profile.id,
      title,
      record_type: recordType,
      event_date: eventDate.toISOString().slice(0, 10), // YYYY-MM-DD format
        details: null, // We removed this from UI but database still expects it
        doctor_name: null, // Optional field
        attachment_url: null, // Optional field
    };

      onSuccess({ ...recordData, id: record?.id });
    } catch (e: any) {
      setError('Failed to save health record.');
    } finally {
    setSaving(false);
    }
  };

  return (
    <View style={modalStyles.container}>
          <Text style={modalStyles.header}>{record ? 'Edit Health Record' : 'Add Health Record'}</Text>

      {/* Title Field */}
      <Text style={modalStyles.label}>Title *</Text>
          <TextInput
            style={modalStyles.input}
        placeholder="e.g., Annual Check-up, Blood Test Results"
            value={title}
            onChangeText={setTitle}
        placeholderTextColor={COLORS.gray}
      />
      
      {/* Record Type Field */}
      <Text style={modalStyles.label}>Record Type *</Text>
      <TouchableOpacity 
        style={[modalStyles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
        onPress={() => setShowTypePicker(true)}
      >
        <Text style={{ color: recordType ? COLORS.primary : COLORS.gray, flex: 1 }}>
          {recordType || 'Select Record Type'}
            </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
          </TouchableOpacity>

      {showTypePicker && (
        <Modal visible={showTypePicker} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: 320, padding: 20 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={modalStyles.header}>Select Record Type</Text>
                <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                  <Ionicons name="close" size={24} color={COLORS.gray} />
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={{ flex: 1 }} 
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {recordTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      modalStyles.input,
                      { 
                        backgroundColor: recordType === type ? COLORS.primary : COLORS.white,
                        borderColor: recordType === type ? COLORS.primary : COLORS.lightGray,
                        borderWidth: 1,
                        marginBottom: 12,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }
                    ]}
                    onPress={() => {
                      setRecordType(type);
                      setShowTypePicker(false);
                    }}
                  >
                    <Text style={{ 
                      color: recordType === type ? COLORS.white : COLORS.primary,
                      fontWeight: recordType === type ? 'bold' : 'normal',
                      fontSize: 16
                    }}>
                      {type}
                    </Text>
                    {recordType === type && (
                      <Ionicons name="checkmark" size={20} color={COLORS.white} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Event Date Field */}
      <Text style={modalStyles.label}>Event Date *</Text>
      <TouchableOpacity 
        style={[modalStyles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
        onPress={() => setShowDatePicker(true)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={{ color: eventDate ? COLORS.primary : COLORS.gray, fontSize: 16 }}>
            {eventDate ? eventDate.toDateString() : 'Select Event Date'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
      </TouchableOpacity>
      


          {showDatePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setEventDate(selectedDate);
                }
              }}
            />
          )}

      {error && <Text style={modalStyles.errorText}>{error}</Text>}
      
      <TouchableOpacity 
        style={modalStyles.saveButton} 
        onPress={handleSave} 
        disabled={saving}
      >
        {saving ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={COLORS.white} size="small" style={{ marginRight: 8 }} />
            <Text style={modalStyles.saveButtonText}>Saving...</Text>
          </View>
        ) : (
          <Text style={modalStyles.saveButtonText}>Save Record</Text>
        )}
          </TouchableOpacity>
    </View>
  );
}

// Report Upload Modal Component
function ReportUploadModal({
  visible,
  onClose,
  onSave,
  record,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (record: any, fileUrl: string) => void;
  record: any | null;
}) {
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; uri: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSelectedFile(null);
    }
  }, [visible]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile({
          name: file.name || 'document.pdf',
          size: file.size || 0,
          uri: file.uri
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!record || !selectedFile) {
      Alert.alert('Error', 'Please select a PDF file first');
      return;
    }

    setUploading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Read the file data from the URI
      console.log('Reading file from URI:', selectedFile.uri);
      const response = await fetch(selectedFile.uri);
      const blob = await response.blob();
      console.log('File blob created, size:', blob.size);
      
      // Upload to Supabase Storage - using 'reports' bucket
      // File path structure: profiles/{profile_id}/health-reports/{record_id}/{filename}
      const filePath = `profiles/${record.profile_id}/health-reports/${record.id}/${selectedFile.name}`;
      console.log('Uploading to path:', filePath);
      const { data, error } = await supabase.storage
        .from('reports')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
        });

      if (error) {
        throw error;
      }

      // Store the file path instead of public URL for signed URL generation
      await onSave(record, filePath);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '85%', padding: 24 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={modalStyles.header}>Upload Medical Report</Text>
            <TouchableOpacity 
              style={modalStyles.closeButton} 
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          
          <Text style={modalStyles.label}>Select PDF Report from Device</Text>
          
          {!selectedFile ? (
            <TouchableOpacity 
              style={modalStyles.uploadArea} 
              onPress={pickDocument}
              activeOpacity={0.7}
            >
              <View style={modalStyles.uploadIconContainer}>
                <Ionicons name="cloud-upload-outline" size={56} color={COLORS.primary} />
              </View>
              <Text style={modalStyles.uploadTitle}>Choose PDF File</Text>
              <Text style={modalStyles.uploadSubtitle}>
                Tap to browse your device for PDF reports
              </Text>
              <View style={modalStyles.uploadInfo}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.gray} />
                <Text style={modalStyles.uploadInfoText}>Only PDF files are supported</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={modalStyles.selectedFileContainer}>
              <View style={modalStyles.fileIconContainer}>
                <Ionicons name="document-text" size={48} color={COLORS.success} />
              </View>
              <View style={modalStyles.fileInfo}>
                <Text style={modalStyles.fileName}>{selectedFile.name}</Text>
                <Text style={modalStyles.fileSize}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              </View>
              <TouchableOpacity 
                style={modalStyles.removeButton}
                onPress={removeFile}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={modalStyles.uploadActions}>
            <TouchableOpacity 
              style={[modalStyles.actionButton, modalStyles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={modalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                modalStyles.actionButton, 
                modalStyles.uploadButton,
                (!selectedFile || uploading) && modalStyles.disabledButton
              ]} 
              onPress={handleUpload}
              disabled={uploading || !selectedFile}
            >
              {uploading ? (
                <View style={modalStyles.loadingContainer}>
                  <ActivityIndicator color={COLORS.white} size="small" />
                  <Text style={modalStyles.uploadButtonText}>Uploading...</Text>
                </View>
              ) : (
                <Text style={modalStyles.uploadButtonText}>Upload Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}



const modalStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    minHeight: 500,
    maxHeight: '80%',
    width: '100%',
    alignSelf: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
    marginTop: 4,
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
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 18,
  },
  reportText: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.primary,
    textAlign: 'left',
  },
  // Upload Modal Styles
  uploadArea: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    marginBottom: 20,
  },
  uploadIconContainer: {
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 12,
  },
  uploadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadInfoText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 4,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  fileIconContainer: {
    marginRight: 16,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: COLORS.gray,
  },
  removeButton: {
    padding: 4,
  },
  uploadActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },

});

export default function Appointments() {
  const { profile, loading: profileLoading } = useProfile();
  const [activeTab, setActiveTab] = useState('Appointments');
  const [showAddModal, setShowAddModal] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [editModal, setEditModal] = useState<{ open: boolean, appointment: any | null }>({ open: false, appointment: null });
  const [attendedModal, setAttendedModal] = useState<{ open: boolean, appointment: any | null }>({ open: false, appointment: null });
  
  // Health Records state
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [healthRecordModal, setHealthRecordModal] = useState<{ visible: boolean, record: any | null }>({ visible: false, record: null });
  const [reportModal, setReportModal] = useState<{ visible: boolean, record: any | null }>({ visible: false, record: null });
  const [downloadedReportsModal, setDownloadedReportsModal] = useState(false);

  // Fetch appointments from DB
  const fetchAppointments = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('profile_id', profile.id);
    if (!error && data) {
      setAppointments(data);
    } else {
      setAppointments([]);
    }
  };

  // Fetch health records from DB
  const fetchHealthRecords = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('profile_id', profile.id)
      .order('event_date', { ascending: false });
    if (!error && data) {
      setHealthRecords(data);
    } else {
      setHealthRecords([]);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchAppointments();
      fetchHealthRecords();
    }
  }, [profile]);

  const handleAddSuccess = () => {
    setShowAddModal(false);
    fetchAppointments();
  };
  const handleEditSuccess = () => {
    setEditModal({ open: false, appointment: null });
    fetchAppointments();
  };

  // Health Records handlers
  const handleHealthRecordSave = async (newRecord: any) => {
    let error;
    if (newRecord.id) {
      // Update existing record
      ({ error } = await supabase.from('health_records').update(newRecord).eq('id', newRecord.id));
    } else {
      // Create new record
      ({ error } = await supabase.from('health_records').insert(newRecord));
    }

    if (error) {
      console.error('Error saving health record:', error.message);
    } else {
      setHealthRecordModal({ visible: false, record: null });
      fetchHealthRecords();
    }
  };

  const openAddHealthRecord = () => {
    setHealthRecordModal({ visible: true, record: null });
  };
  
  const openEditHealthRecord = (record: any) => {
    setHealthRecordModal({ visible: true, record });
  };

  const openReportModal = (record: any) => {
    setReportModal({ visible: true, record });
  };

  const handleReportUpload = async (record: any, filePath: string) => {
    try {
      // Update the health record with the file path
      const { error } = await supabase
        .from('health_records')
        .update({ 
          attachment_url: filePath,
          details: `PDF Report uploaded: ${new Date().toLocaleDateString()}`
        })
        .eq('id', record.id);

      if (error) {
        Alert.alert('Error', 'Failed to save report path');
        return;
      }

      Alert.alert('Success', 'Report uploaded successfully');
      setReportModal({ visible: false, record: null });
      fetchHealthRecords(); // Refresh the list
    } catch (error) {
      Alert.alert('Error', 'Failed to save report path');
    }
  };

  const downloadReport = async (record: any) => {
    if (record.attachment_url) {
      try {
        console.log('Requesting PDF download for record:', record.id);
        console.log('Record attachment_url:', record.attachment_url);
        
        // Get the user's session token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          Alert.alert('Error', 'Please log in again to download reports.');
          return;
        }

        // Call backend endpoint to get signed URL
        const response = await fetch(`http://172.20.10.3:3001/api/serve-pdf/${record.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Backend error:', errorData);
          Alert.alert('Error', errorData.error || 'Unable to access the report. Please try again.');
          return;
        }

        const { signedUrl, fileName } = await response.json();
        console.log('Signed URL received from backend:', signedUrl);
        
        // Download the file using expo-file-system
        const FileSystem = await import('expo-file-system');
        
        // Create a unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const downloadFileName = `${record.title || 'Report'}_${timestamp}.pdf`;
        
        // Get the documents directory
        const documentsDir = FileSystem.default.documentDirectory;
        const fileUri = `${documentsDir}${downloadFileName}`;
        
        // Show download progress
        Alert.alert('Downloading', 'Your report is being downloaded...\n\nPlease wait while we save your file.');
        
        // Download the file
        const downloadResult = await FileSystem.default.downloadAsync(signedUrl, fileUri);
        
        if (downloadResult.status === 200) {
          Alert.alert(
            'Download Complete', 
            `Report saved as: ${downloadFileName}`,
            [
              { text: 'OK', style: 'default' },
              { 
                text: 'Open File', 
                onPress: () => {
                  // Try to open the file with the device's default PDF viewer
                  Linking.openURL(`file://${fileUri}`).catch(() => {
                    Alert.alert('Info', 'File downloaded successfully. You can find it in your device\'s documents folder.');
                  });
                }
              },
              {
                text: 'View Downloads',
                onPress: () => {
                  setDownloadedReportsModal(true);
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to download the report. Please try again.');
        }
      } catch (error) {
        console.error('Error downloading report:', error);
        Alert.alert('Error', 'Unable to download the report. Please try again.');
      }
    }
  };

  // If no profile, show message
  if (profileLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.white }}>
        <CustomHeader title="Appointments" onDownloadedReportsPress={() => setDownloadedReportsModal(true)} />
        <View style={styles.centered}>
          <Text style={styles.grayText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.white }}>
        <CustomHeader title="Appointments" onDownloadedReportsPress={() => setDownloadedReportsModal(true)} />
        <View style={styles.centered}>
          <Text style={styles.grayText}>No profile selected. Please create or select a profile in the Profile tab.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <CustomHeader title="Appointments" onDownloadedReportsPress={() => setDownloadedReportsModal(true)} />
      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === 'Appointments' ? (
        <FlatList
          data={appointments}
          keyExtractor={item => item.appointment_id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <View style={[styles.appointmentCard, item.attended && styles.attendedCard]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.appointmentDate}>{item.date}</Text>
                {item.attended && (
                  <View style={styles.attendedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.attendedText}>Attended</Text>
                  </View>
                )}
              </View>
              <Text style={styles.appointmentDoctor}>{item.doctor_name}</Text>
              {item.visit_reason && <Text style={styles.appointmentSpecialty}>{item.visit_reason}</Text>}
              {item.notes && <Text style={styles.appointmentLocation}>{item.notes}</Text>}
              {item.attended && item.attended_date && (
                <Text style={styles.attendedDate}>Attended on: {new Date(item.attended_date).toLocaleDateString()}</Text>
              )}
              <View style={{ flexDirection: 'row', marginTop: 10, gap: 12 }}>
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => setEditModal({ open: true, appointment: item })}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.white} />
                  <Text style={{ color: COLORS.white, fontWeight: 'bold', marginLeft: 8 }}>Edit</Text>
                </TouchableOpacity>
                {item.attended ? (
                  <TouchableOpacity
                    style={{ backgroundColor: COLORS.success, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}
                    disabled={true}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                    <Text style={{ color: COLORS.white, fontWeight: 'bold', marginLeft: 8 }}>Attended</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{ backgroundColor: COLORS.secondary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => setAttendedModal({ open: true, appointment: item })}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                    <Text style={{ color: COLORS.white, fontWeight: 'bold', marginLeft: 8 }}>Mark Attended</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.error, borderRadius: 8, padding: 8, justifyContent: 'center', alignItems: 'center' }}
                  onPress={async () => {
                    await supabase.from('appointments').delete().eq('appointment_id', item.appointment_id);
                    fetchAppointments();
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={healthRecords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <TouchableOpacity style={styles.cardMainContent} onPress={() => openEditHealthRecord(item)}>
              <View style={styles.cardIcon}>
                <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.record_type}</Text>
                <Text style={styles.cardDate}>{new Date(item.event_date).toDateString()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={COLORS.gray} />
            </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addDetailsButton}
                onPress={() => {
                  if (item.record_type === 'General Check-up' || item.record_type === 'Lab Result' || item.record_type === 'Procedure') {
                    if (item.attachment_url) {
                      downloadReport(item);
                    } else {
                      openReportModal(item);
                    }
                  } else {
                    // TODO: Implement add details functionality
                    alert(`Add Details for ${item.title}`);
                  }
                }}
              >
                <Ionicons 
                  name={item.record_type === 'General Check-up' || item.record_type === 'Lab Result' || item.record_type === 'Procedure' ? 
                    (item.attachment_url ? 'download' : 'add-circle') : 'add-circle'} 
                  size={16} 
                  color={COLORS.primary} 
                />
                <Text style={styles.addDetailsButtonText}>
                  {item.record_type === 'General Check-up' || item.record_type === 'Lab Result' || item.record_type === 'Procedure' ? 
                    (item.attachment_url ? 'Download Report' : 'Add Report') : 'Add Details'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Text style={{ fontSize: 16, color: COLORS.gray }}>No health records found.</Text>
            </View>
          }
        />
      )}
      {/* Add Button */}
      <View style={styles.bottomBar}>
        {activeTab === 'Appointments' ? (
          <TouchableOpacity 
            style={styles.actionButtonVertical} 
            onPress={() => {
              if (!profile) {
                alert('Please create or select a profile in the Profile tab first.');
                return;
              }
              setShowAddModal(true);
            }}
            disabled={!profile}
          >
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>
              {profile ? 'Add Appointment' : 'No Profile Selected'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.actionButtonVertical} 
            onPress={() => {
              if (!profile) {
                alert('Please create or select a profile in the Profile tab first.');
                return;
              }
              openAddHealthRecord();
            }}
            disabled={!profile}
          >
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>
              {profile ? 'Add Health Record' : 'No Profile Selected'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Add Appointment Modal */}
      <Modal
        visible={showAddModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AddAppointmentModalForm onSuccess={handleAddSuccess} onCancel={() => setShowAddModal(false)} profileId={profile?.id} />
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Edit Appointment Modal */}
      <Modal
        visible={editModal.open}
        animationType="fade"
        transparent
        onRequestClose={() => setEditModal({ open: false, appointment: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {editModal.appointment && (
              <EditAppointmentModalForm
                appointment={editModal.appointment}
                onSuccess={handleEditSuccess}
                onCancel={() => setEditModal({ open: false, appointment: null })}
              />
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setEditModal({ open: false, appointment: null })}>
              <Ionicons name="close" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Attended Modal */}
      <Modal
        visible={attendedModal.open}
        animationType="fade"
        transparent
        onRequestClose={() => setAttendedModal({ open: false, appointment: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {attendedModal.appointment && (
              <AttendedModal 
                appointment={attendedModal.appointment}
                onClose={() => setAttendedModal({ open: false, appointment: null })}
                onSave={(notes) => {
                  setAttendedModal({ open: false, appointment: null });
                  fetchAppointments();
                  fetchHealthRecords();
                }}
              />
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setAttendedModal({ open: false, appointment: null })}>
              <Ionicons name="close" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Health Records Modal */}
      <Modal
        visible={healthRecordModal.visible}
        animationType="fade"
        transparent
        onRequestClose={() => setHealthRecordModal({ visible: false, record: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <HealthRecordForm
              onSuccess={handleHealthRecordSave}
              onCancel={() => setHealthRecordModal({ visible: false, record: null })}
        record={healthRecordModal.record}
        profile={profile}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setHealthRecordModal({ visible: false, record: null })}>
              <Ionicons name="close" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Report Upload Modal */}
      <ReportUploadModal
        visible={reportModal.visible}
        onClose={() => setReportModal({ visible: false, record: null })}
        onSave={handleReportUpload}
        record={reportModal.record}
      />

      <DownloadedReports
        visible={downloadedReportsModal}
        onClose={() => setDownloadedReportsModal(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 0,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    color: COLORS.white,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  tabSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    margin: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    color: COLORS.gray,
    fontWeight: 'bold',
    fontSize: 16,
  },
  tabButtonTextActive: {
    color: COLORS.white,
  },
  appointmentCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  appointmentDate: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  appointmentDoctor: {
    fontSize: 17,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  appointmentSpecialty: {
    fontSize: 15,
    color: COLORS.gray,
    marginBottom: 2,
  },
  appointmentLocation: {
    fontSize: 14,
    color: COLORS.gray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grayText: {
    color: COLORS.gray,
    fontSize: 16,
  },
  bottomBar: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
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
  actionText: {
    marginLeft: 6,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 0,
    minHeight: 200,
    maxHeight: '80%',
    width: '100%',
    alignSelf: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
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
  // Health Records styles
  recordCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addDetailsButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  cardIcon: {
    marginRight: 16,
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 15,
    color: COLORS.primary,
    marginVertical: 2,
  },
  cardDate: {
    fontSize: 14,
    color: COLORS.gray,
  },
  // Attended appointment styles
  attendedCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    backgroundColor: '#F0FDF4',
  },
  attendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  attendedText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  attendedDate: {
    fontSize: 13,
    color: COLORS.success,
    fontStyle: 'italic',
    marginTop: 4,
  },
}); 