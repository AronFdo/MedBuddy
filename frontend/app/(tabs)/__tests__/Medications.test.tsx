import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Medications from '../Medications';
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

describe('Medications Component', () => {
  const mockProfile = {
    id: 'test-profile-id',
    meal_times: {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '18:00',
    },
  };

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
    {
      medication_id: 'med-2',
      name: 'Ibuprofen',
      dosage: '200mg',
      frequency: 3,
      days_remaining: 0,
      reminder_times: ['08:00:00', '12:00:00', '18:00:00'],
      prescription_id: null,
      prescriptions: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockMedications,
          error: null,
        }),
      }),
    } as any);

    // Mock ProfileContext
    const { useProfile } = require('../../../lib/ProfileContext');
    useProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
    });
  });

  describe('Component Rendering', () => {
    it('renders the medications screen with header', async () => {
      await act(async () => {
        render(<Medications />);
      });

      expect(screen.getByText('Medications')).toBeTruthy();
      expect(screen.getByText('Ongoing')).toBeTruthy();
      expect(screen.getByText('Past')).toBeTruthy();
    });

    it('shows loading state initially', () => {
      const { useProfile } = require('../../../lib/ProfileContext');
      useProfile.mockReturnValue({
        profile: null,
        loading: true,
      });

      render(<Medications />);
      // Loading indicator should be present
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });

    it('shows no profile message when no profile is selected', () => {
      const { useProfile } = require('../../../lib/ProfileContext');
      useProfile.mockReturnValue({
        profile: null,
        loading: false,
      });

      render(<Medications />);
      expect(screen.getByText('No profile selected. Please create or select a profile in the Profile tab.')).toBeTruthy();
    });

    it('displays medications grouped by prescription', async () => {
      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(screen.getByText('Dr. Smith')).toBeTruthy();
        expect(screen.getByText('Paracetamol')).toBeTruthy();
        expect(screen.getByText('Ibuprofen')).toBeTruthy();
      });
    });

    it('shows empty state when no medications exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as any);

      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(screen.getByText('No ongoing medications. Add some!')).toBeTruthy();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches between Ongoing and Past tabs', async () => {
      await act(async () => {
        render(<Medications />);
      });

      const pastTab = screen.getByText('Past');
      fireEvent.press(pastTab);

      await waitFor(() => {
        expect(screen.getByText('No past medications found.')).toBeTruthy();
      });
    });
  });

  describe('Add Prescription Modal', () => {
    it('opens add prescription modal when add button is pressed', async () => {
      await act(async () => {
        render(<Medications />);
      });

      const addButton = screen.getByText('Add Prescription');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText('Prescription Details')).toBeTruthy();
      });
    });

    it('closes modal when close button is pressed', async () => {
      await act(async () => {
        render(<Medications />);
      });

      const addButton = screen.getByText('Add Prescription');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText('Prescription Details')).toBeTruthy();
      });

      const closeButton = screen.getByTestId('close-button');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Prescription Details')).toBeNull();
      });
    });
  });

  describe('Medication Actions', () => {
    it('marks medication as taken when taken button is pressed', async () => {
      // Mock successful log insertion
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'medication_logs') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockMedications,
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

    it('opens edit modal when edit button is pressed', async () => {
      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(screen.getByText('Paracetamol')).toBeTruthy();
      });

      const editButton = screen.getByTestId('edit-button');
      fireEvent.press(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Medication')).toBeTruthy();
      });
    });
  });

  describe('Prescription Management', () => {
    it('opens edit prescription modal when edit prescription button is pressed', async () => {
      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(screen.getByText('Dr. Smith')).toBeTruthy();
      });

      const editPrescriptionButton = screen.getByTestId('edit-prescription-button');
      fireEvent.press(editPrescriptionButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Prescription')).toBeTruthy();
      });
    });

    it('shows delete confirmation when delete prescription button is pressed', async () => {
      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(screen.getByText('Dr. Smith')).toBeTruthy();
      });

      const deleteButton = screen.getByTestId('delete-prescription-button');
      fireEvent.press(deleteButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Prescription',
        expect.stringContaining('Are you sure you want to delete the prescription from Dr. Smith?'),
        expect.any(Array)
      );
    });
  });

  describe('Error Handling', () => {
    it('displays error message when medication fetch fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Failed to fetch medications' },
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

    it('handles authentication errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      await act(async () => {
        render(<Medications />);
      });

      // Should still render the component but handle the error
      expect(screen.getByText('Medications')).toBeTruthy();
    });
  });

  describe('OCR Functionality', () => {
    it('shows OCR scan button in add medication modal', async () => {
      await act(async () => {
        render(<Medications />);
      });

      const addButton = screen.getByText('Add Prescription');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText('Prescription Details')).toBeTruthy();
      });

      // Go to step 2 (add medications)
      const nextButton = screen.getByText('Next: Add Medications');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Extract from Package')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels for medication cards', async () => {
      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Medication card for Paracetamol')).toBeTruthy();
      });
    });

    it('has proper accessibility labels for action buttons', async () => {
      await act(async () => {
        render(<Medications />);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Mark Paracetamol as taken')).toBeTruthy();
        expect(screen.getByLabelText('Edit Paracetamol')).toBeTruthy();
      });
    });
  });
});

