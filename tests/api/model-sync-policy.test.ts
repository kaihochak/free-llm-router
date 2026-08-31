import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getCurrentModelCutoff,
  shouldMarkMissingModelsInactive,
} from '../../src/services/openrouter';

describe('model sync deactivation policy', () => {
  it('allows a legitimate sharp drop in the free-model subset', () => {
    assert.equal(shouldMarkMissingModelsInactive(395, 21, 52), true);
  });

  it('rejects an empty free set or suspiciously small full response', () => {
    assert.equal(shouldMarkMissingModelsInactive(395, 0, 52), false);
    assert.equal(shouldMarkMissingModelsInactive(20, 10, 100), false);
  });

  it('derives current-model freshness from the latest successful sync', () => {
    const lastUpdated = new Date('2026-08-31T12:00:00.000Z');

    assert.equal(getCurrentModelCutoff(null), null);
    assert.equal(getCurrentModelCutoff(lastUpdated)?.toISOString(), '2026-08-31T11:45:00.000Z');
  });
});
