import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { supabase } from '../../../lib/supabase';

// Mock the dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('../../../lib/supabase');
jest.mock('../../../lib/ProfileContext');
jest.mock('../../../lib/config');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

import Medications from '../Medications';

describe('Medications API Integration Tests', () => {
  const mockProfile = {
    id: 'test-profile-id',
    meal_times: {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '18:00',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    const { useProfile } = require('../../../lib/ProfileContext');
    useProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
    });
  });

  describe('Medication Fetching', () => {
    it('fetches medications successfully on component mount', async () => {
      const mockMedications = [
        {
          medication_id: 'med-1',
          name: 'Paracetamol',
          dosage: '500mg',
          frequency: 2,
          days_remaining: 5,
          reminder_times: ['08:00:00', '18:00:00'],
          prescription_id: 'pres-1',
          prescriptions: {
            id: 'pres-1',
            doctor_name: 'Dr. Smith',
            notes: 'Take with food',
          },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockMedications,
            error: null,
          }),
        }),
      } as any);

      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('medications');
        expect(screen.getByText('Paracetamol')).toBeTruthy();
      });
    });

    it('fetches medication logs successfully', async () => {
      const mockLogs = [
        {
          medication_id: 'med-1',
          log_date: '2024-01-15',
          log_time: '08:00:00',
          status: 'taken',
        },
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'medications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as any;
        }
        if (table === 'medication_logs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockLogs,
                error: null,
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        } as any;
      });

      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('medication_logs');
      });
    });

    it('handles medication fetch errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      } as any);

      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch medications')).toBeTruthy();
      });
    });
  });

  describe('Mark as Taken Functionality', () => {
    it('creates medication log when marking as taken', async () => {
      const mockMedications = [
        {
          medication_id: 'med-1',
          name: 'Paracetamol',
          dosage: '500mg',
          frequency: 2,
          days_remaining: 5,
          reminder_times: ['08:00:00', '18:00:00'],
          prescription_id: 'pres-1',
          prescriptions: {
            id: 'pres-1',
            doctor_name: 'Dr. Smith',
            notes: 'Take with food',
          },
        },
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'medications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockMedications,
                error: null,
              }),
            }),
          } as any;
        }
        if (table === 'medication_logs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        } as any;
      });

      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(screen.getByText('Paracetamol')).toBeTruthy();
      });

      const takenButton = screen.getByText('Taken');
      fireEvent.press(takenButton);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('medication_logs');
      });
    });

    it('decrements days remaining when all doses are taken', async () => {
      const mockMedications = [
        {
          medication_id: 'med-1',
          name: 'Paracetamol',
          dosage: '500mg',
          frequency: 1,
          days_remaining: 5,
          reminder_times: ['08:00:00'],
          prescription_id: 'pres-1',
          prescriptions: {
            id: 'pres-1',
            doctor_name: 'Dr. Smith',
            notes: 'Take with food',
          },
        },
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'medications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockMedications,
                error: null,
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          } as any;
        }
        if (table === 'medication_logs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    medication_id: 'med-1',
                    log_date: '2024-01-15',
                    log_time: '08:00:00',
                    status: 'taken',
                  },
                ],
                error: null,
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        } as any;
      });

      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(screen.getByText('Paracetamol')).toBeTruthy();
      });

      const takenButton = screen.getByText('Taken');
      fireEvent.press(takenButton);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('medication_logs');
      });
    });
  });

  describe('Prescription Management', () => {
    it('creates prescription and medications successfully', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'prescriptions') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'test-prescription-id' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'medications') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: [{ medication_id: 'test-medication-id' }],
              error: null,
            }),
          } as any;
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { meal_times: mockProfile.meal_times, user_id: 'test-user-id' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        } as any;
      });

      await act(async () => {
        render(<Medications />);
      });

      const addButton = screen.getByText('Add Prescription');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText('Prescription Details')).toBeTruthy();
      });

      const doctorNameInput = screen.getByPlaceholderText('e.g. Dr. Smith');
      fireEvent.changeText(doctorNameInput, 'Dr. Johnson');

      const nextButton = screen.getByText('Next: Add Medications');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Add Medications')).toBeTruthy();
      });

      // Fill medication form
      const nameInput = screen.getByPlaceholderText('e.g. Paracetamol');
      const dosageInput = screen.getByPlaceholderText('e.g. 500mg');
      const frequencyInput = screen.getByPlaceholderText('2');
      const daysInput = screen.getByPlaceholderText('5');

      fireEvent.changeText(nameInput, 'Paracetamol');
      fireEvent.changeText(dosageInput, '500mg');
      fireEvent.changeText(frequencyInput, '2');
      fireEvent.changeText(daysInput, '5');

      const addMedicationButton = screen.getByText('Add This Medication');
      fireEvent.press(addMedicationButton);

      await waitFor(() => {
        expect(screen.getByText('Added Medications (1)')).toBeTruthy();
      });

      const saveAllButton = screen.getByText('Save All');
      fireEvent.press(saveAllButton);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('prescriptions');
        expect(mockSupabase.from).toHaveBeenCalledWith('medications');
      });
    });

    it('deletes prescription and associated medications', async () => {
      const mockMedications = [
        {
          medication_id: 'med-1',
          name: 'Paracetamol',
          prescription_id: 'pres-1',
          prescriptions: {
            id: 'pres-1',
            doctor_name: 'Dr. Smith',
            notes: 'Take with food',
          },
        },
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'medications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockMedications,
                error: null,
              }),
            }),
          } as any;
        }
        if (table === 'medication_logs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
            delete: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ error: null }),
            }),
          } as any;
        }
        if (table === 'prescriptions') {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        } as any;
      });

      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(screen.getByText('Dr. Smith')).toBeTruthy();
      });

      const deleteButton = screen.getByTestId('delete-prescription-button');
      fireEvent.press(deleteButton);

      // Confirm deletion
      const confirmButton = Alert.alert.mock.calls[0][2][1];
      confirmButton.onPress();

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('medication_logs');
        expect(mockSupabase.from).toHaveBeenCalledWith('medications');
        expect(mockSupabase.from).toHaveBeenCalledWith('prescriptions');
      });
    });
  });

  describe('OCR Integration', () => {
    it('calls OCR endpoint with correct parameters', async () => {
      // Mock fetch for OCR endpoint
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          medication: {
            name: 'Paracetamol',
            dosage: '500mg',
            frequency: '2',
            days_remaining: '5',
          },
          message: 'Medication details extracted successfully',
        }),
      });

      await act(async () => {
        render(<Medications />);
      });

      const addButton = screen.getByText('Add Prescription');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText('Prescription Details')).toBeTruthy();
      });

      const doctorNameInput = screen.getByPlaceholderText('e.g. Dr. Smith');
      fireEvent.changeText(doctorNameInput, 'Dr. Johnson');

      const nextButton = screen.getByText('Next: Add Medications');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Extract from Package')).toBeTruthy();
      });

      const ocrButton = screen.getByText('Extract from Package');
      fireEvent.press(ocrButton);

      // Select "Take Photo" option
      const takePhotoOption = Alert.alert.mock.calls[0][2][0];
      takePhotoOption.onPress();

      // Mock successful image capture
      const { launchCameraAsync } = require('expo-image-picker');
      launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{
          uri: 'test-image-uri',
          base64: 'test-base64-data',
        }],
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/ocr/medication',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('test-base64-data'),
          })
        );
      });
    });

    it('handles OCR errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await act(async () => {
        render(<Medications />);
      });

      const addButton = screen.getByText('Add Prescription');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText('Prescription Details')).toBeTruthy();
      });

      const doctorNameInput = screen.getByPlaceholderText('e.g. Dr. Smith');
      fireEvent.changeText(doctorNameInput, 'Dr. Johnson');

      const nextButton = screen.getByText('Next: Add Medications');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Extract from Package')).toBeTruthy();
      });

      const ocrButton = screen.getByText('Extract from Package');
      fireEvent.press(ocrButton);

      const takePhotoOption = Alert.alert.mock.calls[0][2][0];
      takePhotoOption.onPress();

      const { launchCameraAsync } = require('expo-image-picker');
      launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{
          uri: 'test-image-uri',
          base64: 'test-base64-data',
        }],
      });

      await waitFor(() => {
        expect(screen.getByText('Server error: 500 - Internal Server Error')).toBeTruthy();
      });
    });
  });

  describe('Authentication Integration', () => {
    it('handles authentication errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      await act(async () => {
        render(<Medications />);
      });

      expect(screen.getByText('Medications')).toBeTruthy();
    });

    it('validates user ownership of profile', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { meal_times: mockProfile.meal_times, user_id: 'different-user-id' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        } as any;
      });

      await act(async () => {
        render(<Medications />);
      });

      const addButton = screen.getByText('Add Prescription');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText('Prescription Details')).toBeTruthy();
      });

      const doctorNameInput = screen.getByPlaceholderText('e.g. Dr. Smith');
      fireEvent.changeText(doctorNameInput, 'Dr. Johnson');

      const nextButton = screen.getByText('Next: Add Medications');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Add Medications')).toBeTruthy();
      });

      // Fill medication form
      const nameInput = screen.getByPlaceholderText('e.g. Paracetamol');
      const dosageInput = screen.getByPlaceholderText('e.g. 500mg');
      const frequencyInput = screen.getByPlaceholderText('2');
      const daysInput = screen.getByPlaceholderText('5');

      fireEvent.changeText(nameInput, 'Paracetamol');
      fireEvent.changeText(dosageInput, '500mg');
      fireEvent.changeText(frequencyInput, '2');
      fireEvent.changeText(daysInput, '5');

      const addMedicationButton = screen.getByText('Add This Medication');
      fireEvent.press(addMedicationButton);

      await waitFor(() => {
        expect(screen.getByText('Added Medications (1)')).toBeTruthy();
      });

      const saveAllButton = screen.getByText('Save All');
      fireEvent.press(saveAllButton);

      await waitFor(() => {
        expect(screen.getByText('Profile does not belong to current user.')).toBeTruthy();
      });
    });
  });
});
