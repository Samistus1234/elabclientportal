export const DATAFLOW_PIPELINE_SLUG = 'dataflow'

export const DATAFLOW_STAGE_ORDER = [
  'incoming_stage',
  'waiting_for_client_reply',
  'document_ready',
  'document_review',
  'application_made',
  'internal_quality_control',
  'application_submitted',
  'first_update_email',
  'issue_in_authority_stages',
  'first_completed_component',
  'next_completed_component',
  'verification_completed',
] as const

const DATAFLOW_STAGE_INDEX = new Map<string, number>(
  DATAFLOW_STAGE_ORDER.map((slug, index) => [slug, index + 1])
)

type StageLike = {
  slug: string
  order_index: number
}

export function isDataflowPipeline(pipelineSlug?: string | null): boolean {
  return (pipelineSlug || '').toLowerCase() === DATAFLOW_PIPELINE_SLUG
}

export function normalizePipelineStagesForDisplay<T extends StageLike>(
  stages: T[],
  pipelineSlug?: string | null
): T[] {
  if (!Array.isArray(stages) || stages.length === 0) {
    return []
  }

  if (!isDataflowPipeline(pipelineSlug)) {
    return [...stages].sort((left, right) => left.order_index - right.order_index)
  }

  return stages
    .filter((stage) => DATAFLOW_STAGE_INDEX.has(stage.slug))
    .sort((left, right) => {
      const leftIndex = DATAFLOW_STAGE_INDEX.get(left.slug) ?? Number.MAX_SAFE_INTEGER
      const rightIndex = DATAFLOW_STAGE_INDEX.get(right.slug) ?? Number.MAX_SAFE_INTEGER
      return leftIndex - rightIndex
    })
    .map((stage) => ({
      ...stage,
      order_index: DATAFLOW_STAGE_INDEX.get(stage.slug) ?? stage.order_index,
    }) as T)
}

export function getDataflowStageProgress(stageSlug?: string | null): number | null {
  if (!stageSlug) {
    return null
  }

  const stageIndex = DATAFLOW_STAGE_INDEX.get(stageSlug)
  if (!stageIndex) {
    return null
  }

  return Math.round((stageIndex / DATAFLOW_STAGE_ORDER.length) * 100)
}
