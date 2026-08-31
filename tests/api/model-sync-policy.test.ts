import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isFreeModel, parseOpenRouterModelsResponse } from '../../shared/openrouter-models';

describe('OpenRouter model response validation', () => {
  it('accepts a structurally valid response with zero models', () => {
    assert.deepEqual(parseOpenRouterModelsResponse({ data: [] }), { data: [] });
  });

  it('accepts model entries with the fields needed to classify them', () => {
    const payload = {
      data: [
        {
          id: 'openrouter/free',
          name: 'Free Models Router',
          pricing: { prompt: '0', completion: '0' },
        },
      ],
    };

    assert.deepEqual(parseOpenRouterModelsResponse(payload), payload);
    assert.equal(isFreeModel(payload.data[0]), true);
  });

  it('classifies paid models from the same validated pricing fields', () => {
    const model = {
      id: 'openrouter/paid',
      name: 'Paid Model',
      pricing: { prompt: '0.001', completion: '0.002' },
    };

    const parsed = parseOpenRouterModelsResponse({ data: [model] });
    assert.equal(isFreeModel(parsed.data[0]), false);
  });

  it('rejects malformed payloads and invalid model entries', () => {
    assert.throws(() => parseOpenRouterModelsResponse({}), /Invalid OpenRouter models response/);
    assert.throws(
      () => parseOpenRouterModelsResponse({ data: [{ name: 'Missing ID' }] }),
      /Invalid model entry/
    );
    assert.throws(
      () =>
        parseOpenRouterModelsResponse({
          data: [{ id: 'missing-pricing', name: 'Missing Pricing' }],
        }),
      /Invalid model entry/
    );
    assert.throws(
      () =>
        parseOpenRouterModelsResponse({
          data: [
            { id: 'duplicate', name: 'First', pricing: { prompt: '0', completion: '0' } },
            { id: 'duplicate', name: 'Second', pricing: { prompt: '0', completion: '0' } },
          ],
        }),
      /Invalid model entry/
    );
  });
});
