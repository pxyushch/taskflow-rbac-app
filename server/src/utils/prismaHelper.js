
const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  createdAt: true,
  assignee: { select: { id: true, name: true, email: true } }
};

module.exports = { taskSelect };
