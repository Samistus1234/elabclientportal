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
  org_id?: string
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

    // Step 0: Get or create default org FIRST (needed for pipeline)
    let orgId = case_data.org_id
    if (!orgId) {
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single()

      if (existingOrg) {
        orgId = existingOrg.id
      } else {
        const { data: newOrg } = await supabase
          .from('organizations')
          .insert({ name: 'Default Organization', slug: 'default' })
          .select('id')
          .single()

        if (newOrg) {
          orgId = newOrg.id
        }
      }
    }
    console.log('Using org_id:', orgId)

    // Step 1: Ensure pipeline exists (with org_id)
    let syncedPipeline = null
    const targetPipelineId = pipeline?.id || case_data.pipeline_id

    console.log('=== PIPELINE SYNC DEBUG ===')
    console.log('pipeline object:', JSON.stringify(pipeline))
    console.log('case_data.pipeline_id:', case_data.pipeline_id)
    console.log('targetPipelineId:', targetPipelineId)

    if (targetPipelineId) {
      // Check if pipeline already exists
      const { data: existingPipeline } = await supabase
        .from('pipelines')
        .select('id, name, slug, org_id')
        .eq('id', targetPipelineId)
        .single()

      if (existingPipeline) {
        console.log('Existing pipeline found:', existingPipeline)
        // Update if we have new pipeline data
        if (pipeline) {
          const { data: updated, error: updateError } = await supabase
            .from('pipelines')
            .update({ name: pipeline.name, slug: pipeline.slug })
            .eq('id', targetPipelineId)
            .select()
            .single()

          if (updateError) {
            console.error('Pipeline update error:', updateError)
          } else {
            syncedPipeline = updated
            console.log('Pipeline updated:', syncedPipeline)
          }
        } else {
          syncedPipeline = existingPipeline
        }
      } else if (pipeline) {
        // Pipeline doesn't exist, insert it
        // IMPORTANT: Use targetPipelineId (not pipeline.id) to ensure consistency
        console.log('Creating new pipeline with ID:', targetPipelineId, 'name:', pipeline.name)
        const { data: newPipeline, error: insertError } = await supabase
          .from('pipelines')
          .insert({
            id: targetPipelineId,
            name: pipeline.name,
            slug: pipeline.slug,
            org_id: orgId,
          })
          .select()
          .single()

        if (insertError) {
          console.error('Pipeline insert error:', insertError)
          return new Response(
            JSON.stringify({ error: 'Failed to create pipeline', details: insertError }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!newPipeline) {
          console.error('Pipeline insert returned no data!')
          return new Response(
            JSON.stringify({ error: 'Failed to create pipeline', details: 'Insert returned no data' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        syncedPipeline = newPipeline
        console.log('Pipeline created successfully:', JSON.stringify(syncedPipeline))
      } else {
        // No pipeline data provided and pipeline doesn't exist
        return new Response(
          JSON.stringify({
            error: 'Pipeline not found',
            details: `Pipeline ${targetPipelineId} does not exist and no pipeline data was provided to create it`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify pipeline exists before proceeding
      console.log('Verifying pipeline exists with ID:', targetPipelineId)
      const { data: verifyPipeline, error: verifyError } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('id', targetPipelineId)
        .single()

      console.log('Verification result:', JSON.stringify(verifyPipeline), 'error:', JSON.stringify(verifyError))

      if (!verifyPipeline) {
        return new Response(
          JSON.stringify({ error: 'Pipeline verification failed', details: `Pipeline ${targetPipelineId} still does not exist after sync attempt`, verifyError }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('Pipeline VERIFIED:', verifyPipeline.id, verifyPipeline.name)
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

    // Step 5: Upsert case (org_id already obtained in Step 0)
    // Use targetPipelineId (the one we verified exists) instead of case_data.pipeline_id
    const finalPipelineId = targetPipelineId || case_data.pipeline_id
    console.log('Case upsert - using pipeline_id:', finalPipelineId)
    console.log('case_data.pipeline_id was:', case_data.pipeline_id)
    console.log('targetPipelineId was:', targetPipelineId)

    const { error: caseError } = await supabase
      .from('cases')
      .upsert({
        id: case_data.id,
        case_reference: case_data.case_reference,
        person_id: personId,
        org_id: orgId,
        pipeline_id: finalPipelineId,
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
        case_id: case_data.id,
        pipeline: syncedPipeline,
        org_id: orgId
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
