-- ============================================
-- ADD STATUS COLUMN TO DOCUMENTS TABLE
-- ============================================
-- This migration adds a status field to track document review status
-- Status values: 'received', 'under_review', 'approved', 'rejected', 'expired'
-- ============================================

-- Add status column with default value
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS status character varying NOT NULL DEFAULT 'received'
CHECK (status IN ('received', 'under_review', 'approved', 'rejected', 'expired'));

-- Add columns to track who changed the status and when
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS status_changed_by uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_status_current ON public.documents(status, is_current) WHERE is_current = true;

-- Add comment to explain the status field
COMMENT ON COLUMN public.documents.status IS 'Document review status: received (just uploaded), under_review (being reviewed), approved (accepted), rejected (not accepted), expired (past expiration date)';

-- ============================================
-- UPDATE EXISTING DOCUMENTS BASED ON CURRENT STATE
-- ============================================
-- Set status to 'expired' for documents that are already expired
UPDATE public.documents 
SET status = 'expired'
WHERE expires_at IS NOT NULL 
  AND expires_at < NOW()
  AND status = 'received';

-- Set status to 'expired' for documents marked as expired
UPDATE public.documents 
SET status = 'expired'
WHERE marked_expired_at IS NOT NULL
  AND status != 'expired';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration:
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'status';
--
-- SELECT status, COUNT(*) as count 
-- FROM public.documents 
-- GROUP BY status;

