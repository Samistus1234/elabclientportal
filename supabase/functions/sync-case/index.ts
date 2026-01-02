import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PersonData {
  id?: string
  email: string
  primary_email?: string
  first_name?: string
  last_name?: string
  phone?: string
}

interface PipelineData {
  id: string
  name: string
  slug: string
}

interface StageData {
  id: string
  name: string
  slug: string
  order_index: number
  pipeline_id: string
}

interface CaseData {
  id: string
  case_reference: string
  status: string
  priority: string
  pipeline_id: string
  current_stage_id: string
  start_date?: string
  metadata?: Record<string, any>
}

interface SyncPayload {
  person: PersonData
  case_data: CaseData
  pipeline?: PipelineData
  stages?: StageData[]
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify API key from Command Center (check both possible secret names)
    const apiKey = req.headers.get('x-api-key')
    const expectedApiKey = Deno.env.get('SYNC_API_KEY') || Deno.env.get('SYNC_SECRET_KEY')

    if (!expectedApiKey || apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: SyncPayload = await req.json()
    const { person, case_data, pipeline, stages } = payload

    // Validate required fields
    if (!person?.email || !case_data?.id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: person.email and case_data.id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Upsert pipeline if provided
    if (pipeline) {
      const { error: pipelineError } = await supabase
        .from('pipelines')
        .upsert({
          id: pipeline.id,
          name: pipeline.name,
          slug: pipeline.slug,
        }, { onConflict: 'id' })

      if (pipelineError) {
        console.error('Pipeline upsert error:', pipelineError)
      }
    }

    // Step 2: Upsert stages if provided
    if (stages && stages.length > 0) {
      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .upsert(stages.map(s => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          order_index: s.order_index,
          pipeline_id: s.pipeline_id,
        })), { onConflict: 'id' })

      if (stagesError) {
        console.error('Stages upsert error:', stagesError)
      }
    }

    // Step 3: Upsert person
    const { data: existingPerson } = await supabase
      .from('persons')
      .select('id, auth_user_id')
      .or(`email.eq.${person.email},primary_email.eq.${person.email}`)
      .limit(1)
      .single()

    let personId: string

    if (existingPerson) {
      // Update existing person
      personId = existingPerson.id
      const { error: updateError } = await supabase
        .from('persons')
        .update({
          first_name: person.first_name,
          last_name: person.last_name,
          primary_email: person.primary_email || person.email,
          phone: person.phone,
        })
        .eq('id', personId)

      if (updateError) {
        console.error('Person update error:', updateError)
      }
    } else {
      // Create new person
      const { data: newPerson, error: insertError } = await supabase
        .from('persons')
        .insert({
          id: person.id || undefined, // Let DB generate if not provided
          email: person.email,
          primary_email: person.primary_email || person.email,
          first_name: person.first_name,
          last_name: person.last_name,
          phone: person.phone,
        })
        .select('id')
        .single()

      if (insertError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create person', details: insertError }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      personId = newPerson.id
    }

    // Step 4: Link to auth user if exists (by email)
    const { data: authUser } = await supabase.auth.admin.listUsers()
    const matchingAuthUser = authUser?.users?.find(
      u => u.email?.toLowerCase() === person.email.toLowerCase()
    )

    if (matchingAuthUser) {
      await supabase
        .from('persons')
        .update({ auth_user_id: matchingAuthUser.id })
        .eq('id', personId)
    }

    // Step 5: Upsert case
    const { error: caseError } = await supabase
      .from('cases')
      .upsert({
        id: case_data.id,
        case_reference: case_data.case_reference,
        person_id: personId,
        pipeline_id: case_data.pipeline_id,
        current_stage_id: case_data.current_stage_id,
        status: case_data.status,
        priority: case_data.priority,
        start_date: case_data.start_date,
        metadata: case_data.metadata || {},
      }, { onConflict: 'id' })

    if (caseError) {
      return new Response(
        JSON.stringify({ error: 'Failed to sync case', details: caseError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Case synced successfully',
        person_id: personId,
        case_id: case_data.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
