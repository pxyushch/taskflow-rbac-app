
# TaskFlow REST API Reference

## Endpoints
- `POST /api/auth/login` - User login with JWT issuance
- `GET /api/tasks` - Paginated task query with RBAC scoping
- `POST /api/tasks` - Create task with role permission validation
- `PUT /api/tasks/:id` - Update status/priority
- `DELETE /api/tasks/:id` - Admin/creator only removal
