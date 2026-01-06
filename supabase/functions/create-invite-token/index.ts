import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    const expectedApiKey = Deno.env.get('SYNC_API_KEY');

    if (!apiKey || apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    ) as any;

    // Parse request body
    const {
      token,
      email,
      person_id,
      case_id,
      first_name,
      last_name,
      case_reference,
      pipeline_name,
      expires_at
    } = await req.json();

    // Validate required fields
    if (!token || !email) {
      throw new Error('Missing required fields: token and email');
    }

    // Check for existing unused token for this email
    const { data: existingToken } = await supabase
      .from('invite_tokens')
      .select('id, used_at')
      .eq('email', email.toLowerCase().trim())
      .is('used_at', null)
      .single();

    if (existingToken) {
      // Update existing token
      const { error: updateError } = await supabase
        .from('invite_tokens')
        .update({
          token,
          person_id,
          case_id,
          first_name,
          last_name,
          case_reference,
          pipeline_name,
          expires_at,
        })
        .eq('id', existingToken.id);

      if (updateError) {
        throw new Error(`Failed to update invite token: ${updateError.message}`);
      }

      console.log(`Updated invite token for ${email}`);
    } else {
      // Insert new token
      const { error: insertError } = await supabase
        .from('invite_tokens')
        .insert({
          token,
          email: email.toLowerCase().trim(),
          person_id,
          case_id,
          first_name,
          last_name,
          case_reference,
          pipeline_name,
          expires_at,
        });

      if (insertError) {
        throw new Error(`Failed to create invite token: ${insertError.message}`);
      }

      console.log(`Created invite token for ${email}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invite token created for ${email}`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error creating invite token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
