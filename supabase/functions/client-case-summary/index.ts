// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CaseData {
    id: string
    status: string
    metadata: Record<string, any>
    pipeline: { name: string; slug: string }
    current_stage: { name: string; slug: string }
    person: { first_name: string; last_name: string }
}

interface AISummary {
    summary: string
    nextSteps: string[]
    estimatedProgress: number
    alerts?: string[]
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { caseId } = await req.json()

        if (!caseId) {
            throw new Error('Case ID is required')
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Fetch case data
        const { data: caseData, error: caseError } = await supabase
            .from('cases')
            .select(`
        id,
        status,
        metadata,
        start_date,
        created_at,
        pipeline:pipelines(name, slug),
        current_stage:pipeline_stages!cases_current_stage_id_fkey(name, slug),
        person:persons(first_name, last_name)
      `)
            .eq('id', caseId)
            .single()

        if (caseError || !caseData) {
            throw new Error('Case not found')
        }

        // Fetch stage history for context
        const { data: stageHistory } = await supabase
            .from('case_stage_history')
            .select('created_at, to_stage:pipeline_stages!case_stage_history_to_stage_id_fkey(name)')
            .eq('case_id', caseId)
            .order('created_at', { ascending: true })

        // Fetch client-visible notes
        const { data: clientNotes } = await supabase
            .from('case_notes')
            .select('content, created_at')
            .eq('case_id', caseId)
            .eq('is_client_visible', true)
            .order('created_at', { ascending: false })
            .limit(3)

        // Build context for Gemini
        const context = buildContext(caseData, stageHistory || [], clientNotes || [])

        // Call Gemini API
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

        if (!geminiApiKey) {
            // Return fallback summary if no API key
            return new Response(
                JSON.stringify(generateFallbackSummary(caseData)),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a friendly customer service assistant for ELAB, a company that helps healthcare professionals with licensing and credential verification.

Based on the following case information, generate a helpful summary for the client (the applicant). Be warm, reassuring, and clear.

${context}

Respond in JSON format with this exact structure:
{
  "summary": "A 2-3 sentence friendly summary of where their application stands",
  "nextSteps": ["Array of 2-3 actionable next steps or what to expect"],
  "estimatedProgress": A number from 0-100 representing how far along the process is,
  "alerts": ["Optional array of any urgent actions needed from client, or empty array"]
}

Only respond with valid JSON, no additional text.`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500,
                    }
                })
            }
        )

        if (!geminiResponse.ok) {
            console.error('Gemini API error:', await geminiResponse.text())
            return new Response(
                JSON.stringify(generateFallbackSummary(caseData)),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const geminiData = await geminiResponse.json()
        const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

        if (!textContent) {
            return new Response(
                JSON.stringify(generateFallbackSummary(caseData)),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse Gemini response
        try {
            // Clean up the response (remove markdown code blocks if present)
            const cleanedText = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const summary: AISummary = JSON.parse(cleanedText)

            return new Response(
                JSON.stringify(summary),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', parseError)
            return new Response(
                JSON.stringify(generateFallbackSummary(caseData)),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

    } catch (error) {
        console.error('Error:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

function buildContext(
    caseData: any,
    stageHistory: any[],
    clientNotes: any[]
): string {
    const pipelineName = caseData.pipeline?.name || 'Application'
    const currentStage = caseData.current_stage?.name || 'Processing'
    const status = caseData.status || 'active'
    const firstName = caseData.person?.first_name || 'Client'

    let context = `
CASE INFORMATION:
- Application Type: ${pipelineName}
- Current Stage: ${currentStage}
- Status: ${status}
- Client Name: ${firstName}
`

    if (stageHistory.length > 0) {
        context += `
PROGRESS HISTORY (${stageHistory.length} stages completed):
${stageHistory.map((h, i) => `${i + 1}. ${h.to_stage?.name || 'Unknown'}`).join('\n')}
`
    }

    if (clientNotes.length > 0) {
        context += `
RECENT UPDATES:
${clientNotes.map(n => `- ${n.content}`).join('\n')}
`
    }

    // Add metadata context if available
    const metadata = caseData.metadata || {}
    if (metadata.missingDocument || metadata.missingInformation) {
        context += `
PENDING ITEMS:
- Missing: ${metadata.missingDocument || metadata.missingInformation}
`
    }

    if (metadata.actionRequiredFromClient) {
        context += `
ACTION REQUIRED: Yes, client needs to provide information or documents.
`
    }

    return context
}

function generateFallbackSummary(caseData: any): AISummary {
    const stageName = caseData.current_stage?.name || 'Processing'
    const pipelineName = caseData.pipeline?.name || 'Application'
    const stageSlug = caseData.current_stage?.slug || ''

    let summary = `Your ${pipelineName} is currently in the "${stageName}" stage.`
    let nextSteps: string[] = []
    let progress = 30
    let alerts: string[] = []

    if (stageSlug.includes('new') || stageSlug.includes('intake')) {
        summary = `We've received your ${pipelineName} application and it's being reviewed by our team.`
        nextSteps = ['Our team will review your initial documents', 'You may receive requests for additional information']
        progress = 15
    } else if (stageSlug.includes('document') || stageSlug.includes('pending')) {
        summary = `We're processing your ${pipelineName} application and may need some additional documents.`
        nextSteps = ['Check your email for any document requests', 'Upload requested documents as soon as possible']
        progress = 35
        if (caseData.metadata?.actionRequiredFromClient) {
            alerts = ['Please check your email for pending document requests']
        }
    } else if (stageSlug.includes('review') || stageSlug.includes('processing')) {
        summary = `Your ${pipelineName} application is being actively processed by our specialists.`
        nextSteps = ['Our team is working on your case', 'We will update you on any developments']
        progress = 55
    } else if (stageSlug.includes('submit') || stageSlug.includes('verification')) {
        summary = `Your ${pipelineName} application has been submitted and is awaiting verification.`
        nextSteps = ['Verification typically takes 2-4 weeks', 'We will notify you once verification is complete']
        progress = 75
    } else if (stageSlug.includes('complete') || stageSlug.includes('approved')) {
        summary = `Congratulations! Your ${pipelineName} has been completed successfully.`
        nextSteps = ['Check your email for final documentation', 'Contact us if you need any additional assistance']
        progress = 100
    }

    return { summary, nextSteps, estimatedProgress: progress, alerts }
}
