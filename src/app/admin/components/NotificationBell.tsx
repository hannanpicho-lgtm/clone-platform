import { useState } from 'react';
import { Bell, MessageSquare, Wallet, UserX, Gift, Users, Info, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Button } from '../../components/ui/button';
import type { AdminAlertItem } from '../types';

interface NotificationBellProps {
  notifications: AdminAlertItem[];
  readIds: string[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

function getIcon(type: AdminAlertItem['type']) {
  switch (type) {
    case 'support_ticket':
      return <MessageSquare className="h-4 w-4 text-blue-500 shrink-0" />;
    case 'withdrawal_pending':
    case 'withdrawal_approved':
    case 'withdrawal_denied':
      return <Wallet className="h-4 w-4 text-amber-500 shrink-0" />;
    case 'frozen_account':
      return <UserX className="h-4 w-4 text-red-500 shrink-0" />;
    case 'premium_assignment':
      return <Gift className="h-4 w-4 text-purple-500 shrink-0" />;
    case 'new_referral':
      return <Users className="h-4 w-4 text-green-500 shrink-0" />;
    default:
      return <Info className="h-4 w-4 text-slate-400 shrink-0" />;
  }
}

function getRoute(type: AdminAlertItem['type']): string {
  switch (type) {
    case 'support_ticket':
      return '/admin/customer-service';
    case 'withdrawal_pending':
    case 'withdrawal_approved':
    case 'withdrawal_denied':
      return '/admin/withdrawals';
    case 'frozen_account':
      return '/admin/users';
    case 'premium_assignment':
      return '/admin/premium';
    case 'new_referral':
      return '/admin/dashboard';
    default:
      return '/admin/dashboard';
  }
}

function getSeverityBar(severity: AdminAlertItem['severity']): string {
  switch (severity) {
    case 'critical':
      return 'border-l-2 border-l-red-500';
    case 'high':
      return 'border-l-2 border-l-amber-500';
    case 'medium':
      return 'border-l-2 border-l-blue-400';
    default:
      return 'border-l-2 border-l-slate-200';
  }
}

function timeAgo(isoString: string): string {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell({ notifications, readIds, onMarkAllRead, onMarkRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const handleClick = (n: AdminAlertItem) => {
    onMarkRead(n.id);
    setOpen(false);
    window.location.href = getRoute(n.type);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0 text-slate-600 hover:text-slate-900"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-0.5 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 shadow-lg" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="text-sm font-semibold text-slate-800">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1 text-xs font-semibold text-red-700">
                {unreadCount}
              </span>
            )}
          </span>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
              onClick={onMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-50">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="h-8 w-8 text-slate-200" />
              <p className="text-sm text-slate-400">No notifications yet</p>
            </div>
          ) : (
            sorted.map((n) => {
              const isUnread = !readIds.includes(n.id);
              return (
                <button
                  key={n.id}
                  type="button"
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${getSeverityBar(n.severity)} ${isUnread ? 'bg-blue-50/50' : 'bg-white'}`}
                  onClick={() => handleClick(n)}
                >
                  <span className="mt-0.5">{getIcon(n.type)}</span>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {n.title}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</div>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {sorted.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-2.5 text-center">
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
              onClick={() => { setOpen(false); window.location.href = '/admin/dashboard'; }}
            >
              View all in Dashboard
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
