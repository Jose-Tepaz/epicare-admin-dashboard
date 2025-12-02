-- ============================================
-- CREATE DOCUMENT_REQUESTS TABLE
-- ============================================
-- This migration creates the document_requests table for managing
-- document requests from admins/agents to clients
-- ============================================

-- Create document_requests table
CREATE TABLE IF NOT EXISTS public.document_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  application_id uuid NULL,
  requested_by uuid NOT NULL,
  document_type character varying NOT NULL,
  priority character varying NOT NULL DEFAULT 'medium',
  status character varying NOT NULL DEFAULT 'pending',
  due_date timestamp with time zone NULL,
  notes text NULL,
  fulfilled_at timestamp with time zone NULL,
  fulfilled_by uuid NULL,
  document_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT document_requests_pkey PRIMARY KEY (id),
  CONSTRAINT document_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT document_requests_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE SET NULL,
  CONSTRAINT document_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT document_requests_fulfilled_by_fkey FOREIGN KEY (fulfilled_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT document_requests_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL,
  
  -- Check constraints for valid values
  CONSTRAINT document_requests_document_type_check CHECK (document_type IN ('medical', 'identification', 'financial', 'property', 'other')),
  CONSTRAINT document_requests_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT document_requests_status_check CHECK (status IN ('pending', 'fulfilled', 'expired', 'cancelled'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_document_requests_client_id ON public.document_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON public.document_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_requested_by ON public.document_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_document_requests_application_id ON public.document_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_document_id ON public.document_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_created_at ON public.document_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_requests_status_client ON public.document_requests(status, client_id) WHERE status = 'pending';

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_requests_timestamp
BEFORE UPDATE ON public.document_requests
FOR EACH ROW
EXECUTE FUNCTION update_document_requests_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.document_requests IS 'Stores document requests from admins/agents to clients';
COMMENT ON COLUMN public.document_requests.client_id IS 'The client who needs to upload the document';
COMMENT ON COLUMN public.document_requests.application_id IS 'Optional: related application';
COMMENT ON COLUMN public.document_requests.requested_by IS 'Admin/agent who requested the document';
COMMENT ON COLUMN public.document_requests.document_type IS 'Type of document requested: medical, identification, financial, property, other';
COMMENT ON COLUMN public.document_requests.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN public.document_requests.status IS 'Request status: pending, fulfilled, expired, cancelled';
COMMENT ON COLUMN public.document_requests.due_date IS 'Optional deadline for document submission';
COMMENT ON COLUMN public.document_requests.notes IS 'Additional instructions or requirements';
COMMENT ON COLUMN public.document_requests.fulfilled_at IS 'Timestamp when the request was fulfilled';
COMMENT ON COLUMN public.document_requests.fulfilled_by IS 'User who fulfilled the request (usually the client)';
COMMENT ON COLUMN public.document_requests.document_id IS 'Link to the uploaded document that fulfills this request';

-- ============================================
-- VERIFICATION QUERIES (commented out)
-- ============================================
-- Verify table was created:
-- SELECT * FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_requests';

-- Verify indexes:
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'document_requests';

-- Verify constraints:
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'public.document_requests'::regclass;

