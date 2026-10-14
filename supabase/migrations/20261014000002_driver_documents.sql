-- ==============================================================================
-- MIGRATION 20261014000002: DRIVER DOCUMENTS & SECURE STORAGE
-- Target: PostgreSQL / Supabase
-- Purpose: UU PDP Compliance for Driver PII (KTP, SIM, STNK, SKCK)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.driver_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('ktp', 'sim', 'stnk', 'skck', 'vehicle_photo')),
    file_path TEXT NOT NULL, -- Relative path inside private bucket 'driver-documents'
    file_name TEXT,
    file_size_bytes BIGINT,
    mime_type TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    rejection_reason TEXT,
    verified_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_driver_document_type UNIQUE (driver_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_driver_docs_driver_id ON public.driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_docs_status ON public.driver_documents(status);

-- Note: In Supabase Storage, the bucket 'driver-documents' MUST be set to PRIVATE.
-- Access is granted strictly via Signed URLs generated on-demand by authenticated admins.
