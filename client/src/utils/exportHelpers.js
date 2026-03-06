
export function exportTasksToCSV(tasks) {
  const headers = ['ID,Title,Status,Priority,Assignee\n'];
  const rows = tasks.map(t => `${t.id},"${t.title}",${t.status},${t.priority},${t.assigneeId || 'Unassigned'}\n`);
  return headers.concat(rows).join('');
}
