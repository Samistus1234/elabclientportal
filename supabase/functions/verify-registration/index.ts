import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Command Centre verification endpoint
const COMMAND_CENTRE_URL = 'https://fwmhfwprvqaovidykaqt.supabase.co/functions/v1/verify-case-access';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the API key from environment (set in Supabase secrets)
    const apiKey = Deno.env.get('COMMAND_CENTRE_API_KEY');

    if (!apiKey) {
      console.error('COMMAND_CENTRE_API_KEY not configured');
      return new Response(
        JSON.stringify({ valid: false, error: 'Service temporarily unavailable' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Parse request body
    const { case_reference, email } = await req.json();

    if (!case_reference || !email) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing case reference or email' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Call Command Centre verification API
    const response = await fetch(COMMAND_CENTRE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        case_reference: case_reference.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
      }),
    });

    const data = await response.json();

    // Return the response from Command Centre
    return new Response(
      JSON.stringify(data),
      {
        status: response.ok ? 200 : response.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Verification service unavailable' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
