-- Link prescriptions to appointments
-- This migration adds appointment_id to medications table

-- Add appointment_id column to medications table
ALTER TABLE medications ADD COLUMN appointment_id UUID;

-- Add foreign key constraint to appointments table
ALTER TABLE medications 
ADD CONSTRAINT fk_medications_appointment_id 
FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

-- Create index for faster queries by appointment_id
CREATE INDEX IF NOT EXISTS idx_medications_appointment_id ON medications(appointment_id);

-- Update RLS policy to allow reading medications by appointment_id
CREATE POLICY "Service role can read medications by appointment_id" ON medications
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        appointment_id IN (
            SELECT id FROM appointments WHERE profile_id IN (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        ) OR
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Note: This allows medications to be linked to appointments while maintaining
-- the existing profile_id relationship for medications added outside appointments 