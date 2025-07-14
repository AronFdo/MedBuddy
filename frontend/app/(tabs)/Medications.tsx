import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, Platform, TextInput, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

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

function AddMedicationModalForm() {
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

  // Placeholder upload handler
  const handleSave = async () => {
    if (!image) {
      setError('Please select an image.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      // TODO: Implement actual upload logic here
      // Example: await uploadImageToBackend(image);
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate upload
      // On success, close modal or show success (handled by parent)
    } catch (e) {
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
});

export default function Medications() {
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const fetchMedications = async () => {
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
    };
    fetchMedications();
  }, []);

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
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.medicationCard}>
              <Text style={styles.medicationName}>{item.name || 'Unnamed Medication'}</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
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
            <AddMedicationModalForm />
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowAddModal(false)}>
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
  },
  medicationName: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: 'bold',
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
}); 