-- ============================================================
-- CLIENT PORTAL: service_requests table setup
-- Run this in Client Portal's SQL Editor (pvhwofaduoxirkroiblk)
-- ============================================================

-- Create service_requests table if not exists
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recruiter/requester info
  requester_user_id UUID REFERENCES auth.users(id),
  requester_name TEXT,
  requester_email TEXT,
  requester_type TEXT DEFAULT 'recruiter', -- recruiter, candidate, self

  -- Candidate info (the person the service is for)
  candidate_name TEXT NOT NULL,
  candidate_email TEXT,
  candidate_phone TEXT,

  -- Existing case reference (if applicable)
  related_case_id UUID,
  related_case_reference TEXT,
  related_pipeline_name TEXT, -- e.g., "Mumaris", "DataFlow"

  -- Service request details
  requested_service TEXT NOT NULL, -- e.g., "Prometric Exam Booking", "DataFlow Verification"
  service_category TEXT, -- exam, verification, licensing, tutorial, etc.
  urgency TEXT DEFAULT 'normal', -- low, normal, high, urgent

  -- Status tracking
  status TEXT DEFAULT 'pending', -- pending, reviewed, in_progress, completed, cancelled
  assigned_to TEXT, -- Name of ELAB staff handling the request

  -- Notes
  requester_notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_service_requests_requester ON service_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_service ON service_requests(requested_service);

-- Enable RLS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests
CREATE POLICY "Users can view own requests"
  ON service_requests FOR SELECT
  USING (auth.uid() = requester_user_id);

-- Policy: Users can insert their own requests
CREATE POLICY "Users can insert requests"
  ON service_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_user_id);

-- Policy: Service role can do everything (for API/admin access)
CREATE POLICY "Service role full access"
  ON service_requests FOR ALL
  USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_service_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_requests_updated_at ON service_requests;
CREATE TRIGGER service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_service_requests_updated_at();

-- ============================================================
-- RPC Function to create a service request
-- ============================================================

CREATE OR REPLACE FUNCTION create_service_request(
  p_candidate_name TEXT,
  p_candidate_email TEXT DEFAULT NULL,
  p_candidate_phone TEXT DEFAULT NULL,
  p_requested_service TEXT DEFAULT NULL,
  p_service_category TEXT DEFAULT NULL,
  p_related_case_id UUID DEFAULT NULL,
  p_related_case_reference TEXT DEFAULT NULL,
  p_related_pipeline_name TEXT DEFAULT NULL,
  p_urgency TEXT DEFAULT 'normal',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_user_name text;
  v_request_id uuid;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();

  -- Get user details from portal_users
  SELECT pu.full_name, au.email
  INTO v_user_name, v_user_email
  FROM portal_users pu
  JOIN auth.users au ON pu.auth_user_id = au.id
  WHERE pu.auth_user_id = v_user_id;

  -- Insert the request
  INSERT INTO service_requests (
    requester_user_id,
    requester_name,
    requester_email,
    requester_type,
    candidate_name,
    candidate_email,
    candidate_phone,
    related_case_id,
    related_case_reference,
    related_pipeline_name,
    requested_service,
    service_category,
    urgency,
    requester_notes,
    status
  ) VALUES (
    v_user_id,
    COALESCE(v_user_name, 'Unknown'),
    v_user_email,
    'recruiter',
    p_candidate_name,
    p_candidate_email,
    p_candidate_phone,
    p_related_case_id,
    p_related_case_reference,
    p_related_pipeline_name,
    p_requested_service,
    p_service_category,
    COALESCE(p_urgency, 'normal'),
    p_notes,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- ============================================================
-- RPC Function to get recruiter's service requests
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_service_requests()
RETURNS TABLE (
  out_id UUID,
  out_candidate_name TEXT,
  out_candidate_email TEXT,
  out_requested_service TEXT,
  out_service_category TEXT,
  out_related_case_reference TEXT,
  out_related_pipeline_name TEXT,
  out_urgency TEXT,
  out_status TEXT,
  out_requester_notes TEXT,
  out_admin_notes TEXT,
  out_assigned_to TEXT,
  out_created_at TIMESTAMPTZ,
  out_updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id as out_id,
    sr.candidate_name as out_candidate_name,
    sr.candidate_email as out_candidate_email,
    sr.requested_service as out_requested_service,
    sr.service_category as out_service_category,
    sr.related_case_reference as out_related_case_reference,
    sr.related_pipeline_name as out_related_pipeline_name,
    sr.urgency as out_urgency,
    sr.status as out_status,
    sr.requester_notes as out_requester_notes,
    sr.admin_notes as out_admin_notes,
    sr.assigned_to as out_assigned_to,
    sr.created_at as out_created_at,
    sr.updated_at as out_updated_at
  FROM service_requests sr
  WHERE sr.requester_user_id = auth.uid()
  ORDER BY sr.created_at DESC;
END;
$$;
