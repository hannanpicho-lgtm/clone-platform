import { Badge } from '../../components/ui/badge';

export type AdminUserStatusValue =
  | 'active'
  | 'frozen'
  | 'suspended'
  | 'disabled'
  | 'revoked'
  | string;

interface AdminStatusBadgeProps {
  status: AdminUserStatusValue;
}

export function AdminStatusBadge({ status }: AdminStatusBadgeProps) {
  switch (status) {
    case 'active':
      return <Badge variant="default">Active</Badge>;
    case 'frozen':
      return <Badge variant="secondary">Frozen</Badge>;
    case 'suspended':
    case 'disabled':
      return <Badge variant="destructive">Suspended</Badge>;
    case 'revoked':
      return <Badge variant="destructive">Revoked</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

/** Derive a status string from user flags then render a badge. */
export function UserAccountStatusBadge({
  accountDisabled,
  accountFrozen,
}: {
  accountDisabled?: boolean;
  accountFrozen?: boolean;
}) {
  if (accountDisabled) return <AdminStatusBadge status="suspended" />;
  if (accountFrozen) return <AdminStatusBadge status="frozen" />;
  return <AdminStatusBadge status="active" />;
}
