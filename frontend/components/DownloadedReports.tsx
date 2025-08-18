import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Linking } from 'react-native';

const COLORS = {
  primary: '#307351',
  secondary: '#7BE0AD',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
  success: '#10B981',
};

interface DownloadedReport {
  name: string;
  uri: string;
  size: number;
  modificationTime: number;
}

interface DownloadedReportsProps {
  visible: boolean;
  onClose: () => void;
}

export default function DownloadedReports({ visible, onClose }: DownloadedReportsProps) {
  const [reports, setReports] = useState<DownloadedReport[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const documentsDir = FileSystem.documentDirectory;
      if (!documentsDir) {
        Alert.alert('Error', 'Could not access documents directory');
        return;
      }

      const files = await FileSystem.readDirectoryAsync(documentsDir);
      const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
      
      const reportPromises = pdfFiles.map(async (fileName) => {
        const fileUri = `${documentsDir}${fileName}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        
        return {
          name: fileName,
          uri: fileUri,
          size: fileInfo.size || 0,
          modificationTime: fileInfo.modificationTime || Date.now(),
        };
      });

      const reportList = await Promise.all(reportPromises);
      setReports(reportList.sort((a, b) => b.modificationTime - a.modificationTime));
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load downloaded reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadReports();
    }
  }, [visible]);

  const openReport = async (report: DownloadedReport) => {
    try {
      const supported = await Linking.canOpenURL(`file://${report.uri}`);
      if (supported) {
        await Linking.openURL(`file://${report.uri}`);
      } else {
        Alert.alert('Info', 'No PDF viewer app found on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open the report');
    }
  };

  const deleteReport = async (report: DownloadedReport) => {
    Alert.alert(
      'Delete Report',
      `Are you sure you want to delete "${report.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(report.uri);
              setReports(reports.filter(r => r.uri !== report.uri));
              Alert.alert('Success', 'Report deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete the report');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString() + ' ' + 
           new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderReport = ({ item }: { item: DownloadedReport }) => (
    <View style={styles.reportItem}>
      <View style={styles.reportInfo}>
        <Text style={styles.reportName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.reportDetails}>
          {formatFileSize(item.size)} • {formatDate(item.modificationTime)}
        </Text>
      </View>
      <View style={styles.reportActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.openButton]} 
          onPress={() => openReport(item)}
        >
          <Ionicons name="open-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => deleteReport(item)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Downloaded Reports</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="refresh" size={32} color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Downloaded Reports</Text>
            <Text style={styles.emptyText}>
              Reports you download from the Health Records section will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={reports}
            renderItem={renderReport}
            keyExtractor={(item) => item.uri}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  listContainer: {
    padding: 16,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
    marginRight: 12,
  },
  reportName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  reportDetails: {
    fontSize: 14,
    color: COLORS.gray,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  openButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: COLORS.error,
  },
});
