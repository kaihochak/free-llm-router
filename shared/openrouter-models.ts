export interface OpenRouterApiModel {
  id: string;
  name: string;
  pricing: {
    prompt: string | number;
    completion: string | number;
  };
  context_length?: number;
  description?: string;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  supported_parameters?: string[];
}

export interface OpenRouterModelsResponse {
  data: OpenRouterApiModel[];
}

function parsePrice(value: unknown): number {
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim().length === 0)) {
    return Number.NaN;
  }

  return Number(value);
}

export function parseOpenRouterModelsResponse(payload: unknown): OpenRouterModelsResponse {
  if (
    !payload ||
    typeof payload !== 'object' ||
    !Array.isArray((payload as { data?: unknown }).data)
  ) {
    throw new Error('Invalid OpenRouter models response');
  }

  const data = (payload as { data: unknown[] }).data;
  const modelIds = new Set<string>();

  for (const entry of data) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Invalid model entry in OpenRouter response');
    }

    const model = entry as Record<string, unknown>;
    const pricing = model.pricing;
    const promptCost =
      pricing && typeof pricing === 'object'
        ? parsePrice((pricing as Record<string, unknown>).prompt)
        : Number.NaN;
    const completionCost =
      pricing && typeof pricing === 'object'
        ? parsePrice((pricing as Record<string, unknown>).completion)
        : Number.NaN;

    if (
      typeof model.id !== 'string' ||
      model.id.trim().length === 0 ||
      typeof model.name !== 'string' ||
      model.name.trim().length === 0 ||
      !Number.isFinite(promptCost) ||
      !Number.isFinite(completionCost) ||
      modelIds.has(model.id)
    ) {
      throw new Error('Invalid model entry in OpenRouter response');
    }

    modelIds.add(model.id);
  }

  return { data: data as OpenRouterApiModel[] };
}

export function isFreeModel(model: OpenRouterApiModel): boolean {
  return Number(model.pricing.prompt) === 0 && Number(model.pricing.completion) === 0;
}
