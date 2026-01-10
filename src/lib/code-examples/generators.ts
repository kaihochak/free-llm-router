// Dynamic code generators for interactive examples

// Basic usage pattern for "Use It" step
export const basicUsage = (filters: string[], sort: string, limit?: number) => {
  const filterStr = filters.length > 0 ? `[${filters.map((f) => `'${f}'`).join(', ')}]` : '[]';
  const limitStr = limit !== undefined ? `, ${limit}` : ''; // Only include limit if explicitly set
  return `// 1. Fetch free models and try each until one succeeds
try {
  const freeModels = await getModelIds(${filterStr}, '${sort}'${limitStr});

  // 2. (Optional) Add stable fallback models you trust (usually paid)
  const stableFallback = ['anthropic/claude-3.5-sonnet'];
  const models = [...freeModels, ...stableFallback];

  // 3. Try models until one succeeds
  for (const id of models) {
    try {
      const res = await client.chat.completions.create({ model: id, messages });
      return res;
    } catch (e) {
      // Report issue with correct type - free, doesn't use quota
      const status = e.status || e.response?.status;
      reportIssue(id, issueFromStatus(status), e.message);
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
  filters: string[],
  sort: string,
  limit?: number,
  excludeWithIssues?: number,
  timeWindow?: string
) => {
  const filterStr = filters.length > 0 ? `[${filters.map((f) => `'${f}'`).join(', ')}]` : '[]';
  const limitStr = limit !== undefined ? `, ${limit}` : ''; // Only include limit if explicitly set

  // Build options object if any optional params are set
  const hasOptions = excludeWithIssues !== undefined || timeWindow !== undefined;
  let optionsStr = '';

  if (hasOptions) {
    const optionParts: string[] = [];
    if (excludeWithIssues !== undefined) {
      optionParts.push(`excludeWithIssues: ${excludeWithIssues}`);
    }
    if (timeWindow !== undefined) {
      optionParts.push(`timeWindow: '${timeWindow}'`);
    }
    optionsStr = `, { ${optionParts.join(', ')} }`;
  }

  return `getModelIds(${filterStr}, '${sort}'${limitStr}${optionsStr})`;
};
