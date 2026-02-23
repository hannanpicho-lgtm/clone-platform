import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  Settings, BarChart3, Users, CreditCard, Activity, LogOut, 
  Search, Edit2, Trash2, CheckCircle, XCircle, AlertCircle, 
  TrendingUp, Lock, Globe, Database
} from 'lucide-react';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  balance: number;
  vipTier: string;
  productsSubmitted: number;
  accountFrozen: boolean;
  joinDate: string;
  lastActive: string;
  totalProfit: number;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  amount: number;
  method: 'banking' | 'crypto';
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  processedDate?: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalBalance: string;
  totalProfit: string;
  pendingWithdrawals: number;
  frozenAccounts: number;
  averageVIPTier: string;
}

export function AdminControlPanel({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'withdrawals' | 'products' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 342,
    activeUsers: 187,
    totalBalance: '$1,245,680.50',
    totalProfit: '$89,450.25',
    pendingWithdrawals: 12,
    frozenAccounts: 3,
    averageVIPTier: 'Gold'
  });

  const [users, setUsers] = useState<AdminUser[]>([
    {
      id: '1',
      username: 'john_doe',
      email: 'john@example.com',
      balance: 15000,
      vipTier: 'Platinum',
      productsSubmitted: 42,
      accountFrozen: false,
      joinDate: '2025-08-15',
      lastActive: '2 minutes ago',
      totalProfit: 4250.75
    },
    {
      id: '2',
      username: 'jane_smith',
      email: 'jane@example.com',
      balance: 8500,
      vipTier: 'Gold',
      productsSubmitted: 28,
      accountFrozen: true,
      joinDate: '2025-09-22',
      lastActive: '1 hour ago',
      totalProfit: 1890.50
    },
    {
      id: '3',
      username: 'bob_wilson',
      email: 'bob@example.com',
      balance: 3200,
      vipTier: 'Silver',
      productsSubmitted: 15,
      accountFrozen: false,
      joinDate: '2025-10-05',
      lastActive: '5 minutes ago',
      totalProfit: 450.00
    }
  ]);

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([
    {
      id: 'W001',
      userId: '1',
      username: 'john_doe',
      amount: 5000,
      method: 'banking',
      status: 'pending',
      requestDate: '2025-12-20 14:30'
    },
    {
      id: 'W002',
      userId: '2',
      username: 'jane_smith',
      amount: 2500,
      method: 'crypto',
      status: 'approved',
      requestDate: '2025-12-19 10:15',
      processedDate: '2025-12-19 15:45'
    },
    {
      id: 'W003',
      userId: '3',
      username: 'bob_wilson',
      amount: 1000,
      method: 'banking',
      status: 'rejected',
      requestDate: '2025-12-18 09:00',
      processedDate: '2025-12-18 16:30'
    }
  ]);

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApproveWithdrawal = (id: string) => {
    setWithdrawals(prev => prev.map(w => 
      w.id === id ? { ...w, status: 'approved', processedDate: new Date().toLocaleString() } : w
    ));
  };

  const handleRejectWithdrawal = (id: string) => {
    setWithdrawals(prev => prev.map(w => 
      w.id === id ? { ...w, status: 'rejected', processedDate: new Date().toLocaleString() } : w
    ));
  };

  const handleFreezeAccount = (userId: string) => {
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, accountFrozen: true } : u
    ));
  };

  const handleUnfreezeAccount = (userId: string) => {
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, accountFrozen: false } : u
    ));
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <Settings className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Admin Control Panel
            </h1>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-t border-slate-700/50">
          {[
            { id: 'dashboard', label: '📊 Dashboard', icon: BarChart3 },
            { id: 'users', label: '👥 Users', icon: Users },
            { id: 'withdrawals', label: '💰 Withdrawals', icon: CreditCard },
            { id: 'products', label: '🎁 Products', icon: Activity },
            { id: 'settings', label: '⚙️ Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold mb-6">System Overview</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'from-blue-500 to-blue-600' },
                { label: 'Active Users', value: stats.activeUsers, icon: Activity, color: 'from-green-500 to-green-600' },
                { label: 'Total Balance', value: stats.totalBalance, icon: CreditCard, color: 'from-purple-500 to-purple-600' },
                { label: 'Total Profit', value: stats.totalProfit, icon: TrendingUp, color: 'from-yellow-500 to-yellow-600' },
                { label: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: AlertCircle, color: 'from-orange-500 to-orange-600' },
                { label: 'Frozen Accounts', value: stats.frozenAccounts, icon: Lock, color: 'from-red-500 to-red-600' }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                          <p className="text-3xl font-bold text-white">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color}`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recent Activity */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'withdrawal', user: 'john_doe', amount: '$5,000', time: '2 minutes ago', status: 'pending' },
                    { type: 'product', user: 'jane_smith', amount: '+$150', time: '15 minutes ago', status: 'completed' },
                    { type: 'freeze', user: 'bob_wilson', amount: 'Account Frozen', time: '1 hour ago', status: 'warning' },
                    { type: 'signup', user: 'sarah_jones', amount: 'New User', time: '2 hours ago', status: 'new' }
                  ].map((activity, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div>
                        <p className="font-medium">{activity.user}</p>
                        <p className="text-sm text-gray-400">{activity.amount}</p>
                      </div>
                      <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">User Management</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-gray-300">Username</th>
                    <th className="text-left py-3 px-4 text-gray-300">Email</th>
                    <th className="text-left py-3 px-4 text-gray-300">Balance</th>
                    <th className="text-left py-3 px-4 text-gray-300">VIP Tier</th>
                    <th className="text-left py-3 px-4 text-gray-300">Total Profit</th>
                    <th className="text-left py-3 px-4 text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{user.username}</td>
                      <td className="py-3 px-4 text-gray-400">{user.email}</td>
                      <td className="py-3 px-4 text-green-400">${user.balance.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.vipTier === 'Platinum' ? 'bg-purple-500/20 text-purple-300' :
                          user.vipTier === 'Gold' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {user.vipTier}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-yellow-400">${user.totalProfit.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        {user.accountFrozen ? (
                          <span className="flex items-center space-x-1 text-red-400">
                            <Lock className="w-4 h-4" />
                            <span>Frozen</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 hover:bg-slate-600 rounded transition-colors">
                            <Edit2 className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            onClick={() => user.accountFrozen ? handleUnfreezeAccount(user.id) : handleFreezeAccount(user.id)}
                            className="p-1 hover:bg-slate-600 rounded transition-colors"
                          >
                            <Lock className={`w-4 h-4 ${user.accountFrozen ? 'text-red-400' : 'text-yellow-400'}`} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1 hover:bg-slate-600 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Withdrawal Requests</h2>
              <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                <span>{withdrawals.filter(w => w.status === 'pending').length} Pending</span>
              </div>
            </div>

            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div>
                            <p className="font-bold text-lg">{withdrawal.username}</p>
                            <p className="text-sm text-gray-400">{withdrawal.method === 'banking' ? '🏦 Banking' : '₿ Cryptocurrency'}</p>
                          </div>
                          <div className="ml-auto text-right">
                            <p className="text-2xl font-bold text-green-400">${withdrawal.amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">{withdrawal.requestDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <span>Request ID: {withdrawal.id}</span>
                          {withdrawal.processedDate && (
                            <>
                              <span>•</span>
                              <span>Processed: {withdrawal.processedDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {withdrawal.status === 'pending' ? (
                          <>
                            <Button
                              onClick={() => handleApproveWithdrawal(withdrawal.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              ✓ Approve
                            </Button>
                            <Button
                              onClick={() => handleRejectWithdrawal(withdrawal.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              ✗ Reject
                            </Button>
                          </>
                        ) : (
                          <span className={`px-3 py-1 rounded-lg font-medium text-sm ${
                            withdrawal.status === 'approved' 
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            {withdrawal.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold mb-6">Premium Products Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { position: 3, amount: 20000, triggered: 2, revenue: '$30,000' },
                { position: 5, amount: 25000, triggered: 1, revenue: '$25,000' },
                { position: 10, amount: 30000, triggered: 0, revenue: '$0' },
                { position: 15, amount: 35000, triggered: 0, revenue: '$0' }
              ].map((product, i) => (
                <Card key={i} className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle>Position #{product.position}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Product Amount</span>
                      <span className="font-bold text-yellow-400">${product.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Times Triggered</span>
                      <span className="font-bold text-green-400">{product.triggered}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Revenue</span>
                      <span className="font-bold text-blue-400">{product.revenue}</span>
                    </div>
                    <Button variant="outline" className="w-full">
                      Edit Product
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle>Add New Premium Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
                    <input
                      type="number"
                      placeholder="e.g., 20"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount ($)</label>
                    <input
                      type="number"
                      placeholder="e.g., 40000"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  ➕ Add Premium Product
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-2xl"
          >
            <h2 className="text-2xl font-bold mb-6">System Settings</h2>

            {/* Security Settings */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>Security & Access</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span>Two-Factor Authentication</span>
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      <span className="text-green-400">Enabled</span>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span>Email Verification Required</span>
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      <span className="text-green-400">Enabled</span>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span>IP Whitelist</span>
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-gray-400">Disabled</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Configuration */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>System Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Platform Commission Rate (%)</label>
                  <input
                    type="number"
                    placeholder="2.5"
                    step="0.1"
                    defaultValue="2.5"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Withdrawal Amount ($)</label>
                  <input
                    type="number"
                    placeholder="100"
                    defaultValue="100"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Maximum Daily Withdrawal ($)</label>
                  <input
                    type="number"
                    placeholder="100000"
                    defaultValue="100000"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Backup & Database */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Maintenance & Backup</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  💾 Backup Database Now
                </Button>
                <Button className="w-full bg-yellow-600 hover:bg-yellow-700">
                  🔄 Restart Application
                </Button>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  📊 Export System Logs
                </Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="bg-red-950/30 border-red-900/50">
              <CardHeader>
                <CardTitle className="text-red-400">⚠️ Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-red-700 hover:bg-red-800">
                  🗑️ Clear All Demo Data
                </Button>
                <Button className="w-full bg-red-800 hover:bg-red-900">
                  💥 Hard Reset System
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
