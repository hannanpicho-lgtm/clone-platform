import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface PremiumAssignment {
  userId: string;
  userEmail: string;
  userName: string;
  assignment: {
    amount: number;
    targetDeficit?: number | null;
    position: number;
    assignedAt: string;
  };
  currentBalance: number;
  accountFrozen: boolean;
  freezeAmount: number;
}

interface PremiumAnalytics {
  totalAssignments: number;
  totalPremiumValue: number;
  averageValue: number;
  frozenAccounts: number;
  unfrozenAccounts: number;
  assignments: Array<{
    userId: string;
    amount: number;
    targetDeficit?: number | null;
    position: number;
    assignedAt: string;
    isFrozen: boolean;
  }>;
}

interface TaskCatalogProduct {
  id: string;
  name: string;
  image: string;
  isActive: boolean;
  isArchived?: boolean;
  isPremiumTemplate: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const FUNCTION_BASE = `${(import.meta.env.VITE_SUPABASE_URL || 'https://tpxgfjevorhdtwkesvcb.supabase.co').replace(/\/$/, '')}/functions/v1/make-server-44a642d3`;

interface PremiumManagementPanelProps {
  adminToken?: string | null;
  isSuperAdmin?: boolean;
}

export function PremiumManagementPanel({ adminToken, isSuperAdmin = false }: PremiumManagementPanelProps) {
  const [assignments, setAssignments] = useState<PremiumAssignment[]>([]);
  const [analytics, setAnalytics] = useState<PremiumAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form states for assigning new premium deficit
  const [formUserId, setFormUserId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [taskProducts, setTaskProducts] = useState<TaskCatalogProduct[]>([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductImage, setNewProductImage] = useState('');
  const [newProductIsPremiumTemplate, setNewProductIsPremiumTemplate] = useState(false);
  const [aiGenerateCount, setAiGenerateCount] = useState('10');
  const [showArchivedProducts, setShowArchivedProducts] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ userId: string; userName: string } | null>(null);
  const authToken = String(adminToken || '').trim();

  // Load premium assignments
  const loadTaskProducts = async () => {
    if (!authToken) {
      setTaskProducts([]);
      return;
    }

    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/task-products`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setTaskProducts(Array.isArray(data.products) ? data.products : []);
      }
    } catch {
      // keep existing state if request fails
    }
  };

  const loadAssignments = async () => {
    if (!isSuperAdmin || !authToken) {
      setAssignments([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/premium/list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments);
      } else {
        setError(data.error || 'Failed to load assignments');
      }
    } catch (err) {
      setError(`Error loading assignments: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    if (!isSuperAdmin || !authToken) {
      setAnalytics(null);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/premium/analytics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      setError(`Error loading analytics: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Assign premium deficit
  const handleAssignPremium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      setError('Admin session expired. Please login again.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/users/assign-premium`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: formUserId,
          amount: parseFloat(formAmount),
          targetDeficit: parseFloat(formAmount),
          position: parseInt(formPosition),
          productId: formProductId || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage('✓ Premium deficit assignment created successfully');
        setFormUserId('');
        setFormAmount('');
        setFormPosition('');
        setFormProductId('');
        if (isSuperAdmin) {
          await loadAssignments();
        }
      } else {
        setError(data.error || 'Failed to assign premium');
      }
    } catch (err) {
      setError(`Error assigning premium: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Revoke premium assignment
  const openRevokeModal = (userId: string, userName: string) => {
    setRevokeTarget({ userId, userName });
    setShowRevokeModal(true);
  };

  const handleRevoke = async () => {
    if (!revokeTarget?.userId) return;
    if (!authToken) {
      setError('Admin session expired. Please login again.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/premium/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: revokeTarget.userId }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`✓ Premium assignment revoked`);
        setShowRevokeModal(false);
        setRevokeTarget(null);
        await loadAssignments();
      } else {
        setError(data.error || 'Failed to revoke premium');
      }
    } catch (err) {
      setError(`Error revoking premium: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTaskProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      setError('Admin session expired. Please login again.');
      return;
    }

    if (!newProductName.trim()) {
      setError('Product name is required');
      return;
    }
    if (!newProductImage.trim() || !/^https?:\/\//i.test(newProductImage.trim())) {
      setError('A valid image URL (http/https) is required');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/task-products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProductName,
          image: newProductImage,
          isPremiumTemplate: newProductIsPremiumTemplate,
          isActive: true,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to add product');
        return;
      }

      setTaskProducts(Array.isArray(data?.products) ? data.products : []);
      setNewProductName('');
      setNewProductImage('');
      setNewProductIsPremiumTemplate(false);
      setMessage('✓ Task product added');
    } catch (err) {
      setError(`Error adding product: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTaskProducts = async () => {
    if (!authToken) {
      setError('Admin session expired. Please login again.');
      return;
    }

    const count = Math.max(1, Math.min(50, Number(aiGenerateCount || 10)));
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/task-products/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to generate products');
        return;
      }

      setTaskProducts(Array.isArray(data?.products) ? data.products : []);
      setMessage(`✓ Generated ${Array.isArray(data?.generated) ? data.generated.length : count} products`);
    } catch (err) {
      setError(`Error generating products: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTaskProduct = async (product: TaskCatalogProduct) => {
    if (!authToken) {
      setError('Admin session expired. Please login again.');
      return;
    }

    const nextName = window.prompt('Update product name', product.name)?.trim();
    if (nextName === undefined || nextName === null) {
      return;
    }
    if (!nextName) {
      setError('Product name cannot be empty');
      return;
    }

    const nextImage = window.prompt('Update product image URL (http/https)', product.image)?.trim();
    if (nextImage === undefined || nextImage === null) {
      return;
    }
    if (!nextImage || !/^https?:\/\//i.test(nextImage)) {
      setError('A valid image URL (http/https) is required');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/task-products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nextName,
          image: nextImage,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to update product');
        return;
      }

      setTaskProducts(Array.isArray(data?.products) ? data.products : []);
      setMessage('✓ Product name/image updated');
    } catch (err) {
      setError(`Error updating product: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePremiumTemplate = async (product: TaskCatalogProduct) => {
    if (!authToken) {
      setError('Admin session expired. Please login again.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/task-products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPremiumTemplate: !product.isPremiumTemplate,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to update product');
        return;
      }

      setTaskProducts(Array.isArray(data?.products) ? data.products : []);
      setMessage('✓ Product updated');
    } catch (err) {
      setError(`Error updating product: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProductActive = async (product: TaskCatalogProduct) => {
    if (!authToken) {
      setError('Admin session expired. Please login again.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/task-products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !product.isActive,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to update product status');
        return;
      }

      setTaskProducts(Array.isArray(data?.products) ? data.products : []);
      setMessage(`✓ Product ${product.isActive ? 'deactivated' : 'activated'}`);
    } catch (err) {
      setError(`Error updating product status: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (product: TaskCatalogProduct) => {
    if (!authToken) {
      setError('Admin session expired. Please login again.');
      return;
    }

    if (!window.confirm(`Archive product "${product.name}"? This will hide it from active product flows.`)) {
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/task-products/${product.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to archive product');
        return;
      }

      setTaskProducts(Array.isArray(data?.products) ? data.products : []);
      setMessage('✓ Product archived');
      if (formProductId === product.id) {
        setFormProductId('');
      }
    } catch (err) {
      setError(`Error archiving product: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreProduct = async (product: TaskCatalogProduct) => {
    if (!authToken) {
      setError('Admin session expired. Please login again.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${FUNCTION_BASE}/admin/task-products/${product.id}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to restore product');
        return;
      }

      setTaskProducts(Array.isArray(data?.products) ? data.products : []);
      setMessage('✓ Product restored');
    } catch (err) {
      setError(`Error restoring product: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      loadTaskProducts();
    }
    if (isSuperAdmin && authToken) {
      loadAssignments();
      loadAnalytics();
    }
  }, [isSuperAdmin, authToken]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalAssignments || 0}</div>
            <p className="text-xs text-gray-500">active premium products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics?.totalPremiumValue?.toFixed(2) || '0'}</div>
            <p className="text-xs text-gray-500">in premium assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Frozen Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics?.frozenAccounts || 0}</div>
            <p className="text-xs text-gray-500">awaiting top-up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Average Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics?.averageValue?.toFixed(2) || '0'}</div>
            <p className="text-xs text-gray-500">per assignment</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assign" className="w-full">
        <TabsList>
          <TabsTrigger value="assign">Assign Premium Deficit</TabsTrigger>
          <TabsTrigger value="products">Task Products</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="active">Active Assignments</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
        </TabsList>

        {/* Assign Premium Tab */}
        <TabsContent value="assign" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assign Premium Deficit</CardTitle>
              <CardDescription>Store a target negative deficit and compute the premium encounter amount from the user's live balance.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignPremium} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">User ID</label>
                  <Input
                    value={formUserId}
                    onChange={(e) => setFormUserId(e.target.value)}
                    placeholder="Enter user ID"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Target Deficit ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="e.g., 100"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Example: if balance is $120 and target deficit is $100, the encounter amount becomes $220.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Position (Rank)</label>
                    <Input
                      type="number"
                      value={formPosition}
                      onChange={(e) => setFormPosition(e.target.value)}
                      placeholder="e.g., 1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Premium Product (optional)</label>
                  <select
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Auto-select premium product</option>
                    {taskProducts
                      .filter((item) => item.isActive)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} {item.isPremiumTemplate ? '(premium template)' : ''}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">If selected, this exact product is used when the assigned position is reached.</p>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Assigning...' : 'Assign Premium Deficit'}
                </Button>
              </form>

              {message && (
                <Alert className="mt-4 border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{message}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Product Catalog</CardTitle>
              <CardDescription>Add products manually or auto-generate AI-style product variety.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateTaskProduct} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Product Name</label>
                  <Input
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="e.g. Smart Commerce Bundle"
                    required
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Image URL (required)</label>
                  <Input
                    value={newProductImage}
                    onChange={(e) => setNewProductImage(e.target.value)}
                    placeholder="https://..."
                    required
                  />
                </div>
                <div className="md:col-span-1 flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newProductIsPremiumTemplate}
                      onChange={(e) => setNewProductIsPremiumTemplate(e.target.checked)}
                    />
                    Premium template
                  </label>
                  <Button type="submit" disabled={loading} className="ml-auto">
                    {loading ? 'Saving...' : 'Add Product'}
                  </Button>
                </div>
              </form>

              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">AI Auto Generator Count</label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={aiGenerateCount}
                      onChange={(e) => setAiGenerateCount(e.target.value)}
                    />
                  </div>
                  <Button type="button" onClick={handleGenerateTaskProducts} disabled={loading}>
                    {loading ? 'Generating...' : 'Generate Products'}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                      Active: {taskProducts.filter((product) => !Boolean(product.isArchived)).length}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                      Archived: {taskProducts.filter((product) => Boolean(product.isArchived)).length}
                    </span>
                    <span className="text-gray-500 ml-1">
                      Showing {showArchivedProducts ? 'archived' : 'active'} products
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowArchivedProducts((prev) => !prev)}
                  >
                    {showArchivedProducts ? 'Show Active' : 'Show Archived'}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Premium Template</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taskProducts.filter((product) => Boolean(product.isArchived) === showArchivedProducts).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-6">
                          {showArchivedProducts ? 'No archived products.' : 'No active task products available.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      taskProducts
                        .filter((product) => Boolean(product.isArchived) === showArchivedProducts)
                        .slice(0, 100)
                        .map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-12 w-12 rounded object-cover border border-gray-200"
                              loading="lazy"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.isArchived ? 'Archived' : (product.isActive ? 'Active' : 'Inactive')}</TableCell>
                          <TableCell>{product.isPremiumTemplate ? 'Yes' : 'No'}</TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {product.updatedAt ? new Date(product.updatedAt).toLocaleString() : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditTaskProduct(product)}
                                disabled={loading || Boolean(product.isArchived)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTogglePremiumTemplate(product)}
                                disabled={loading || Boolean(product.isArchived)}
                              >
                                {product.isPremiumTemplate ? 'Unset Premium' : 'Set Premium'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleProductActive(product)}
                                disabled={loading || Boolean(product.isArchived)}
                              >
                                {product.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              {product.isArchived ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRestoreProduct(product)}
                                  disabled={loading}
                                >
                                  Restore
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteProduct(product)}
                                  disabled={loading}
                                >
                                  Archive
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {message && (
                <Alert className="mt-4 border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{message}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Assignments Tab */}
        {isSuperAdmin && (
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Premium Assignments</CardTitle>
              <CardDescription>{assignments.length} users with premium products</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading assignments...</div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No premium assignments yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Encounter Amount</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assign) => (
                        <TableRow key={assign.userId}>
                          <TableCell className="font-medium">{assign.userName}</TableCell>
                          <TableCell className="text-sm">{assign.userEmail}</TableCell>
                          <TableCell className="font-bold">
                            ${assign.assignment.amount.toFixed(2)}
                            {typeof assign.assignment.targetDeficit === 'number' && assign.assignment.targetDeficit > 0 ? (
                              <p className="text-xs font-normal text-gray-500">Target deficit: ${assign.assignment.targetDeficit.toFixed(2)}</p>
                            ) : null}
                          </TableCell>
                          <TableCell>#{assign.assignment.position}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                assign.accountFrozen
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {assign.accountFrozen ? 'Frozen' : 'Active'}
                            </span>
                          </TableCell>
                          <TableCell>${assign.currentBalance.toFixed(2)}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(assign.assignment.assignedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openRevokeModal(assign.userId, assign.userName)}
                              disabled={loading}
                            >
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {message && (
                <Alert className="mt-4 border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{message}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Analytics Tab */}
        {isSuperAdmin && (
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Premium Product Analytics</CardTitle>
              <CardDescription>Historical premium assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading analytics...</div>
              ) : analytics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Assignments</p>
                      <p className="text-3xl font-bold">{analytics.totalAssignments}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Encounter Value</p>
                      <p className="text-3xl font-bold">${analytics.totalPremiumValue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Average Encounter Value</p>
                      <p className="text-3xl font-bold">${analytics.averageValue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Frozen / Active</p>
                      <p className="text-3xl font-bold">
                        {analytics.frozenAccounts} / {analytics.unfrozenAccounts}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Recent Assignments</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User ID</TableHead>
                            <TableHead>Encounter Amount</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Assigned Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.assignments.slice(0, 10).map((assign) => (
                            <TableRow key={assign.userId}>
                              <TableCell className="font-medium">{assign.userId.slice(0, 8)}...</TableCell>
                              <TableCell className="font-bold">
                                ${assign.amount.toFixed(2)}
                                {typeof assign.targetDeficit === 'number' && assign.targetDeficit > 0 ? (
                                  <p className="text-xs font-normal text-gray-500">Target deficit: ${assign.targetDeficit.toFixed(2)}</p>
                                ) : null}
                              </TableCell>
                              <TableCell>#{assign.position}</TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    assign.isFrozen
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {assign.isFrozen ? 'Frozen' : 'Active'}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(assign.assignedAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : null}

              {error && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      {showRevokeModal && revokeTarget && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white">
              <h3 className="text-lg font-bold">Revoke Premium Assignment</h3>
              <p className="text-xs opacity-90">User: {revokeTarget.userName || revokeTarget.userId}</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700">
                This removes the premium assignment for this user. Continue?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowRevokeModal(false);
                    setRevokeTarget(null);
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleRevoke}
                  disabled={loading}
                >
                  {loading ? 'Revoking...' : 'Confirm Revoke'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
