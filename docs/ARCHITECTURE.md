
# TaskFlow Architecture & RBAC Design

## Role Matrix
| Role | View Tasks | Create Tasks | Assign Tasks | Edit Any Task | Delete Tasks | Manage Users |
|---|---|---|---|---|---|---|
| ADMIN | Yes | Yes | Yes | Yes | Yes | Yes |
| MANAGER | Yes | Yes | Yes | Yes | No | No |
| MEMBER | Yes | Yes (own) | No | Own only | No | No |
