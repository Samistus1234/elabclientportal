-- ============================================================
-- CLIENT PORTAL: client_documents table setup
-- Run this in Client Portal's SQL Editor (pvhwofaduoxirkroiblk)
-- ============================================================

-- Create client_documents table if not exists
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to Command Centre data
  case_id UUID,                    -- Command Centre case ID
  person_id UUID,                  -- Command Centre person ID
  case_reference TEXT,             -- Human-readable case reference

  -- Document details
  name TEXT NOT NULL,
  document_type TEXT,              -- passport, license, certificate, etc.
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,

  -- Status tracking
  status TEXT DEFAULT 'pending',   -- pending, approved, rejected, needs_revision
  reviewed_by TEXT,                -- Name of reviewer from Command Centre
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Metadata
  uploaded_by_user_id UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_client_documents_case_id ON client_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_person_id ON client_documents(person_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_case_reference ON client_documents(case_reference);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON client_documents(status);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded_by ON client_documents(uploaded_by_user_id);

-- Enable RLS
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own documents
CREATE POLICY IF NOT EXISTS "Users can view own documents"
  ON client_documents FOR SELECT
  USING (auth.uid() = uploaded_by_user_id);

-- Policy: Users can insert their own documents
CREATE POLICY IF NOT EXISTS "Users can insert own documents"
  ON client_documents FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by_user_id);

-- Policy: Users can update their own pending documents
CREATE POLICY IF NOT EXISTS "Users can update own pending documents"
  ON client_documents FOR UPDATE
  USING (auth.uid() = uploaded_by_user_id AND status = 'pending');

-- Policy: Service role can do everything (for API access)
CREATE POLICY IF NOT EXISTS "Service role full access"
  ON client_documents FOR ALL
  USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_client_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_documents_updated_at ON client_documents;
CREATE TRIGGER client_documents_updated_at
  BEFORE UPDATE ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_client_documents_updated_at();

-- ============================================================
-- Storage bucket setup (run only if bucket doesn't exist)
-- ============================================================

-- Create the storage bucket if it doesn't exist
-- Note: This might need to be done via the dashboard if it doesn't exist
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('client-documents', 'client-documents', false)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-documents bucket
-- Users can upload to their own folder
-- CREATE POLICY "Users can upload documents"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'client-documents' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Users can view their own documents
-- CREATE POLICY "Users can view own documents"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'client-documents' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
