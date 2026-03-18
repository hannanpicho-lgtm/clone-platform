# Premium Deficit Assignment Rule

Updated: 2026-03-19
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
- Admin assigns a target deficit amount and encounter position to a user.
- Assignment is stored under `premiumAssignment` on the user profile.
- The control field is `targetDeficit`; the final premium amount is not locked until encounter time.

2. Encounter behavior
- When the assigned premium task is encountered, the premium amount is computed from the user's live balance:
  - `premiumAmount = liveBalance + targetDeficit`
  - `balanceAfterEncounter = liveBalance - premiumAmount = -targetDeficit`
- Account freeze is then enforced using that computed encounter amount.
- Top-up required equals the configured target deficit.
- User balance is represented as negative while frozen.

3. Display behavior
- Admin and user UI should label this flow as `Premium Deficit Assignment`.
- Deficit amount should be shown as required top-up shortfall when frozen.

4. Unfreeze behavior
- Unfreeze releases the hold and recalculates the active balance using preserved assignment snapshot values.
- Task progress is preserved and resumed from the prior checkpoint.
- Because encounter amount is derived at task time, balance changes before task 11 are respected automatically.

## Validation Rules

- Target deficit amount must be a positive number.
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
4. Confirm top-up required equals target deficit and negative balance display logic is exact.
5. Unfreeze user and verify balance/task progression resumes correctly.

## Example

- Live balance `B = 120`
- Target deficit `D = 100`
- Encounter amount `P = B + D = 220`
- Frozen balance shown after encounter: `B - P = -100`
