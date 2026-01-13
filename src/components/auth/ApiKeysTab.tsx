import { useState, useEffect, useCallback } from 'react';
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
import { Copy, Check, Trash2, Key } from 'lucide-react';

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

export function ApiKeysTab({ userRateLimit, onRefreshRateLimit }: ApiKeysTabProps) {
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    try {
      setIsLoadingKeys(true);
      const response = await authClient.apiKey.list();
      if (response.data) {
        setApiKeys(response.data as ApiKey[]);
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setIsLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const MAX_KEYS = 10;
  const canCreateKey = apiKeys.length < MAX_KEYS;

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    if (!canCreateKey) {
      setError(`Maximum ${MAX_KEYS} API keys allowed. Delete an existing key to create a new one.`);
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const response = await createApiKeyWithLimit(keyName.trim());
      if (response.key) {
        setNewKey(response.key);
        setKeyName('');
        await fetchApiKeys();
      } else if (response.error) {
        setError(response.error.message || 'Failed to create API key');
      }
    } catch (err) {
      setError('Failed to create API key');
      console.error('Failed to create API key:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = (keyId: string) => {
    setKeyToDelete(keyId);
  };

  const confirmDelete = async () => {
    if (!keyToDelete) return;

    setDeletingKeyId(keyToDelete);
    try {
      await authClient.apiKey.delete({ keyId: keyToDelete });
      setApiKeys(apiKeys.filter((k) => k.id !== keyToDelete));
    } catch (err) {
      console.error('Failed to delete API key:', err);
    } finally {
      setDeletingKeyId(null);
      setKeyToDelete(null);
    }
  };

  const handleCopyKey = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDismissNewKey = () => {
    setNewKey(null);
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
              <Button variant="ghost" size="sm" onClick={handleDismissNewKey}>
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
              disabled={isCreating}
              className="flex-1"
            />
            <Button type="submit" disabled={isCreating || !keyName.trim() || !canCreateKey}>
              {isCreating
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
                    <TableHead className="w-[50px]"></TableHead>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteKey(key.id)}
                          disabled={deletingKeyId === key.id}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
