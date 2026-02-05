// Dynamic code generators for interactive examples

// Basic usage pattern for "Use It" step
export const basicUsage = (
  useCases: string[],
  sort: string,
  topN?: number,
  maxErrorRate?: number,
  timeRange?: string,
  myReports?: boolean
) => {
  const useCaseStr = useCases.length > 0 ? `[${useCases.map((f) => `'${f}'`).join(', ')}]` : '[]';
  const topNStr = topN !== undefined ? `, ${topN}` : ''; // Only include topN if explicitly set

  // Build options object if any optional params are set
  const hasOptions = maxErrorRate !== undefined || timeRange !== undefined || myReports;
  let optionsStr = '';

  if (hasOptions) {
    const optionParts: string[] = [];
    if (maxErrorRate !== undefined) {
      optionParts.push(`maxErrorRate: ${maxErrorRate}`);
    }
    if (timeRange !== undefined) {
      optionParts.push(`timeRange: '${timeRange}'`);
    }
    if (myReports) {
      optionParts.push(`myReports: true`);
    }
    optionsStr = `, { ${optionParts.join(', ')} }`;
  }

  return `// 1. Fetch free models and try each until one succeeds
try {
  const { ids: freeModels, requestId } = await getModelIds(${useCaseStr}, '${sort}'${topNStr}${optionsStr});

  // 2. (Optional) Add stable fallback models you trust (usually paid)
  const stableFallback = ['anthropic/claude-3.5-sonnet'];
  const models = [...freeModels, ...stableFallback];

  // 3. Try models until one succeeds
  for (const id of models) {
    try {
      const res = await client.chat.completions.create({ model: id, messages });
      reportSuccess(id, requestId); // Helps improve health metrics
      return res;
    } catch (e) {
      const status = e.status || e.response?.status;
      reportIssue(id, issueFromStatus(status), requestId, e.message); // Helps improve health metrics
    }
  }
} catch {
  // API unavailable - fall back to hardcoded models
  // E.g. return await client.chat.completions.create({ model: 'anthropic/claude-3.5-sonnet', messages });
}
throw new Error('All models failed');`;
};

// getModelIds call generator
export const getModelIdsCall = (
  useCases: string[],
  sort: string,
  topN?: number,
  maxErrorRate?: number,
  timeRange?: string,
  myReports?: boolean
) => {
  const useCaseStr = useCases.length > 0 ? `[${useCases.map((f) => `'${f}'`).join(', ')}]` : '[]';
  const topNStr = topN !== undefined ? `, ${topN}` : ''; // Only include topN if explicitly set

  // Build options object if any optional params are set
  const hasOptions = maxErrorRate !== undefined || timeRange !== undefined || myReports;
  let optionsStr = '';

  if (hasOptions) {
    const optionParts: string[] = [];
    if (maxErrorRate !== undefined) {
      optionParts.push(`maxErrorRate: ${maxErrorRate}`);
    }
    if (timeRange !== undefined) {
      optionParts.push(`timeRange: '${timeRange}'`);
    }
    if (myReports) {
      optionParts.push(`myReports: true`);
    }
    optionsStr = `, { ${optionParts.join(', ')} }`;
  }

  return `// This is how you fetch free model IDs (returns { ids, requestId })
const { ids, requestId } = await getModelIds(${useCaseStr}, '${sort}'${topNStr}${optionsStr})`;
};
