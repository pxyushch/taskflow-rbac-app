const AppError = require("./AppError");

async function getProjectMembership(prisma, projectId, userId) {
  return prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId
      }
    }
  });
}

async function ensureProjectAccess(prisma, user, projectId) {
  if (user.role === "ADMIN") {
    return { role: "ADMIN" };
  }

  const membership = await getProjectMembership(prisma, projectId, user.id);
  if (!membership) {
    throw new AppError(403, "You do not have access to this project.");
  }

  return membership;
}

async function ensureProjectAdmin(prisma, user, projectId) {
  if (user.role === "ADMIN") {
    return true;
  }

  const membership = await getProjectMembership(prisma, projectId, user.id);
  if (!membership || membership.role !== "ADMIN") {
    throw new AppError(403, "Only project admins can perform this action.");
  }

  return true;
}

module.exports = {
  getProjectMembership,
  ensureProjectAccess,
  ensureProjectAdmin
};
