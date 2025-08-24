import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, Platform, TextInput, Image, ScrollView, Alert } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Svg, Circle } from 'react-native-svg';
import { useProfile } from '../../lib/ProfileContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BACKEND_URL } from '../../lib/config';

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

// Multi-step modal for prescription and medications
function MultiStepPrescriptionModal({ onSuccess, profileId, accessToken, mealTimes }: { onSuccess: () => void, profileId: string | null, accessToken: string | null, mealTimes: {[key: string]: string} }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [prescription, setPrescription] = useState({
    doctor_name: '',
    issued_date: '',
    notes: ''
  });
  const [medications, setMedications] = useState<any[]>([]);
  const [currentMedication, setCurrentMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    days_remaining: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanningStep, setScanningStep] = useState<'medication' | null>(null);
  const [formPopulated, setFormPopulated] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Initialize prescription with current date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setPrescription(prev => ({ ...prev, issued_date: today }));
    setSelectedDate(new Date());
  }, []);



  // OCR Functions
  const scanMedication = async () => {
    try {
      setScanning(true);
      setScanningStep('medication');
      setError(null);

      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera permission is required to scan medication packages.');
        setScanning(false);
        setScanningStep(null);
        return;
      }

      // Show action sheet for image source selection
      Alert.alert(
        'Select Image Source',
        'Choose how you want to get the medication package image:',
        [
          {
            text: 'Take Photo',
            onPress: () => launchCamera(),
          },
          {
            text: 'Choose from Gallery',
            onPress: () => launchImageLibrary(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setScanning(false);
              setScanningStep(null);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Scan error:', error);
      setError(error.message || 'Failed to scan medication package');
      setScanning(false);
      setScanningStep(null);
    }
  };

  const launchCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6, // Reduced quality for better compression
        base64: true, // Enable base64 encoding
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processImage(result.assets[0]);
      } else {
        setScanning(false);
        setScanningStep(null);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      setError(error.message || 'Failed to take photo');
      setScanning(false);
      setScanningStep(null);
    }
  };

  const launchImageLibrary = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Media library permission is required to select images.');
        setScanning(false);
        setScanningStep(null);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6, // Reduced quality for better compression
        base64: true, // Enable base64 encoding
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processImage(result.assets[0]);
      } else {
        setScanning(false);
        setScanningStep(null);
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      setError(error.message || 'Failed to select image from gallery');
      setScanning(false);
      setScanningStep(null);
    }
  };

  const processImage = async (asset: any) => {
    try {
      const imageUri = asset.uri;
      const base64Data = asset.base64;
      
      if (!base64Data) {
        throw new Error('Failed to encode image to base64');
      }
      
      // Check image size and compress if needed
      const imageSizeInMB = (base64Data.length * 0.75) / (1024 * 1024); // Approximate size in MB
      console.log('Image size:', imageSizeInMB.toFixed(2), 'MB');
      
      if (imageSizeInMB > 10) {
        Alert.alert(
          'Large Image',
          'The image is quite large. This may take longer to process. Consider taking a new photo with better lighting.',
          [{ text: 'Continue', onPress: () => {} }]
        );
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Call OCR endpoint for single medication
              const ocrResponse = await fetch(`${BACKEND_URL}/api/ocr/medication`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${base64Data}`,
          user_id: user.id,
          profile_id: profileId
        }),
      });

      // Check if response is ok and contains JSON
      if (!ocrResponse.ok) {
        let errorMessage = 'OCR processing failed';
        try {
          const errorData = await ocrResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, try to get text response
          try {
            const errorText = await ocrResponse.text();
            errorMessage = `Server error: ${ocrResponse.status} - ${errorText}`;
          } catch (textError) {
            errorMessage = `Server error: ${ocrResponse.status} - ${ocrResponse.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Try to parse the response as JSON
      let ocrData;
      try {
        ocrData = await ocrResponse.json();
      } catch (parseError) {
        console.error('Failed to parse OCR response as JSON:', parseError);
        const responseText = await ocrResponse.text();
        console.error('Response text:', responseText);
        throw new Error('Invalid response from OCR service. Please try again.');
      }
      
      if (ocrData.success) {
        // Update current medication form with scanned data
        setCurrentMedication({
          name: ocrData.medication.name || '',
          dosage: ocrData.medication.dosage || '',
          frequency: ocrData.medication.frequency || '',
          days_remaining: ocrData.medication.days_remaining || ''
        });
        
        // Mark form as populated with OCR data
        setFormPopulated(true);
        
        Alert.alert(
          'Medication Details Extracted', 
          ocrData.message || 'Please review the details below and make any necessary adjustments before adding the medication.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(ocrData.error || 'Failed to extract medication details');
      }
      
    } catch (error: any) {
      console.error('OCR error:', error);
      setError(error.message || 'Failed to process medication package image. Please try again.');
    } finally {
      setScanning(false);
      setScanningStep(null);
    }
  };

  // Helper function to generate preview times
  const generatePreviewTimes = (frequency: number) => {
    const defaultTimes: string[] = [];
    for (let i = 0; i < frequency; i++) {
      const hour: number = 8 + (i * 4);
      defaultTimes.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return defaultTimes;
  };

  const handlePrescriptionSave = () => {
    if (!prescription.doctor_name.trim()) {
      setError('Please enter doctor name.');
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handleAddMedication = () => {
    if (!currentMedication.name || !currentMedication.dosage || !currentMedication.frequency || !currentMedication.days_remaining) {
      setError('Please fill in all medication fields.');
      return;
    }
    
    setError(null);
    
    // Generate preview reminder times based on profile meal times
    const generatePreviewTimes = (frequency: number) => {
      const mealTimeValues = Object.values(mealTimes);
      const previewTimes: string[] = [];
      
      // Use first meal times from profile, up to the frequency limit
      for (let i = 0; i < frequency && i < mealTimeValues.length; i++) {
        const time = mealTimeValues[i] as string;
        if (time.includes(':')) {
          const [hours, minutes] = time.split(':');
          previewTimes.push(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`);
        } else {
          // Fallback to default time if meal time format is unexpected
          const hour: number = 8 + (i * 4);
          previewTimes.push(`${hour.toString().padStart(2, '0')}:00`);
        }
      }
      
      // If we need more times than meal times available, add default times
      while (previewTimes.length < frequency) {
        const hour: number = 8 + (previewTimes.length * 4);
        previewTimes.push(`${hour.toString().padStart(2, '0')}:00`);
      }
      
      return previewTimes;
    };
    
    const newMedication = {
      ...currentMedication,
      days_remaining: parseInt(currentMedication.days_remaining),
      id: Date.now(), // temporary ID for list management
      previewReminderTimes: generatePreviewTimes(parseInt(currentMedication.frequency))
    };
    setMedications([...medications, newMedication]);
    setCurrentMedication({ name: '', dosage: '', frequency: '', days_remaining: '' });
    setFormPopulated(false);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (medications.length === 0) {
      setError('Please add at least one medication.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profileId) {
        setError('User or profile not found.');
        setSaving(false);
        return;
      }

      // Validate that the profile belongs to the current user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('meal_times, user_id')
        .eq('id', profileId)
        .single();

      if (profileError || !profileData) {
        console.error('Profile fetch error:', profileError);
        setError('Failed to fetch profile data.');
        setSaving(false);
        return;
      }

      // Check if profile belongs to current user
      if (profileData.user_id !== user.id) {
        setError('Profile does not belong to current user.');
        setSaving(false);
        return;
      }

      // First, create the prescription
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert({
          profile_id: profileId,
          doctor_name: prescription.doctor_name,
          issued_date: prescription.issued_date || new Date().toISOString().split('T')[0],
          notes: prescription.notes
        })
        .select()
        .single();

      if (prescriptionError) {
        console.error('Prescription insert error:', prescriptionError);
        setError('Failed to create prescription.');
        setSaving(false);
        return;
      }

      // Generate reminder times based on profile meal times
      const generateReminderTimes = (medication: any, mealTimes: any) => {
        const frequency = parseInt(medication.frequency);
        const mealTimeValues = Object.values(mealTimes);
        const reminderTimes: string[] = [];
        
        // Use first meal times from profile, up to the frequency limit
        for (let i = 0; i < frequency && i < mealTimeValues.length; i++) {
          const time = mealTimeValues[i] as string;
          // Ensure time format is HH:MM:SS
          if (time.includes(':')) {
            const [hours, minutes] = time.split(':');
            reminderTimes.push(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`);
          } else {
            // Fallback to default time if meal time format is unexpected
            const hour: number = 8 + (i * 4);
            reminderTimes.push(`${hour.toString().padStart(2, '0')}:00:00`);
          }
        }
        
        // If we need more times than meal times available, add default times
        while (reminderTimes.length < frequency) {
          const hour: number = 8 + (reminderTimes.length * 4);
          reminderTimes.push(`${hour.toString().padStart(2, '0')}:00:00`);
        }
        
        return reminderTimes;
      };

      // Then, create all medications linked to this prescription with reminder times
      const medicationsToInsert = medications.map(med => {
        const reminderTimes = generateReminderTimes(med, profileData.meal_times);
        
        return {
          profile_id: profileId,
          prescription_id: prescriptionData.id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          days_remaining: med.days_remaining,
          reminder_times: reminderTimes
        };
      });

      const { data: insertedMedications, error: medicationsError } = await supabase
        .from('medications')
        .insert(medicationsToInsert)
        .select();

      if (medicationsError) {
        console.error('Medications insert error:', medicationsError);
        setError('Failed to add medications.');
        setSaving(false);
        return;
      }

      console.log('Prescription and medications saved successfully:', {
        prescription: prescriptionData,
        medications: insertedMedications
      });
      onSuccess();
    } catch (e) {
      console.error('Save error:', e);
      setError('Failed to save prescription and medications.');
    } finally {
      setSaving(false);
    }
  };

  const renderStep1 = () => (
    <View style={modalStyles.container}>
      <Text style={modalStyles.header}>Prescription Details</Text>
      
      <Text style={modalStyles.label}>Doctor Name *</Text>
      <TextInput
        style={modalStyles.input}
        placeholder="e.g. Dr. Smith"
        value={prescription.doctor_name}
        onChangeText={(text) => setPrescription({...prescription, doctor_name: text})}
      />
      
      <Text style={modalStyles.label}>Issued Date</Text>
      <TouchableOpacity 
        style={modalStyles.input}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={{ 
          color: prescription.issued_date ? COLORS.primary : COLORS.gray,
          fontSize: 16
        }}>
          {prescription.issued_date ? new Date(prescription.issued_date).toLocaleDateString() : 'Select date (optional)'}
        </Text>
      </TouchableOpacity>
      
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedDate(date);
              const formattedDate = date.toISOString().split('T')[0];
              setPrescription({...prescription, issued_date: formattedDate});
            }
          }}
        />
      )}
      <Text style={modalStyles.label}>Notes</Text>
      <TextInput
        style={[modalStyles.input, { height: 80, textAlignVertical: 'top' }]}
        placeholder="Additional notes (optional)"
        value={prescription.notes}
        onChangeText={(text) => setPrescription({...prescription, notes: text})}
        multiline
      />
      {error && <Text style={{ color: COLORS.error, marginTop: 8 }}>{error}</Text>}
      <TouchableOpacity style={modalStyles.saveButton} onPress={handlePrescriptionSave}>
        <Text style={modalStyles.saveButtonText}>Next: Add Medications</Text>
      </TouchableOpacity>
      
      {/* Appointment Picker Modal */}

    </View>
  );

  const renderStep2 = () => (
    <View style={modalStyles.container}>
      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <Text style={modalStyles.header}>Add Medications</Text>
        <Text style={modalStyles.subHeader}>Prescription: {prescription.doctor_name}</Text>
        
        {/* OCR Scan Button for Individual Medication */}
        <TouchableOpacity 
          style={[modalStyles.ocrButton, scanning && scanningStep === 'medication' && modalStyles.ocrButtonScanning]} 
          onPress={scanMedication}
          disabled={scanning}
        >
          <Ionicons 
            name={scanning && scanningStep === 'medication' ? 'images' : 'images-outline'} 
            size={24} 
            color={COLORS.white} 
          />
          <Text style={modalStyles.ocrButtonText}>
            {scanning && scanningStep === 'medication' ? 'Extracting...' : 'Extract from Package'}
          </Text>
          {scanning && scanningStep === 'medication' && (
            <ActivityIndicator color={COLORS.white} size="small" style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>
        
        <View style={modalStyles.divider} />
        
        {/* OCR Data Indicator */}
        {formPopulated && (
          <View style={modalStyles.ocrIndicator}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            <Text style={modalStyles.ocrIndicatorText}>
              Form populated with extracted data - please review and adjust if needed
            </Text>
          </View>
        )}
        
        {/* Current medication form */}
        <Text style={modalStyles.label}>Medication Name *</Text>
        <TextInput
          style={modalStyles.input}
          placeholder="e.g. Paracetamol"
          value={currentMedication.name}
          onChangeText={(text) => setCurrentMedication({...currentMedication, name: text})}
        />
        <Text style={modalStyles.label}>Dosage *</Text>
        <TextInput
          style={modalStyles.input}
          placeholder="e.g. 500mg"
          value={currentMedication.dosage}
          onChangeText={(text) => setCurrentMedication({...currentMedication, dosage: text})}
        />
        
        {/* Frequency and Days on one line */}
        <View style={modalStyles.rowInput}>
          <View style={modalStyles.halfInput}>
            <Text style={modalStyles.label}>Frequency *</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="2"
              value={currentMedication.frequency}
              onChangeText={(text) => setCurrentMedication({...currentMedication, frequency: text})}
              keyboardType="numeric"
              maxLength={1}
            />
          </View>
          <View style={modalStyles.halfInput}>
            <Text style={modalStyles.label}>Days *</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="5"
              value={currentMedication.days_remaining}
              onChangeText={(text) => setCurrentMedication({...currentMedication, days_remaining: text})}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
        </View>
        

        
        <TouchableOpacity style={[modalStyles.saveButton, { backgroundColor: COLORS.secondary, marginBottom: 12 }]} onPress={handleAddMedication}>
          <Text style={[modalStyles.saveButtonText, { color: COLORS.primary }]}>Add This Medication</Text>
        </TouchableOpacity>

        {/* List of added medications */}
        {medications.length > 0 && (
          <View style={modalStyles.medicationsList}>
            <Text style={modalStyles.label}>Added Medications ({medications.length})</Text>
            {medications.map((med, index) => (
              <View key={med.id} style={modalStyles.medicationItem}>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.medicationName}>{med.name}</Text>
                  <Text style={modalStyles.medicationDetail}>{med.dosage} • {med.frequency}x/day • {med.days_remaining} days</Text>
                  {med.previewReminderTimes && (
                    <Text style={modalStyles.reminderPreview}>
                      Reminders: {med.previewReminderTimes.join(', ')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={modalStyles.removeButton}
                  onPress={() => handleRemoveMedication(index)}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {error && <Text style={{ color: COLORS.error, marginTop: 8, marginBottom: 8 }}>{error}</Text>}
      </ScrollView>
      
      {/* Fixed bottom buttons */}
      <View style={modalStyles.buttonRow}>
        <TouchableOpacity style={[modalStyles.saveButton, { flex: 1, marginRight: 8, backgroundColor: COLORS.gray }]} onPress={() => setCurrentStep(1)}>
          <Text style={modalStyles.saveButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[modalStyles.saveButton, { flex: 1, marginLeft: 8 }]} onPress={handleSaveAll} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={modalStyles.saveButtonText}>Save All</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return currentStep === 1 ? renderStep1() : renderStep2();
}

function EditMedicationModalForm({ medication, onSuccess, onCancel, profileId }: { medication: any, onSuccess: () => void, onCancel: () => void, profileId: string | null }) {
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

// New component for editing prescriptions
function EditPrescriptionModalForm({ prescription, medications, onSuccess, onCancel, profileId, mealTimes }: { 
  prescription: any, 
  medications: any[], 
  onSuccess: () => void, 
  onCancel: () => void, 
  profileId: string | null,
  mealTimes: {[key: string]: string}
}) {
  const [doctorName, setDoctorName] = useState(prescription.doctor_name || '');
  const [notes, setNotes] = useState(prescription.notes || '');
  const [prescriptionMedications, setPrescriptionMedications] = useState(medications);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [currentMedication, setCurrentMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    days_remaining: ''
  });
  const [selectedMealTimes, setSelectedMealTimes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset selected meal times when frequency changes
  useEffect(() => {
    const frequency = parseInt(currentMedication.frequency);
    if (frequency === 1 || frequency === 2) {
      const mealTimeValues = Object.values(mealTimes);
      setSelectedMealTimes(mealTimeValues.slice(0, frequency));
    } else {
      setSelectedMealTimes([]);
    }
  }, [currentMedication.frequency, mealTimes]);

  const handleAddMedication = () => {
    if (!currentMedication.name || !currentMedication.dosage || !currentMedication.frequency || !currentMedication.days_remaining) {
      setError('Please fill in all medication fields.');
      return;
    }
    
    const frequency = parseInt(currentMedication.frequency);
    if ((frequency === 1 || frequency === 2) && selectedMealTimes.length !== frequency) {
      setError(`Please select exactly ${frequency} meal time${frequency > 1 ? 's' : ''} for reminders.`);
      return;
    }
    
    setError(null);
    
    const generatePreviewTimes = (frequency: number) => {
      if (frequency === 1 || frequency === 2) {
        return selectedMealTimes.map(time => {
          const [hours, minutes] = time.split(':');
          return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        });
      } else {
        const defaultTimes: string[] = [];
        for (let i = 0; i < frequency; i++) {
          const hour: number = 8 + (i * 4);
          defaultTimes.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        return defaultTimes;
      }
    };
    
    const newMedication = {
      ...currentMedication,
      days_remaining: parseInt(currentMedication.days_remaining),
      id: Date.now(),
      previewReminderTimes: generatePreviewTimes(frequency),
      selectedMealTimes: frequency === 1 || frequency === 2 ? selectedMealTimes : []
    };
    setPrescriptionMedications([...prescriptionMedications, newMedication]);
    setCurrentMedication({ name: '', dosage: '', frequency: '', days_remaining: '' });
    setSelectedMealTimes([]);
  };

  const handleRemoveMedication = (index: number) => {
    setPrescriptionMedications(prescriptionMedications.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!doctorName.trim()) {
      setError('Please enter doctor name.');
      return;
    }
    if (prescriptionMedications.length === 0) {
      setError('Please add at least one medication.');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profileId) {
        setError('User or profile not found.');
        setSaving(false);
        return;
      }

      // Update prescription
      const { error: prescriptionError } = await supabase
        .from('prescriptions')
        .update({
          doctor_name: doctorName,
          notes: notes
        })
        .eq('id', prescription.id);

      if (prescriptionError) {
        console.error('Prescription update error:', prescriptionError);
        setError('Failed to update prescription.');
        setSaving(false);
        return;
      }

      // Generate reminder times function
      const generateReminderTimes = (medication: any, mealTimes: any) => {
        const frequency = parseInt(medication.frequency);
        
        if ((frequency === 1 || frequency === 2) && medication.selectedMealTimes && medication.selectedMealTimes.length > 0) {
          return medication.selectedMealTimes.map((time: string) => {
            if (time.includes(':')) {
              const [hours, minutes] = time.split(':');
              return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
            } else {
              return `${time.padStart(2, '0')}:00:00`;
            }
          });
        }
        
        if (!mealTimes || Object.keys(mealTimes).length === 0) {
          const defaultTimes: string[] = [];
          for (let i = 0; i < frequency; i++) {
            const hour: number = 8 + (i * 4);
            defaultTimes.push(`${hour.toString().padStart(2, '0')}:00:00`);
          }
          return defaultTimes;
        }

        const mealTimeValues = Object.values(mealTimes);
        const reminderTimes: string[] = [];
        
        for (let i = 0; i < frequency && i < mealTimeValues.length; i++) {
          const time = mealTimeValues[i] as string;
          if (time.includes(':')) {
            const [hours, minutes] = time.split(':');
            reminderTimes.push(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`);
          } else {
            const hour: number = 8 + (i * 4);
            reminderTimes.push(`${hour.toString().padStart(2, '0')}:00:00`);
          }
        }

        while (reminderTimes.length < frequency) {
          const hour: number = 8 + (reminderTimes.length * 4);
          reminderTimes.push(`${hour.toString().padStart(2, '0')}:00:00`);
        }

        return reminderTimes;
      };

      // Update existing medications and add new ones
      const existingMedications = prescriptionMedications.filter(med => med.medication_id);
      const newMedications = prescriptionMedications.filter(med => !med.medication_id);

      // Update existing medications
      for (const med of existingMedications) {
        const reminderTimes = generateReminderTimes(med, mealTimes);
        const { error: updateError } = await supabase
          .from('medications')
          .update({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            days_remaining: med.days_remaining,
            reminder_times: reminderTimes
          })
          .eq('medication_id', med.medication_id);
        
        if (updateError) {
          console.error('Medication update error:', updateError);
          setError('Failed to update some medications.');
          setSaving(false);
          return;
        }
      }

      // Add new medications
      if (newMedications.length > 0) {
        const medicationsToInsert = newMedications.map(med => {
          const reminderTimes = generateReminderTimes(med, mealTimes);
          return {
            profile_id: profileId,
            prescription_id: prescription.id,
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            days_remaining: med.days_remaining,
            reminder_times: reminderTimes
          };
        });

        const { error: insertError } = await supabase
          .from('medications')
          .insert(medicationsToInsert);

        if (insertError) {
          console.error('Medications insert error:', insertError);
          setError('Failed to add new medications.');
          setSaving(false);
          return;
        }
      }

      onSuccess();
    } catch (e) {
      console.error('Save error:', e);
      setError('Failed to save prescription and medications.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={modalStyles.container}>
      <Text style={modalStyles.header}>Edit Prescription</Text>
      
      {/* Prescription Details */}
      <Text style={modalStyles.label}>Doctor Name *</Text>
      <TextInput
        style={modalStyles.input}
        placeholder="e.g. Dr. Smith"
        value={doctorName}
        onChangeText={setDoctorName}
      />
      <Text style={modalStyles.label}>Notes</Text>
      <TextInput
        style={[modalStyles.input, { height: 80, textAlignVertical: 'top' }]}
        placeholder="Additional notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {/* Current Medications */}
      <Text style={modalStyles.label}>Current Medications ({prescriptionMedications.length})</Text>
      {prescriptionMedications.map((med, index) => (
        <View key={med.medication_id || med.id} style={modalStyles.medicationItem}>
          <View style={{ flex: 1 }}>
            <Text style={modalStyles.medicationName}>{med.name}</Text>
            <Text style={modalStyles.medicationDetail}>{med.dosage} • {med.frequency}x/day • {med.days_remaining} days</Text>
          </View>
          <TouchableOpacity 
            style={modalStyles.removeButton}
            onPress={() => handleRemoveMedication(index)}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      ))}

      {/* Add New Medication */}
      <TouchableOpacity 
        style={[modalStyles.saveButton, { backgroundColor: COLORS.secondary, marginTop: 16 }]} 
        onPress={() => setShowAddMedication(!showAddMedication)}
      >
        <Text style={[modalStyles.saveButtonText, { color: COLORS.primary }]}>
          {showAddMedication ? 'Cancel Adding' : 'Add New Medication'}
        </Text>
      </TouchableOpacity>

      {showAddMedication && (
        <View style={{ marginTop: 16 }}>
          <Text style={modalStyles.label}>Medication Name *</Text>
          <TextInput
            style={modalStyles.input}
            placeholder="e.g. Paracetamol"
            value={currentMedication.name}
            onChangeText={(text) => setCurrentMedication({...currentMedication, name: text})}
          />
          <Text style={modalStyles.label}>Dosage *</Text>
          <TextInput
            style={modalStyles.input}
            placeholder="e.g. 500mg"
            value={currentMedication.dosage}
            onChangeText={(text) => setCurrentMedication({...currentMedication, dosage: text})}
          />
          
          <View style={modalStyles.rowInput}>
            <View style={modalStyles.halfInput}>
              <Text style={modalStyles.label}>Frequency *</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="2"
                value={currentMedication.frequency}
                onChangeText={(text) => setCurrentMedication({...currentMedication, frequency: text})}
                keyboardType="numeric"
                maxLength={1}
              />
            </View>
            <View style={modalStyles.halfInput}>
              <Text style={modalStyles.label}>Days *</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="5"
                value={currentMedication.days_remaining}
                onChangeText={(text) => setCurrentMedication({...currentMedication, days_remaining: text})}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>
          
          {/* Meal Time Selection for Frequency 1 or 2 */}
          {(parseInt(currentMedication.frequency) === 1 || parseInt(currentMedication.frequency) === 2) && Object.keys(mealTimes).length > 0 && (
            <View style={modalStyles.mealTimeSelection}>
              <Text style={modalStyles.label}>
                Select {currentMedication.frequency} meal time{parseInt(currentMedication.frequency) > 1 ? 's' : ''} for reminders *
              </Text>
              <View style={modalStyles.mealTimeGrid}>
                {Object.entries(mealTimes).map(([mealName, mealTime]) => {
                  const isSelected = selectedMealTimes.includes(mealTime);
                  const canSelect = selectedMealTimes.length < parseInt(currentMedication.frequency) || isSelected;
                  
                  return (
                    <TouchableOpacity
                      key={mealName}
                      style={[
                        modalStyles.mealTimeOption,
                        isSelected && modalStyles.mealTimeOptionSelected,
                        !canSelect && modalStyles.mealTimeOptionDisabled
                      ]}
                      onPress={() => {
                        if (canSelect) {
                          if (isSelected) {
                            setSelectedMealTimes(selectedMealTimes.filter(time => time !== mealTime));
                          } else {
                            setSelectedMealTimes([...selectedMealTimes, mealTime]);
                          }
                        }
                      }}
                      disabled={!canSelect}
                    >
                      <Text style={[
                        modalStyles.mealTimeText,
                        isSelected && modalStyles.mealTimeTextSelected,
                        !canSelect && modalStyles.mealTimeTextDisabled
                      ]}>
                        {mealName}
                      </Text>
                      <Text style={[
                        modalStyles.mealTimeValue,
                        isSelected && modalStyles.mealTimeTextSelected,
                        !canSelect && modalStyles.mealTimeTextDisabled
                      ]}>
                        {mealTime}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.white} style={modalStyles.mealTimeCheck} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
          
          <TouchableOpacity style={[modalStyles.saveButton, { backgroundColor: COLORS.secondary, marginTop: 12 }]} onPress={handleAddMedication}>
            <Text style={[modalStyles.saveButtonText, { color: COLORS.primary }]}>Add This Medication</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && <Text style={{ color: COLORS.error, marginTop: 8 }}>{error}</Text>}
      
      <View style={modalStyles.buttonRow}>
        <TouchableOpacity style={[modalStyles.saveButton, { flex: 1, marginRight: 8, backgroundColor: COLORS.gray }]} onPress={onCancel}>
          <Text style={modalStyles.saveButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[modalStyles.saveButton, { flex: 1, marginLeft: 8 }]} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={modalStyles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: Platform.OS === 'ios' ? '85%' : '80%',
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'column',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  label: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  subHeader: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  medicationsList: {
    marginTop: 16,
    marginBottom: 16,
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  medicationDetail: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  reminderPreview: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  rowInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  mealTimeSelection: {
    marginTop: 16,
    marginBottom: 16,
  },
  mealTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  mealTimeOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  mealTimeOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  mealTimeOptionDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  mealTimeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.gray,
    textAlign: 'center',
  },
  mealTimeTextSelected: {
    color: COLORS.white,
  },
  mealTimeTextDisabled: {
    color: '#9CA3AF',
  },
  mealTimeValue: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
    textAlign: 'center',
  },
  mealTimeCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  selectedMealTimesText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  ocrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ocrButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  ocrButtonScanning: {
    backgroundColor: COLORS.gray,
    opacity: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 16,
  },
  ocrIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ocrIndicatorText: {
    color: COLORS.primary,
    fontSize: 14,
    marginLeft: 4,
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
function getDoseProgress(reminder_times: string[], logs: any[], medication_id: string, frequency: number) {
  // Use reminder_times from the medication table, limited by frequency
  const times = reminder_times && reminder_times.length > 0 
    ? reminder_times.slice(0, frequency)
    : [];

  if (times.length === 0) return { taken: 0, total: 0, nextDose: null, allTaken: true };

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  // Get logs for this medication and today
  const todayLogs = logs.filter(l => l.medication_id === medication_id && l.log_date === todayStr && l.status === 'taken');
  // Map of taken times
  const takenTimes = new Set(todayLogs.map(l => l.log_time));
  // Find next untaken time
  const now = new Date();
  const untakenTimes = times.filter(t => !takenTimes.has(t));
  let nextDose = null;
  if (untakenTimes.length > 0) {
    // Find the next untaken time that is still in the future, else the earliest untaken
    const futureUntaken = untakenTimes.filter(t => {
      const [h, m] = t.split(':');
      const d = new Date();
      d.setHours(Number(h), Number(m), 0, 0);
      return d > now;
    });
    nextDose = (futureUntaken.length > 0 ? futureUntaken[0] : untakenTimes[0]);
  }
  return {
    taken: todayLogs.length,
    total: times.length,
    nextDose,
    allTaken: todayLogs.length >= times.length
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

// Helper function to get today's date string
function getTodayDateStr() {
  return new Date().toISOString().slice(0, 10);
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

// Helper function to get the last missed dose time for today
function getLastMissedDoseTime(
  reminder_times: string[],
  logs: any[],
  medication_id: string,
  frequency: number
) {
  const todayStr = getTodayDateStr();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const missedTimes: string[] = [];

  // Use reminder_times from the medication table, limited by frequency
  const times = reminder_times && reminder_times.length > 0 
    ? reminder_times.slice(0, frequency)
    : [];

  if (times.length === 0) return null;

  // Get all taken times for today
  const todayLogs = logs.filter(l => l.medication_id === medication_id && l.log_date === todayStr && l.status === 'taken');
  const takenTimes = new Set(todayLogs.map(l => l.log_time));

  times.forEach(time => {
    const [h, m] = time.split(':').map(Number);
    const timeMinutes = h * 60 + m;
    
    // Check if this time has passed and dose wasn't taken at the exact scheduled time
    if (timeMinutes < nowMinutes && !takenTimes.has(time)) {
      missedTimes.push(time);
    }
  });

  // Return only the last (most recent) missed time
  return missedTimes.length > 0 ? missedTimes[missedTimes.length - 1] : null;
}

// Helper to get next dose time, now supports next day logic and respects frequency
function getNextDoseTime(
  reminder_times: string[],
  logs: any[],
  medication_id: string,
  days_remaining: number,
  frequency: number
) {
  // Use reminder_times from the medication table, limited by frequency
  const times = reminder_times && reminder_times.length > 0 
    ? reminder_times.slice(0, frequency)
    : [];

  if (times.length === 0) return null;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayLogs = logs.filter(l => l.medication_id === medication_id && l.log_date === todayStr && l.status === 'taken');
  const takenTimes = new Set(todayLogs.map(l => l.log_time));
  const untakenTimes = times.filter(t => !takenTimes.has(t));
  
  if (untakenTimes.length > 0) {
    // Next untaken time today
    const now = new Date();
    const futureUntaken = untakenTimes.filter(t => {
      const [h, m] = t.split(':');
      const d = new Date();
      d.setHours(Number(h), Number(m), 0, 0);
      return d > now;
    });
    
    // If there are future untaken times, show the next one
    if (futureUntaken.length > 0) {
      return futureUntaken[0];
    } else {
      // If all remaining times are in the past, show the earliest untaken time
      return untakenTimes[0];
    }
  } else if (days_remaining > 0) {
    // All taken today, show first time for tomorrow
    return `Tomorrow: ${times[0]}`;
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
  const { profile, loading: profileLoading } = useProfile();
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditPrescriptionModal, setShowEditPrescriptionModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]); // Store today's logs
  const [activeTab, setActiveTab] = useState('ongoing'); // New state for tabs
  const [mealTimes, setMealTimes] = useState<{[key: string]: string}>({});
  const [accessToken, setAccessToken] = useState<string | null>(null);



  // Set meal times when profile changes
  useEffect(() => {
    if (profile && profile.meal_times) {
      setMealTimes(profile.meal_times);
    } else {
      setMealTimes({});
    }
  }, [profile]);

  useEffect(() => {
    const fetchAccessToken = async () => {
      const { data } = await supabase.auth.getSession();
      setAccessToken(data?.session?.access_token || null);
    };
    fetchAccessToken();
  }, []);

  // Profile is now managed by global context, no need to refresh on focus

  // Refetch medications/logs when profile changes
  useEffect(() => {
    if (!profile || !profile.id) return;
    setLoading(true);
    setError(null);
    const fetchMedicationsAndLogs = async () => {
      // Fetch medications for this profile
      console.log('Fetching medications for profile:', profile.id);
      const { data: meds, error: medsError } = await supabase
        .from('medications')
        .select(`
          *, 
          prescriptions:prescription_id (id, doctor_name, notes)
        `)
        .eq('profile_id', profile.id);
      console.log('Fetched medications:', meds, 'Error:', medsError);
      
      if (medsError) {
        console.error('Fetch medications error:', medsError);
        setError('Failed to fetch medications');
        setMedications([]);
      } else {
        console.log('Fetched medications:', meds);
        setMedications(meds || []);
      }
      // Fetch today's logs for this profile
      const { data: logData, error: logError } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('log_date', getTodayDateStr());
      if (!logError) setLogs(logData || []);
      setLoading(false);
    };
    fetchMedicationsAndLogs();
  }, [profile]);

  // If no profile, prompt user
  if (profileLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }
  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No profile selected. Please create or select a profile in the Profile tab.</Text>
      </View>
    );
  }

  // Group medications by prescription
  function groupByPrescription(medications: any[]) {
    const groups: Record<string, { prescription: any, medications: any[] }> = {};
    medications.forEach(med => {
      let groupId: string;
      let prescription = null;
      
      if (med.prescription_id && med.prescriptions) {
        // Medication from prescription
        prescription = med.prescriptions;
        groupId = `prescription-${med.prescription_id}`;
      } else {
        // Standalone medication
        groupId = 'no-prescription';
      }
      
      if (!groups[groupId]) {
        groups[groupId] = {
          prescription,
          medications: [],
        };
      }
      groups[groupId].medications.push(med);
    });
    return Object.values(groups);
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
      profile_id: profile.id,
      medication_id: medication.medication_id,
      log_date: today,
      log_time: doseTime,
      status: 'taken',
    });
    
    if (!error) {
      // Refresh logs from database to ensure accurate state
      const { data: updatedLogs, error: logError } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('log_date', today);
      
      if (!logError && updatedLogs) {
        setLogs(updatedLogs);
        
        // Check if all doses for today are now taken
        const progress = getDoseProgress(medication.reminder_times, updatedLogs, medication.medication_id, medication.frequency || 1);
        if (progress.allTaken && medication.days_remaining > 0) {
          await decrementDaysRemaining(medication.medication_id);
          // Refresh medications list
          const { data: meds, error: medsError } = await supabase
            .from('medications')
            .select(`
              *, 
              prescriptions:prescription_id (id, doctor_name, notes)
            `)
            .eq('profile_id', profile.id);
          if (!medsError) setMedications(meds || []);
        }
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

  // New handlers for prescription management
  const handleEditPrescription = (prescription: any, prescriptionMedications: any[]) => {
    setSelectedPrescription({ ...prescription, medications: prescriptionMedications });
    setShowEditPrescriptionModal(true);
  };

  const handleDeletePrescription = async (prescription: any) => {
    console.log('handleDeletePrescription called with:', prescription);
    
    Alert.alert(
      'Delete Prescription',
      `Are you sure you want to delete the prescription from ${prescription.doctor_name}? This will also delete all associated medications and their logs.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('User confirmed delete');
            await performDeletePrescription(prescription);
          },
        },
      ]
    );
  };

  const performDeletePrescription = async (prescription: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated.');
        return;
      }

      console.log('Starting deletion of prescription:', prescription.id);

      // First, get all medication IDs associated with this prescription
      const { data: medicationsToDelete, error: fetchError } = await supabase
        .from('medications')
        .select('medication_id')
        .eq('prescription_id', prescription.id);

      if (fetchError) {
        console.error('Error fetching medications to delete:', fetchError);
        Alert.alert('Error', 'Failed to fetch medications for deletion.');
        return;
      }

      console.log('Found medications to delete:', medicationsToDelete);

      if (medicationsToDelete && medicationsToDelete.length > 0) {
        const medicationIds = medicationsToDelete.map(med => med.medication_id);

        // Delete all medication logs associated with these medications
        const { error: logsError } = await supabase
          .from('medication_logs')
          .delete()
          .in('medication_id', medicationIds);

        if (logsError) {
          console.error('Error deleting medication logs:', logsError);
          Alert.alert('Error', 'Failed to delete medication logs.');
          return;
        }

        console.log('Deleted medication logs for medications:', medicationIds);

        // Delete all medications associated with this prescription
        const { error: medicationsError } = await supabase
          .from('medications')
          .delete()
          .eq('prescription_id', prescription.id);

        if (medicationsError) {
          console.error('Error deleting medications:', medicationsError);
          Alert.alert('Error', 'Failed to delete medications.');
          return;
        }

        console.log('Deleted medications for prescription:', prescription.id);
      }

      // Finally delete the prescription
      const { error: prescriptionError } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', prescription.id);

      if (prescriptionError) {
        console.error('Error deleting prescription:', prescriptionError);
        Alert.alert('Error', 'Failed to delete prescription.');
        return;
      }

      console.log('Successfully deleted prescription:', prescription.id);

      // Refresh the medications list
      const { data: meds, error: medsError } = await supabase
        .from('medications')
        .select('*, prescriptions:prescription_id (id, doctor_name, notes)')
        .eq('profile_id', profile.id);
      
      if (!medsError) {
        setMedications(meds || []);
        console.log('Refreshed medications list after deletion');
        Alert.alert('Success', 'Prescription deleted successfully.');
      } else {
        console.error('Error refreshing medications:', medsError);
        Alert.alert('Warning', 'Prescription deleted but failed to refresh the list.');
      }

      // Also refresh logs
      const today = getTodayDateStr();
      const { data: updatedLogs, error: logsRefreshError } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('log_date', today);
      
      if (!logsRefreshError && updatedLogs) {
        setLogs(updatedLogs);
      }

    } catch (e) {
      console.error('Delete error:', e);
      Alert.alert('Error', 'Failed to delete prescription.');
    }
  };

  // Filter medications for each tab
  const ongoingMedications = medications.filter(m => m.days_remaining === null || m.days_remaining > 0);
  const pastMedications = medications.filter(m => m.days_remaining === 0);
  const displayedMedications = activeTab === 'ongoing' ? ongoingMedications : pastMedications;

  // Prepare prescription groups for FlatList
  const prescriptionGroups = groupByPrescription(displayedMedications);

  return (
    <View style={styles.container}>
      <CustomHeader title="Medications" />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ongoing' && styles.activeTab]}
          onPress={() => setActiveTab('ongoing')}
        >
          <Text style={[styles.tabText, activeTab === 'ongoing' && styles.activeTabText]}>Ongoing</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>Past</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : displayedMedications.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.watermarkContainer}>
            <Ionicons name="medkit-outline" size={120} color={COLORS.lightGray} style={styles.watermarkIcon} />
            <Text style={styles.emptyText}>
              {activeTab === 'ongoing'
                ? 'No ongoing medications. Add some!'
                : 'No past medications found.'}
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={prescriptionGroups}
          keyExtractor={(item) => {
            if (item.prescription) return `prescription-${item.prescription.id}`;
            return 'uncategorized';
          }}
          renderItem={({ item: group }) => {
            const prescription = group.prescription;
            
            return (
              <View style={styles.prescriptionContainer}>
                {/* Prescription Header */}
                <View style={styles.prescriptionHeader}>
                  <View style={styles.prescriptionHeaderContent}>
                    <Text style={styles.prescriptionTitle}>
                      {prescription?.doctor_name || 'Uncategorized'}
                    </Text>
                    {prescription?.notes && (
                      <Text style={styles.prescriptionNotes}>{prescription.notes}</Text>
                    )}
                  </View>
                  {prescription && (
                    <View style={styles.prescriptionActions}>
                      <TouchableOpacity
                        style={styles.prescriptionActionBtn}
                        onPress={() => handleEditPrescription(prescription, group.medications)}
                      >
                        <Ionicons name="create-outline" size={18} color={COLORS.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.prescriptionActionBtn}
                        onPress={() => {
                          console.log('Delete button pressed for prescription:', prescription);
                          handleDeletePrescription(prescription);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete prescription from ${prescription.doctor_name}`}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                {/* Medications List */}
                <View style={styles.medicationsList}>
                  {group.medications.map((medication) => {
                    const progress = getDoseProgress(medication.reminder_times, logs, medication.medication_id, medication.frequency || 1);
                    return (
                      <View key={medication.medication_id} style={styles.medicationCard} accessible={true} accessibilityLabel={`Medication card for ${medication.name}`}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.medicationName}>{medication.name || 'Unnamed Medication'}</Text>
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
                          {medication.dosage && (
                            <Text style={styles.medicationDetail}>Dosage: <Text style={{ fontWeight: 'bold' }}>{medication.dosage}</Text></Text>
                          )}
                          {medication.frequency && (
                            <Text style={[styles.medicationDetail, { marginLeft: 16 }]}>Frequency: <Text style={{ fontWeight: 'bold' }}>{medication.frequency}</Text></Text>
                          )}
                        </View>
                        <Text style={styles.medicationDetail}>
                          {medication.days_remaining > 0 || medication.days_remaining === null
                            ? `${medication.days_remaining ?? '?'} day${medication.days_remaining === 1 ? '' : 's'} left`
                            : 'Course complete'}
                        </Text>
                        {(medication.days_remaining === null || medication.days_remaining > 0) && (
                          <>
                            {/* Show last missed dose */}
                            {(() => {
                              const lastMissedTime = getLastMissedDoseTime(medication.reminder_times, logs, medication.medication_id, medication.frequency || 1);
                              return lastMissedTime ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                  <Ionicons name="close-circle" size={16} color={COLORS.error} style={{ marginRight: 4 }} />
                                  <Text style={[styles.medicationDetail, { color: COLORS.error }]}>
                                    Last missed: <Text style={{ fontWeight: 'bold' }}>{lastMissedTime}</Text>
                                  </Text>
                                </View>
                              ) : null;
                            })()}
                            
                            {/* Show next dose */}
                            <Text style={[styles.medicationDetail, { marginBottom: 4 }]}>
                              Next dose: <Text style={{ fontWeight: 'bold' }}>{getNextDoseTime(medication.reminder_times, logs, medication.medication_id, medication.days_remaining, medication.frequency || 1)}</Text>
                            </Text>
                          </>
                        )}
                        <View style={styles.cardActionsRow}>
                          <TouchableOpacity
                            onPress={() => handleMarkAsTaken(medication, progress.nextDose)}
                            style={[styles.cardActionBtn, { backgroundColor: COLORS.primary }, progress.allTaken && { backgroundColor: '#b7e4c7' }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Mark ${medication.name} as taken`}
                            disabled={progress.allTaken || !progress.nextDose || medication.days_remaining === 0}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="checkmark-done" size={20} color="#fff" />
                              <Text style={[styles.cardActionText, progress.allTaken && { color: COLORS.white }, { marginLeft: 6 }]}>Taken</Text>
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleEdit(medication)}
                            style={[styles.cardActionBtn, { backgroundColor: COLORS.primary }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${medication.name}`}
                          >
                            <Ionicons name="create-outline" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
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
          <Text style={styles.actionText}>Add Prescription</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={showAddModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.centeredModalContent}>
            <MultiStepPrescriptionModal profileId={profile.id} accessToken={accessToken} mealTimes={mealTimes} onSuccess={() => {
              setShowAddModal(false);
              // Refresh medications list
              (async () => {
                console.log('Refreshing medications after adding prescription...');
                setLoading(true);
                setError(null);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !profile.id) {
                  setError('User or profile not found');
                  setLoading(false);
                  return;
                }
                const { data, error } = await supabase
                  .from('medications')
                  .select('*, prescriptions:prescription_id (id, doctor_name, notes)')
                  .eq('profile_id', profile.id);
                console.log('Refresh result:', data, 'Error:', error);
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
                    .select('*, prescriptions:prescription_id (id, doctor_name, notes)')
                    .eq('profile_id', profile.id);
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
                profileId={profile.id}
              />
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Edit Prescription Modal */}
      <Modal
        visible={showEditPrescriptionModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditPrescriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPrescription && (
              <EditPrescriptionModalForm
                prescription={selectedPrescription}
                medications={selectedPrescription.medications}
                onSuccess={async () => {
                  setShowEditPrescriptionModal(false);
                  setSelectedPrescription(null);
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
                    .select('*, prescriptions:prescription_id (id, doctor_name, notes)')
                    .eq('profile_id', profile.id);
                  if (medsError) {
                    setError('Failed to fetch medications');
                    setMedications([]);
                  } else {
                    setMedications(meds || []);
                  }
                  setLoading(false);
                }}
                onCancel={() => {
                  setShowEditPrescriptionModal(false);
                  setSelectedPrescription(null);
                }}
                profileId={profile.id}
                mealTimes={mealTimes}
              />
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowEditPrescriptionModal(false)}>
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    color: COLORS.white,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    margin: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.white,
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
    justifyContent: 'center',
    alignItems: 'center',
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
  centeredModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 0,
    minHeight: 560,
    maxHeight: Platform.OS === 'ios' ? 700 : 640,
    width: '90%',
    maxWidth: 400,
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
  sectionHeader: {
    backgroundColor: '#e0f7fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionHeaderTitle: {
    fontWeight: 'bold',
    fontSize: 17,
    color: COLORS.primary,
  },
  sectionHeaderNotes: {
    color: '#555',
    fontStyle: 'italic',
    marginTop: 2,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionHeaderActionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  prescriptionContainer: {
    backgroundColor: '#f0f9f4',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  prescriptionHeader: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2d5a3d',
  },
  prescriptionHeaderContent: {
    flex: 1,
  },
  prescriptionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: COLORS.white,
    marginBottom: 4,
  },
  prescriptionNotes: {
    color: '#e8f5e8',
    fontStyle: 'italic',
    fontSize: 14,
  },
  prescriptionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  prescriptionActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  medicationsList: {
    padding: 12,
  },
}); 