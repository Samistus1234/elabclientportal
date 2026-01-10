// ============================================================
// CLIENT PORTAL: client-documents-api
// Deploy this to Client Portal project (pvhwofaduoxirkroiblk)
//
// Command to deploy:
// supabase functions deploy client-documents-api --no-verify-jwt --project-ref pvhwofaduoxirkroiblk
// ============================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key from Command Centre
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    const expectedApiKey = Deno.env.get('SYNC_API_KEY');

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('[Client Documents API] Invalid API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create Supabase client for Client Portal database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    ) as any;

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Route based on action
    switch (action) {
      case 'list': {
        // List documents for a case or person
        const caseId = url.searchParams.get('case_id');
        const personId = url.searchParams.get('person_id');
        const caseReference = url.searchParams.get('case_reference');
        const email = url.searchParams.get('email');

        let query = supabase
          .from('client_documents')
          .select('*')
          .order('uploaded_at', { ascending: false });

        if (caseId) {
          query = query.eq('case_id', caseId);
        } else if (caseReference) {
          query = query.eq('case_reference', caseReference);
        } else if (personId) {
          query = query.eq('person_id', personId);
        } else if (email) {
          // Look up person by email first, then get their documents
          const { data: person, error: personError } = await supabase
            .from('persons')
            .select('id')
            .ilike('primary_email', email)
            .single();

          if (personError || !person) {
            // No person found with this email - return empty array
            console.log(`[Client Documents API] No person found with email: ${email}`);
            return new Response(
              JSON.stringify({ documents: [] }),
              { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          query = query.eq('person_id', person.id);
        } else {
          return new Response(
            JSON.stringify({ error: 'Must provide case_id, person_id, case_reference, or email' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const { data: documents, error } = await query;

        if (error) {
          console.error('[Client Documents API] List error:', error);
          throw new Error(`Failed to list documents: ${error.message}`);
        }

        console.log(`[Client Documents API] Listed ${documents?.length || 0} documents`);

        return new Response(
          JSON.stringify({ documents: documents || [] }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      case 'download': {
        // Get signed URL for downloading a document
        const documentId = url.searchParams.get('document_id');

        if (!documentId) {
          return new Response(
            JSON.stringify({ error: 'document_id is required' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Get document details
        const { data: document, error: docError } = await supabase
          .from('client_documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (docError || !document) {
          return new Response(
            JSON.stringify({ error: 'Document not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Get signed URL from storage
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('client-documents')
          .createSignedUrl(document.storage_path, 3600); // 1 hour expiry

        if (urlError) {
          console.error('[Client Documents API] Signed URL error:', urlError);
          throw new Error(`Failed to create signed URL: ${urlError.message}`);
        }

        console.log(`[Client Documents API] Generated download URL for document: ${documentId}`);

        return new Response(
          JSON.stringify({
            document,
            download_url: signedUrlData.signedUrl,
            expires_in: 3600,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      case 'update_status': {
        // Update document status (approve/reject)
        const body = await req.json();
        const { document_id, status, reviewed_by, review_notes } = body;

        if (!document_id || !status) {
          return new Response(
            JSON.stringify({ error: 'document_id and status are required' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const validStatuses = ['pending', 'approved', 'rejected', 'needs_revision'];
        if (!validStatuses.includes(status)) {
          return new Response(
            JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const { data: updatedDoc, error: updateError } = await supabase
          .from('client_documents')
          .update({
            status,
            reviewed_by,
            review_notes,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', document_id)
          .select()
          .single();

        if (updateError) {
          console.error('[Client Documents API] Update error:', updateError);
          throw new Error(`Failed to update document: ${updateError.message}`);
        }

        console.log(`[Client Documents API] Updated document ${document_id} to status: ${status}`);

        return new Response(
          JSON.stringify({ success: true, document: updatedDoc }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      case 'delete': {
        // Delete a document (both from storage and database)
        const body = await req.json();
        const { document_id, deleted_by } = body;

        if (!document_id) {
          return new Response(
            JSON.stringify({ error: 'document_id is required' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Get document details first
        const { data: document, error: docError } = await supabase
          .from('client_documents')
          .select('*')
          .eq('id', document_id)
          .single();

        if (docError || !document) {
          return new Response(
            JSON.stringify({ error: 'Document not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('client-documents')
          .remove([document.storage_path]);

        if (storageError) {
          console.error('[Client Documents API] Storage delete error:', storageError);
          // Continue anyway - file might already be deleted
        }

        // Delete from database
        const { error: deleteError } = await supabase
          .from('client_documents')
          .delete()
          .eq('id', document_id);

        if (deleteError) {
          console.error('[Client Documents API] Delete error:', deleteError);
          throw new Error(`Failed to delete document: ${deleteError.message}`);
        }

        console.log(`[Client Documents API] Deleted document: ${document_id} by ${deleted_by}`);

        return new Response(
          JSON.stringify({ success: true, message: 'Document deleted' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            error: 'Invalid action',
            valid_actions: ['list', 'download', 'update_status', 'delete'],
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
    }

  } catch (error: any) {
    console.error('[Client Documents API] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
