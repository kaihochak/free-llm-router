import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient, createApiKeyWithLimit } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModelControls } from '@/components/ModelControls';
import { ModelList } from '@/components/ModelList';
import { Copy, Check, Trash2, Key, Settings, Save, Loader2 } from 'lucide-react';
import type { UseCaseType, TimeRange, ApiKeyPreferences } from '@/lib/api-definitions';
import {
  DEFAULT_SORT,
  DEFAULT_TIME_RANGE,
  DEFAULT_MY_REPORTS,
  DEFAULT_TOP_N,
  DEFAULT_USE_CASE,
} from '@/lib/api-definitions';
import { filterModelsByUseCase, sortModels } from '@/lib/model-types';
import type { Model } from '@/hooks/useModels';

interface ApiKey {
  id: string;
  name: string;
  start: string | null;
  prefix: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  rateLimitMax: number | null;
  remaining: number | null;
  requestCount?: number | null;
  lastRequest: Date | null;
  enabled: boolean;
}

interface ApiKeysTabProps {
  userRateLimit: {
    remaining: number;
    limit: number;
    requestCount: number;
  } | null;
  onRefreshRateLimit: () => void;
}

interface FeedbackCounts {
  [modelId: string]: {
    rateLimited: number;
    unavailable: number;
    error: number;
    successCount: number;
    errorRate: number;
  };
}

interface ModelsApiResponse {
  models: Model[];
  feedbackCounts: FeedbackCounts;
  lastUpdated?: string;
}

// Fetch functions
async function fetchApiKeys(): Promise<ApiKey[]> {
  const response = await authClient.apiKey.list();
  return (response.data as ApiKey[]) || [];
}

async function fetchPreferences(apiKeyId: string): Promise<ApiKeyPreferences> {
  const response = await fetch(`/api/auth/preferences?apiKeyId=${apiKeyId}`, {
    credentials: 'include',
  });
  if (!response.ok) return {};
  const data = await response.json();
  return data.preferences || {};
}

async function savePreferences(apiKeyId: string, preferences: ApiKeyPreferences): Promise<void> {
  const response = await fetch('/api/auth/preferences', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKeyId, preferences }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to save preferences');
  }
}

