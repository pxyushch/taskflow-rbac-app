
describe('RBAC Authorization', () => {
  it('should prevent MEMBER role from deleting foreign tasks', () => {
    const user = { role: 'MEMBER', id: 'user-1' };
    const task = { id: 'task-1', creatorId: 'user-2' };
    const canDelete = user.role === 'ADMIN' || (user.role === 'MEMBER' && task.creatorId === user.id);
    expect(canDelete).toBe(false);
  });
});
