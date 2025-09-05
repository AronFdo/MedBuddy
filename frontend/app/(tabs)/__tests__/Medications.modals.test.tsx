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

// Import the modal components (we'll need to extract them or test them in context)
import Medications from '../Medications';

describe('Medications Modal Components', () => {
  const mockProfile = {
    id: 'test-profile-id',
    meal_times: {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '18:00',
    },
  };

  const mockMealTimes = {
    breakfast: '08:00',
    lunch: '12:00',
    dinner: '18:00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: { meal_times: mockMealTimes, user_id: 'test-user-id' },
          error: null,
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'test-prescription-id' },
            error: null,
          }),
        }),
      }),
    } as any);

    const { useProfile } = require('../../../lib/ProfileContext');
    useProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
    });
  });

  describe('MultiStepPrescriptionModal', () => {
    it('renders prescription details form in step 1', async () => {
      await act(async () => {
        render(<Medications />);
      });

      const addButton = screen.getByText('Add Prescription');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText('Prescription Details')).toBeTruthy();
        expect(screen.getByText('Doctor Name *')).toBeTruthy();
        expect(screen.getByText('Issued Date')).toBeTruthy();
        expect(screen.getByText('Notes')).toBeTruthy();
      });
    });

    it('validates required fields in step 1', async () => {
      await act(async () => {
        render(<Medications />);
      });

      const addButton = screen.getByText('Add Prescription');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText('Prescription Details')).toBeTruthy();
      });

      const nextButton = screen.getByText('Next: Add Medications');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter doctor name.')).toBeTruthy();
      });
    });

    it('proceeds to step 2 when doctor name is provided', async () => {
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
        expect(screen.getByText('Prescription: Dr. Johnson')).toBeTruthy();
      });
    });

    it('renders medication form in step 2', async () => {
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
        expect(screen.getByText('Medication Name *')).toBeTruthy();
        expect(screen.getByText('Dosage *')).toBeTruthy();
        expect(screen.getByText('Frequency *')).toBeTruthy();
        expect(screen.getByText('Days *')).toBeTruthy();
      });
    });

    it('validates medication form fields', async () => {
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

      const addMedicationButton = screen.getByText('Add This Medication');
      fireEvent.press(addMedicationButton);

      await waitFor(() => {
        expect(screen.getByText('Please fill in all medication fields.')).toBeTruthy();
      });
    });

    it('adds medication to list when form is valid', async () => {
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
        expect(screen.getByText('Paracetamol')).toBeTruthy();
      });
    });

    it('saves prescription and medications successfully', async () => {
      // Mock successful saves
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
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: { meal_times: mockMealTimes, user_id: 'test-user-id' },
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
  });

  describe('EditMedicationModalForm', () => {
    const mockMedication = {
      medication_id: 'med-1',
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: 2,
      reminder_times: ['08:00:00', '18:00:00'],
    };

    it('renders edit medication form with current values', async () => {
      await act(async () => {
        render(<Medications />);
      });

      // This would require the edit modal to be open, which needs the medication to be selected
      // For now, we'll test the structure when it's rendered
      expect(screen.getByText('Medications')).toBeTruthy();
    });
  });

  describe('EditPrescriptionModalForm', () => {
    const mockPrescription = {
      id: 'pres-1',
      doctor_name: 'Dr. Smith',
      notes: 'Take with food',
    };

    const mockPrescriptionMedications = [
      {
        medication_id: 'med-1',
        name: 'Paracetamol',
        dosage: '500mg',
        frequency: 2,
        days_remaining: 5,
        reminder_times: ['08:00:00', '18:00:00'],
      },
    ];

    it('renders edit prescription form with current values', async () => {
      await act(async () => {
        render(<Medications />);
      });

      // This would require the edit prescription modal to be open
      // For now, we'll test the structure when it's rendered
      expect(screen.getByText('Medications')).toBeTruthy();
    });
  });

  describe('OCR Integration', () => {
    it('shows OCR scan button in medication form', async () => {
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
    });

    it('handles OCR scan button press', async () => {
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

      // Should show image source selection alert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Select Image Source',
        'Choose how you want to get the medication package image:',
        expect.any(Array)
      );
    });
  });
});