async function fetchModelsForPreview(
  timeRange: string,
  maxErrorRate?: number,
  myReports?: boolean
): Promise<{ models: Model[]; lastUpdated: string | null }> {
  const params = new URLSearchParams();
  params.append('timeRange', timeRange);
  if (maxErrorRate !== undefined) {
    params.append('maxErrorRate', maxErrorRate.toString());
  }
  if (myReports !== undefined) {
    params.append('myReports', myReports.toString());
  }
  const response = await fetch(`/api/demo/models?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch models');

  const data: ModelsApiResponse = await response.json();
  const models = data.models.map((model) => {
    const feedback = data.feedbackCounts?.[model.id];
    const issueCount = feedback ? feedback.rateLimited + feedback.unavailable + feedback.error : 0;
    const errorRate = feedback ? feedback.errorRate : 0;
    const successCount = feedback ? feedback.successCount : 0;
    const rateLimited = feedback ? feedback.rateLimited : 0;
    const unavailable = feedback ? feedback.unavailable : 0;
    const errorCount = feedback ? feedback.error : 0;
    return { ...model, issueCount, errorRate, successCount, rateLimited, unavailable, errorCount };
  });
  return { models, lastUpdated: data.lastUpdated || null };
}

const MAX_KEYS = 10;

export function ApiKeysTab({ userRateLimit, onRefreshRateLimit }: ApiKeysTabProps) {
  const queryClient = useQueryClient();

  // UI-only state
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preferences dialog state
  const [configuringKey, setConfiguringKey] = useState<ApiKey | null>(null);
  const [preferences, setPreferences] = useState<ApiKeyPreferences>({});
  const [previewPage, setPreviewPage] = useState(1);
  const [prefsMessage, setPrefsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Query: API keys list
  const {
    data: apiKeys = [],
    isLoading: isLoadingKeys,
  } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: fetchApiKeys,
  });

  // Query: Models for preview (only when dialog is open)
  const {
    data: modelsData,
    isLoading: isLoadingModels,
  } = useQuery({
    queryKey: [
      'previewModels',
      preferences.timeRange || DEFAULT_TIME_RANGE,
      preferences.maxErrorRate,
      preferences.myReports,
    ],
    queryFn: () =>
      fetchModelsForPreview(
        preferences.timeRange || DEFAULT_TIME_RANGE,
        preferences.maxErrorRate,
        preferences.myReports
      ),
    enabled: !!configuringKey,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation: Create API key
  const createKeyMutation = useMutation({
    mutationFn: (name: string) => createApiKeyWithLimit(name),
    onSuccess: (response) => {
      if (response.key) {
        setNewKey(response.key);
        setKeyName('');
        queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      } else if (response.error) {
        setError(response.error.message || 'Failed to create API key');
      }
    },
    onError: () => {
      setError('Failed to create API key');
    },
  });

  // Mutation: Delete API key
  const deleteKeyMutation = useMutation({
    mutationFn: (keyId: string) => authClient.apiKey.delete({ keyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      setKeyToDelete(null);
    },
  });

  // Mutation: Save preferences
  const savePreferencesMutation = useMutation({
    mutationFn: () => {
      if (!configuringKey) throw new Error('No key selected');
      return savePreferences(configuringKey.id, preferences);
    },
    onSuccess: () => {
      setPrefsMessage({ type: 'success', text: 'Preferences saved' });
    },
    onError: (err: Error) => {
      setPrefsMessage({ type: 'error', text: err.message || 'Failed to save preferences' });
    },
  });

  const canCreateKey = apiKeys.length < MAX_KEYS;

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    if (!canCreateKey) {
      setError(`Maximum ${MAX_KEYS} API keys allowed. Delete an existing key to create a new one.`);
      return;
    }

    setError(null);
    createKeyMutation.mutate(keyName.trim());
  };

  const handleCopyKey = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfigureKey = async (key: ApiKey) => {
    setConfiguringKey(key);
    setPrefsMessage(null);
    setPreviewPage(1);

    // Fetch preferences for this key
    try {
      const prefs = await fetchPreferences(key.id);
      setPreferences(prefs);
    } catch {
      setPreferences({});
    }
  };

  const handleCloseDialog = () => {
    setConfiguringKey(null);
    setPreferences({});
    setPrefsMessage(null);
  };

  // Update a single preference field
  const updatePref = <K extends keyof ApiKeyPreferences>(key: K, value: ApiKeyPreferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setPrefsMessage(null);
  };

  // Toggle use case in the array
  const toggleUseCase = (useCase: UseCaseType | 'all') => {
    if (useCase === 'all') {
      updatePref('useCases', []);
    } else {
      const current = preferences.useCases || [];
      const updated = current.includes(useCase)
        ? current.filter((uc) => uc !== useCase)
        : [...current, useCase];
      updatePref('useCases', updated);
    }
    setPreviewPage(1);
  };

  // Filter and sort models based on current preferences
  const previewModels = useMemo(() => {
    const allModels = modelsData?.models || [];
    const useCases = preferences.useCases || [];
    const sort = preferences.sort || DEFAULT_SORT;
    const filtered = filterModelsByUseCase(allModels, useCases);
    const sorted = sortModels(filtered, sort);
    const topN = preferences.topN;
    return topN ? sorted.slice(0, topN) : sorted;
  }, [modelsData?.models, preferences.useCases, preferences.sort, preferences.topN]);

  const handleReliabilityFilterEnabledChange = (enabled: boolean) => {
    if (!enabled) {
      updatePref('maxErrorRate', undefined);
    } else {
      updatePref('maxErrorRate', 10);
    }
    setPreviewPage(1);
  };

  // Reset preferences to defaults
  const handleResetPrefs = () => {
    setPreferences({
      useCases: DEFAULT_USE_CASE,
      sort: DEFAULT_SORT,
      topN: DEFAULT_TOP_N,
      maxErrorRate: undefined,
      timeRange: DEFAULT_TIME_RANGE,
      myReports: DEFAULT_MY_REPORTS,
    });
    setPreviewPage(1);
    setPrefsMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* API Usage Card */}
      <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Key className="h-5 w-5" />
            API Usage (Shared Across All Keys)
          </CardTitle>
          <CardDescription className="text-blue-600 dark:text-blue-500">
            Your usage resets 24 hours after your last request
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userRateLimit ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{userRateLimit.remaining}</span>
                <span className="text-muted-foreground">
                  / {userRateLimit.limit} requests remaining
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {userRateLimit.requestCount > 0 ? (
                  <>
                    Used {userRateLimit.requestCount} request
                    {userRateLimit.requestCount === 1 ? '' : 's'} today
                  </>
                ) : (
                  'No requests made yet'
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Loading usage data...</p>
          )}
        </CardContent>
      </Card>

      {/* New Key Alert */}
      {newKey && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Key className="h-5 w-5" />
              API Key Created
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-500">
              Copy this key now. You won&apos;t be able to see it again!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-green-100 px-3 py-2 font-mono text-sm dark:bg-green-900/30">
                {newKey}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopyKey}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setNewKey(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage your keys ({apiKeys.length}/{MAX_KEYS}). All keys share your account&apos;s rate
            limit of {userRateLimit?.limit ?? 200} requests per day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateKey} className="flex gap-2">
            <Input
              placeholder="Key name (e.g., 'My App')"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              disabled={createKeyMutation.isPending}
              className="flex-1"
            />
            <Button type="submit" disabled={createKeyMutation.isPending || !keyName.trim() || !canCreateKey}>
              {createKeyMutation.isPending
                ? 'Creating...'
                : canCreateKey
                  ? 'Create Key'
                  : `Limit Reached (${MAX_KEYS})`}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

          <div className="mt-6">
            {isLoadingKeys ? (
              <p className="text-center text-muted-foreground py-4">Loading keys...</p>
            ) : apiKeys.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No API keys yet. Create one above to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-25">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                          {key.prefix || key.start || 'fma_'}...
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.requestCount ?? 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(key.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.enabled ? 'default' : 'secondary'}>
                          {key.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConfigureKey(key)}
                            title="Configure default preferences"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setKeyToDelete(key.id)}
                            disabled={deleteKeyMutation.isPending && deleteKeyMutation.variables === key.id}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            title="Delete API key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!keyToDelete} onOpenChange={(open) => !open && setKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this API key? This action cannot be undone and will
              immediately invalidate the key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => keyToDelete && deleteKeyMutation.mutate(keyToDelete)}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Configure Preferences Dialog */}
      <Dialog open={!!configuringKey} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure API Key</DialogTitle>
            <DialogDescription>
              Set default preferences for <strong>{configuringKey?.name}</strong>. These will be used
              when you call the API without query parameters.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            <ModelControls
              activeUseCases={preferences.useCases || []}
              activeSort={preferences.sort || DEFAULT_SORT}
              activeTopN={preferences.topN}
              reliabilityFilterEnabled={preferences.maxErrorRate !== undefined}
              activeMaxErrorRate={preferences.maxErrorRate}
              activeTimeRange={preferences.timeRange || DEFAULT_TIME_RANGE}
              activeMyReports={preferences.myReports || DEFAULT_MY_REPORTS}
              showReliabilityControls={true}
              onToggleUseCase={toggleUseCase}
              onSortChange={(sort) => { updatePref('sort', sort); setPreviewPage(1); }}
              onTopNChange={(topN) => { updatePref('topN', topN); setPreviewPage(1); }}
              onReliabilityFilterEnabledChange={handleReliabilityFilterEnabledChange}
              onMaxErrorRateChange={(rate) => { updatePref('maxErrorRate', rate); setPreviewPage(1); }}
              onTimeRangeChange={(range) => { updatePref('timeRange', range as TimeRange); setPreviewPage(1); }}
              onMyReportsChange={(val) => { updatePref('myReports', val); setPreviewPage(1); }}
              onReset={handleResetPrefs}
              size="sm"
            />

            {/* Live model preview */}
            <ModelList
              models={previewModels}
              loading={isLoadingModels}
              currentPage={previewPage}
              onPageChange={setPreviewPage}
              itemsPerPage={5}
              lastUpdated={modelsData?.lastUpdated || null}
              headerLabel="Preview"
            />

            {/* How it works explanation */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <CardContent className="pt-4 text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <p className="font-medium">How it works:</p>
                <p>
                  <strong>Without query params:</strong> Your saved preferences are applied.
                </p>
                <code className="block bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded text-xs">
                  GET /api/v1/models/ids
                </code>
                <p>
                  <strong>With query params:</strong> They override saved preferences.
                </p>
                <code className="block bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded text-xs">
                  GET /api/v1/models/ids?topN=10
                </code>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <div className="flex items-center gap-3 w-full">
              <Button onClick={() => savePreferencesMutation.mutate()} disabled={savePreferencesMutation.isPending}>
                {savePreferencesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Preferences
              </Button>
              {prefsMessage && (
                <span
                  className={`text-sm ${prefsMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
                >
                  {prefsMessage.text}
                </span>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
