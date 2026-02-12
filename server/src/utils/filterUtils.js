
const buildTaskFilters = (query) => {
  const { status, priority, assigneeId } = query;
  const where = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  return where;
};

module.exports = { buildTaskFilters };
