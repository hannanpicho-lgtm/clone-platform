import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Users,
  DollarSign,
  TrendingUp,
  Shield,
  LogOut,
  Search,
  MessageSquare,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gift,
  Crown,
  Zap,
  BarChart3,
  Settings,
  RefreshCw,
  Link2,
  Ticket,
  UserPlus,
  Copy,
} from 'lucide-react';
import { safeFetch } from '/src/utils/safeFetch';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { PremiumManagementPanel } from './PremiumManagementPanel';

interface AdminDashboardProps {
  onLogout: () => void;
}

interface User {
  id: string;
  email: string;
  name: string;
  vipTier: string;
  balance: number;
  productsSubmitted: number;
  accountFrozen: boolean;
  freezeAmount?: number;
  createdAt: string;
}

interface Transaction {
  id: string;
  userId: string;
  userName: string;
  productName: string;
  commission: number;
  timestamp: string;
  status: string;
}

interface PlatformMetrics {
  totalUsers: number;
  totalRevenue: number;
  totalTransactions: number;
  activeUsers: number;
  frozenAccounts: number;
  totalCommissionsPaid: number;
}

interface InvitationCode {
  code: string;
  owner: string;
  referrals: number;
  status: 'active' | 'disabled';
  generatedAt: string;
}

interface SupportCase {
  id: string;
  userName: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  updatedAt: string;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'premium' | 'invitations' | 'customer-service' | 'settings'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [supportCases, setSupportCases] = useState<SupportCase[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalUsers: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    activeUsers: 0,
    frozenAccounts: 0,
    totalCommissionsPaid: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const buildTrainingInvitationCodes = (sourceUsers: User[]): InvitationCode[] => {
    const fallbackOwners = sourceUsers.length > 0 ? sourceUsers : [
      { id: '1', name: 'Training User', email: '', vipTier: 'Normal', balance: 0, productsSubmitted: 0, accountFrozen: false, createdAt: '2026-02-23' }
    ];

    return fallbackOwners.slice(0, 5).map((user, index) => ({
      code: `${user.name.replace(/\s+/g, '').toUpperCase().slice(0, 6)}-${String(index + 1).padStart(2, '0')}`,
      owner: user.name,
      referrals: Math.max(0, Math.floor(user.productsSubmitted / 8)),
      status: index < 4 ? 'active' : 'disabled',
      generatedAt: user.createdAt,
    }));
  };

  const buildTrainingSupportCases = (sourceUsers: User[]): SupportCase[] => {
    const caseUsers = sourceUsers.length > 0 ? sourceUsers : [
      { id: '1', name: 'Training User', email: '', vipTier: 'Normal', balance: 0, productsSubmitted: 0, accountFrozen: false, createdAt: '2026-02-23' }
    ];

    return caseUsers.slice(0, 4).map((user, index) => ({
      id: `CS-${1000 + index}`,
      userName: user.name,
      category: index % 2 === 0 ? 'Referral Issue' : 'Withdrawal Help',
      priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
      status: index === 0 ? 'open' : index === 1 ? 'in_progress' : 'resolved',
      updatedAt: index === 0 ? '5 min ago' : index === 1 ? '20 min ago' : '1h ago',
    }));
  };

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // Try to fetch from backend
      const usersResponse = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (usersResponse.ok) {
        const data = await usersResponse.json();
        const backendUsers = data.users || [];
        setUsers(backendUsers);
        setMetrics(data.metrics);
        setInvitationCodes(buildTrainingInvitationCodes(backendUsers));
        setDemoMode(false);

        try {
          const supportResponse = await safeFetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/support-tickets`,
            {
              headers: {
                Authorization: `Bearer ${publicAnonKey}`,
              },
            }
          );

          if (supportResponse.ok) {
            const supportData = await supportResponse.json();
            if (supportData.tickets && Array.isArray(supportData.tickets)) {
              setSupportCases(
                supportData.tickets.slice(0, 10).map((ticket: any, index: number) => ({
                  id: ticket.id || `CS-${2000 + index}`,
                  userName: ticket.userName || ticket.user || 'Unknown User',
                  category: ticket.category || 'General',
                  priority: (ticket.priority || 'medium') as 'high' | 'medium' | 'low',
                  status: (ticket.status === 'pending' ? 'open' : ticket.status === 'in_progress' ? 'in_progress' : ticket.status === 'resolved' ? 'resolved' : 'open') as 'open' | 'in_progress' | 'resolved',
                  updatedAt: ticket.updatedAt || ticket.createdAt || 'recently',
                }))
              );
            } else {
              setSupportCases(buildTrainingSupportCases(backendUsers));
            }
          } else {
            setSupportCases(buildTrainingSupportCases(backendUsers));
          }
        } catch {
          setSupportCases(buildTrainingSupportCases(backendUsers));
        }
      } else {
        throw new Error('Backend not available');
      }
    } catch (err) {
      // Use demo data
      loadDemoData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemoData = () => {
    // Demo users
    const demoUsers: User[] = [
      {
        id: '1',
        email: 'john@example.com',
        name: 'John Smith',
        vipTier: 'Gold',
        balance: 15334,
        productsSubmitted: 42,
        accountFrozen: false,
        createdAt: '2024-01-15',
      },
      {
        id: '2',
        email: 'sarah@example.com',
        name: 'Sarah Johnson',
        vipTier: 'Platinum',
        balance: -7000,
        productsSubmitted: 27,
        accountFrozen: true,
        freezeAmount: 10000,
        createdAt: '2024-02-01',
      },
      {
        id: '3',
        email: 'mike@example.com',
        name: 'Mike Chen',
        vipTier: 'Diamond',
        balance: 45280,
        productsSubmitted: 55,
        accountFrozen: false,
        createdAt: '2024-01-10',
      },
      {
        id: '4',
        email: 'emma@example.com',
        name: 'Emma Wilson',
        vipTier: 'Silver',
        balance: 8450,
        productsSubmitted: 35,
        accountFrozen: false,
        createdAt: '2024-02-10',
      },
      {
        id: '5',
        email: 'david@example.com',
        name: 'David Brown',
        vipTier: 'Normal',
        balance: 3200,
        productsSubmitted: 22,
        accountFrozen: false,
        createdAt: '2024-02-14',
      },
    ];

    // Demo transactions
    const demoTransactions: Transaction[] = [
      {
        id: 't1',
        userId: '1',
        userName: 'John Smith',
        productName: 'Premium Headphones',
        commission: 125.50,
        timestamp: '2024-02-16 14:32',
        status: 'approved',
      },
      {
        id: 't2',
        userId: '3',
        userName: 'Mike Chen',
        productName: 'Smart Watch',
        commission: 89.99,
        timestamp: '2024-02-16 13:15',
        status: 'approved',
      },
      {
        id: 't3',
        userId: '2',
        userName: 'Sarah Johnson',
        productName: 'Premium Merged Product',
        commission: 1500.00,
        timestamp: '2024-02-16 12:00',
        status: 'pending',
      },
      {
        id: 't4',
        userId: '4',
        userName: 'Emma Wilson',
        productName: 'Wireless Keyboard',
        commission: 45.75,
        timestamp: '2024-02-16 11:45',
        status: 'approved',
      },
      {
        id: 't5',
        userId: '1',
        userName: 'John Smith',
        productName: 'Gaming Mouse',
        commission: 67.20,
        timestamp: '2024-02-16 10:30',
        status: 'approved',
      },
    ];

    setUsers(demoUsers);
    setTransactions(demoTransactions);
    setInvitationCodes(buildTrainingInvitationCodes(demoUsers));
    setSupportCases(buildTrainingSupportCases(demoUsers));
    setMetrics({
      totalUsers: demoUsers.length,
      totalRevenue: 234567.89,
      totalTransactions: 523,
      activeUsers: 4,
      frozenAccounts: 1,
      totalCommissionsPaid: 45780.45,
    });
    setDemoMode(true);
  };

  const handleUnfreezeAccount = async (userId: string) => {
    if (demoMode) {
      // Demo mode - update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, accountFrozen: false, balance: Math.abs(user.balance) + (user.freezeAmount || 0) + 150 }
          : user
      ));
      alert('✅ Account unfrozen successfully (Demo Mode)');
    } else {
      // Backend mode
      try {
        const response = await safeFetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/unfreeze`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
          }
        );

        if (response.ok) {
          loadAdminData();
          alert('✅ Account unfrozen successfully');
        } else {
          alert('❌ Failed to unfreeze account');
        }
      } catch (err) {
        alert('❌ Error unfreezing account');
      }
    }
  };

  const handleUpdateVIPTier = async (userId: string, newTier: string) => {
    if (demoMode) {
      setUsers(users.map(user => 
        user.id === userId ? { ...user, vipTier: newTier } : user
      ));
      alert(`✅ VIP tier updated to ${newTier} (Demo Mode)`);
    } else {
      try {
        const response = await safeFetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/vip-tier`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, vipTier: newTier }),
          }
        );

        if (response.ok) {
          loadAdminData();
          setSelectedUser(prev => prev ? { ...prev, vipTier: newTier } : prev);
          alert(`✅ VIP tier updated to ${newTier}`);
        } else {
          const errorData = await response.json().catch(() => ({}));
          alert(`❌ Failed to update VIP tier${errorData?.error ? `: ${errorData.error}` : ''}`);
        }
      } catch (err) {
        alert('❌ Error updating VIP tier');
      }
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      'Normal': 'bg-gray-100 text-gray-800 border-gray-300',
      'Silver': 'bg-slate-100 text-slate-800 border-slate-300',
      'Gold': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Platinum': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'Diamond': 'bg-purple-100 text-purple-800 border-purple-300',
    };
    return colors[tier] || colors['Normal'];
  };

  const getStatusColor = (status: string) => {
    return status === 'approved' 
      ? 'bg-green-100 text-green-800 border-green-300'
      : 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  const getCaseStatusColor = (status: SupportCase['status']) => {
    if (status === 'resolved') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'in_progress') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getPriorityColor = (priority: SupportCase['priority']) => {
    if (priority === 'high') return 'text-red-700';
    if (priority === 'medium') return 'text-yellow-700';
    return 'text-green-700';
  };

  const handleToggleInvitationCode = (code: string) => {
    setInvitationCodes(prev => prev.map(item =>
      item.code === code
        ? { ...item, status: item.status === 'active' ? 'disabled' : 'active' }
        : item
    ));
  };

  const handleAddInvitationCode = () => {
    const nextCode: InvitationCode = {
      code: `BETA-${Date.now().toString().slice(-6)}`,
      owner: 'Admin',
      referrals: 0,
      status: 'active',
      generatedAt: new Date().toLocaleString(),
    };
    setInvitationCodes(prev => [nextCode, ...prev]);
  };

  const handleUpdateCaseStatus = (id: string, nextStatus: SupportCase['status']) => {
    setSupportCases(prev => prev.map(item =>
      item.id === id ? { ...item, status: nextStatus, updatedAt: 'just now' } : item
    ));
  };

  const activeInvitationCount = invitationCodes.filter(item => item.status === 'active').length;
  const openSupportCount = supportCases.filter(item => item.status !== 'resolved').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
                <p className="text-xs text-gray-500">Tanknewmedia Platform Management</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {demoMode && (
                <div className="px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-full">
                  <p className="text-xs font-medium text-yellow-800">Demo Mode</p>
                </div>
              )}
              <Button
                onClick={onLogout}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'transactions', label: 'Transactions', icon: Activity },
              { id: 'premium', label: 'Premium Products', icon: Gift },
              { id: 'invitations', label: 'Invitations', icon: UserPlus },
              { id: 'customer-service', label: 'Customer Service', icon: MessageSquare },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Users</p>
                        <p className="text-3xl font-bold text-white mt-1">{metrics.totalUsers}</p>
                        <p className="text-blue-100 text-xs mt-1">↑ 12% from last month</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                        <p className="text-3xl font-bold text-white mt-1">${metrics.totalRevenue.toLocaleString()}</p>
                        <p className="text-green-100 text-xs mt-1">↑ 24% from last month</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Total Transactions</p>
                        <p className="text-3xl font-bold text-white mt-1">{metrics.totalTransactions}</p>
                        <p className="text-purple-100 text-xs mt-1">↑ 18% from last month</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">Active Users</p>
                        <p className="text-3xl font-bold text-white mt-1">{metrics.activeUsers}</p>
                        <p className="text-orange-100 text-xs mt-1">Active in last 7 days</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-100 text-sm font-medium">Frozen Accounts</p>
                        <p className="text-3xl font-bold text-white mt-1">{metrics.frozenAccounts}</p>
                        <p className="text-red-100 text-xs mt-1">Require attention</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-500 to-cyan-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-cyan-100 text-sm font-medium">Commissions Paid</p>
                        <p className="text-3xl font-bold text-white mt-1">${metrics.totalCommissionsPaid.toLocaleString()}</p>
                        <p className="text-cyan-100 text-xs mt-1">Lifetime total</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-indigo-100 text-sm font-medium">Active Invite Codes</p>
                        <p className="text-3xl font-bold text-white mt-1">{activeInvitationCount}</p>
                        <p className="text-indigo-100 text-xs mt-1">Invitation system status</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <Link2 className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-500 to-pink-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-pink-100 text-sm font-medium">Open Support Cases</p>
                        <p className="text-3xl font-bold text-white mt-1">{openSupportCount}</p>
                        <p className="text-pink-100 text-xs mt-1">Customer service workload</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <Ticket className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <Button
                      onClick={() => setActiveTab('users')}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Manage Users
                    </Button>
                    <Button
                      onClick={() => setActiveTab('premium')}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Assign Premium
                    </Button>
                    <Button
                      onClick={() => setActiveTab('invitations')}
                      className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white"
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Invitation Codes
                    </Button>
                    <Button
                      onClick={() => setActiveTab('customer-service')}
                      className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Customer Service
                    </Button>
                    <Button
                      onClick={loadAdminData}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Transactions</h3>
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{transaction.userName}</p>
                            <p className="text-sm text-gray-500">{transaction.productName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${transaction.commission.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{transaction.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Search Bar */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Users Table */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VIP Tier</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <p className="font-medium text-gray-900">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTierColor(user.vipTier)}`}>
                                {user.vipTier}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`font-bold ${user.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ${user.balance.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-gray-900">{user.productsSubmitted}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.accountFrozen ? (
                                <span className="flex items-center gap-1 text-red-600">
                                  <XCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">Frozen</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">Active</span>
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {user.accountFrozen && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUnfreezeAccount(user.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    Unfreeze
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserDetails(true);
                                  }}
                                >
                                  Details
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">All Transactions</h3>
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{transaction.productName}</p>
                            <p className="text-sm text-gray-500">{transaction.userName}</p>
                            <p className="text-xs text-gray-400 mt-1">{transaction.timestamp}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-xl text-green-600 mb-1">
                            ${transaction.commission.toFixed(2)}
                          </p>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'premium' && (
            <motion.div
              key="premium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <PremiumManagementPanel />
            </motion.div>
          )}

          {activeTab === 'invitations' && (
            <motion.div
              key="invitations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Invitation Code Management</h3>
                    <Button onClick={handleAddInvitationCode} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Generate Code
                    </Button>
                  </div>
                  {demoMode && (
                    <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 mb-4">
                      ⚠️ Training mode: invitation data is simulated when backend data is unavailable.
                    </p>
                  )}

                  <div className="space-y-3">
                    {invitationCodes.map((item) => (
                      <div key={item.code} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-semibold text-gray-900">{item.code}</p>
                          <p className="text-sm text-gray-600">Owner: {item.owner} • Referrals: {item.referrals}</p>
                          <p className="text-xs text-gray-500 mt-1">Generated: {item.generatedAt}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(item.code)}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleToggleInvitationCode(item.code)}
                            className={item.status === 'active' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
                          >
                            {item.status === 'active' ? 'Disable' : 'Enable'}
                          </Button>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            item.status === 'active'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : 'bg-gray-100 text-gray-800 border-gray-300'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'customer-service' && (
            <motion.div
              key="customer-service"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Customer Service Cases</h3>
                    <div className="text-sm font-medium text-gray-600">
                      Open: <span className="text-red-600">{openSupportCount}</span>
                    </div>
                  </div>
                  {demoMode && (
                    <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 mb-4">
                      ⚠️ Training mode: support cases are simulated when backend data is unavailable.
                    </p>
                  )}

                  <div className="space-y-3">
                    {supportCases.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-semibold text-gray-900">{item.id} • {item.userName}</p>
                          <p className="text-sm text-gray-600">{item.category}</p>
                          <p className={`text-xs mt-1 font-semibold ${getPriorityColor(item.priority)}`}>
                            Priority: {item.priority}
                          </p>
                          <p className="text-xs text-gray-500">Updated: {item.updatedAt}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => handleUpdateCaseStatus(item.id, 'in_progress')}>
                            In Progress
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateCaseStatus(item.id, 'resolved')}>
                            Resolve
                          </Button>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCaseStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Platform Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Backend Status</h4>
                      <p className="text-sm text-blue-800 mb-2">
                        {demoMode ? '⚠️ Running in Demo Mode' : '✅ Connected to Supabase Backend'}
                      </p>
                      {demoMode && (
                        <p className="text-xs text-blue-700">
                          Deploy the Edge Function to Supabase to enable full backend functionality.
                        </p>
                      )}
                    </div>

                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">VIP Tiers Configuration</h4>
                      <div className="space-y-2 text-sm text-purple-800">
                        <p>• Normal: 0.5% commission, 35 products, $99</p>
                        <p>• Silver: 0.8% commission, 40 products, $999</p>
                        <p>• Gold: 1.0% commission, 45 products, $2,999</p>
                        <p>• Platinum: 1.2% commission, 50 products, $4,999</p>
                        <p>• Diamond: 1.5% commission, 55 products, $9,999</p>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">API Endpoints</h4>
                      <div className="space-y-1 text-xs text-green-800 font-mono">
                        <p>/make-server-44a642d3/admin/users - Get all users</p>
                        <p>/make-server-44a642d3/admin/unfreeze - Unfreeze account</p>
                        <p>/make-server-44a642d3/admin/premium - Assign premium</p>
                        <p>/make-server-44a642d3/admin/metrics - Get metrics</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserDetails && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowUserDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900">User Details</h3>
              </div>

              <div className="p-6 space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">VIP Tier</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getTierColor(selectedUser.vipTier)}`}>
                      {selectedUser.vipTier}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Balance</p>
                    <p className={`font-bold text-lg ${selectedUser.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${selectedUser.balance.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Products Submitted</p>
                    <p className="font-semibold text-gray-900">{selectedUser.productsSubmitted}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Account Status</p>
                    <p className={`font-semibold ${selectedUser.accountFrozen ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedUser.accountFrozen ? 'Frozen' : 'Active'}
                    </p>
                  </div>
                </div>

                {/* VIP Tier Management */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Change VIP Tier</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {['Normal', 'Silver', 'Gold', 'Platinum', 'Diamond'].map((tier) => (
                      <Button
                        key={tier}
                        size="sm"
                        onClick={() => handleUpdateVIPTier(selectedUser.id, tier)}
                        className={selectedUser.vipTier === tier ? 'bg-purple-600 text-white' : ''}
                        variant={selectedUser.vipTier === tier ? 'default' : 'outline'}
                      >
                        {tier}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end">
                <Button onClick={() => setShowUserDetails(false)} variant="outline">
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}