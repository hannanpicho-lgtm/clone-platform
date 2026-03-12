# Premium Deficit Assignment Rule

Updated: 2026-03-10
Status: Production rule

## Purpose

Define the current business behavior for admin-driven premium assignment, including user balance display, freeze/unfreeze behavior, and compatibility constraints.

## Canonical Term

- Use `Premium Deficit Assignment` in user-facing/admin-facing language.
- Keep existing API route and permission identifiers unchanged for compatibility:
  - `POST /admin/users/assign-premium`
  - `POST /admin/premium`
  - `users.assign_premium`

## Rule Definition

1. Assignment behavior
- Admin assigns a deficit amount and encounter position to a user.
- Assignment is stored under `premiumAssignment` on the user profile.

2. Encounter behavior
- When the assigned premium task is encountered, account freeze is enforced.
- Top-up required is based on assignment total deficit amount.
- User balance is represented as negative while frozen.

3. Display behavior
- Admin and user UI should label this flow as `Premium Deficit Assignment`.
- Deficit amount should be shown as required top-up shortfall when frozen.

4. Unfreeze behavior
- Unfreeze releases the hold and recalculates the active balance using preserved assignment snapshot values.
- Task progress is preserved and resumed from the prior checkpoint.

## Validation Rules

- Deficit amount must be a positive number.
- Deficit position must be a positive integer.
- Selected product must exist if a specific product is provided.

## Operational Notes

- Do not rename backend route paths or permission keys without coordinated migration.
- UI wording may change independently from backend identifiers.
- Alerts/audit text should use `premium deficit assignment` wording.

## Testing Checklist

1. Assign deficit from admin UI and verify success message.
2. Verify assignment appears in admin list/alerts with new wording.
3. Trigger encounter and verify account is frozen.
4. Confirm top-up required and negative balance display logic.
5. Unfreeze user and verify balance/task progression resumes correctly.
