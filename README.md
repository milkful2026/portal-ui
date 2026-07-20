# Milkful — Admin Portal (portal-ui)

React **admin / back-office** web application for Milkful operations staff. Covers user
management, catalog, orders, subscriptions, delivery routes, offers, CRM/support, RBAC,
reporting, and system configuration.

**Status:** scaffold only — no application code implemented yet.

**Stack:** React, TypeScript

**Jira Epic:** [MA-20 Admin UI](https://milkfuldairyindia.atlassian.net/browse/MA-20)
**Jira board:** [MA Backlog](https://milkfuldairyindia.atlassian.net/jira/software/projects/MA/boards/1/backlog)

## Related repos

| Repo | Purpose |
|------|---------|
| [`milkful2026/specs`](https://github.com/milkful2026/specs) | SDD specifications for this app (source of truth before implementation) |
| [`milkful2026/milkful-app`](https://github.com/milkful2026/milkful-app) | Design docs, architecture diagrams, SDD agent instructions |
| [`milkful2026/services`](https://github.com/milkful2026/services) | Backend APIs this app consumes |

## SDD conventions (React)

- E2E / acceptance tests as **Playwright** scenarios (Given / Steps / Outcome / Selectors).
- Selector priority: `getByRole` > `getByText` > `getByLabel` > `getByTestId` — never CSS classes.
- Specs include a **UI Component Map** and **Responsive Behavior** table.
- WCAG AA: keyboard navigation, ARIA labels, focus management.

## Implementation workflow

1. Specs are drafted per the SDD process in [`milkful2026/specs`](https://github.com/milkful2026/specs) (`portal-ui/tasks/MA/{STORY-KEY}/{SPEC-KEY}.md`).
2. Once a spec is `Spec: In Review` / approved, implementation begins here against that spec.
