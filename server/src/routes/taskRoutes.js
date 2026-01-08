const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { ensureProjectAccess, ensureProjectAdmin, getProjectMembership } = require("../utils/access");

const router = express.Router();

const createTaskSchema = z.object({
  title: z.string().trim().min(2, "Task title must have at least 2 characters.").max(140),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.union([z.string().datetime(), z.null()]).optional()
});

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(2).max(140).optional(),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    assigneeId: z.string().optional().nullable(),
    dueDate: z.union([z.string().datetime(), z.null()]).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Provide at least one field to update."
  });

function normalizeDueDate(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return new Date(value);
}

router.use(requireAuth);

router.get(
  "/projects/:projectId/tasks",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const { projectId } = req.params;
    await ensureProjectAccess(prisma, req.user, projectId);

    const { status, assigneeId, overdue } = req.query;
    const where = { projectId };

    if (status) {
      where.status = status;
    }
    if (assigneeId) {
      where.assigneeId = assigneeId;
    }
    if (overdue === "true") {
      where.dueDate = { lt: new Date() };
      if (!status) {
        where.status = { not: "DONE" };
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, role: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }]
    });

    return res.json({ tasks });
  })
);

router.post(
  "/projects/:projectId/tasks",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const { projectId } = req.params;
    const data = createTaskSchema.parse(req.body);

    await ensureProjectAdmin(prisma, req.user, projectId);

    if (data.assigneeId) {
      const assigneeMembership = await getProjectMembership(prisma, projectId, data.assigneeId);
      if (!assigneeMembership) {
        throw new AppError(400, "Assignee must be part of the project team.");
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        status: data.status || "TODO",
        priority: data.priority || "MEDIUM",
        dueDate: normalizeDueDate(data.dueDate) ?? null,
        assigneeId: data.assigneeId || null,
        projectId,
        createdById: req.user.id,
        completedAt: data.status === "DONE" ? new Date() : null
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, role: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    return res.status(201).json({
      message: "Task created successfully.",
      task
    });
  })
);

router.patch(
  "/tasks/:taskId",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const { taskId } = req.params;
    const payload = updateTaskSchema.parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true
          }
        }
      }
    });

    if (!task) {
      throw new AppError(404, "Task not found.");
    }

    const isGlobalAdmin = req.user.role === "ADMIN";
    const membership =
      isGlobalAdmin
        ? { role: "ADMIN" }
        : await getProjectMembership(prisma, task.project.id, req.user.id);

    const isProjectAdmin = membership?.role === "ADMIN";
    const isAssignee = task.assigneeId === req.user.id;

    if (!isGlobalAdmin && !membership) {
      throw new AppError(403, "You do not have access to this task.");
    }

    if (!isGlobalAdmin && !isProjectAdmin && !isAssignee) {
      throw new AppError(403, "You are not allowed to update this task.");
    }

    const payloadKeys = Object.keys(payload);
    if (!isGlobalAdmin && !isProjectAdmin) {
      const allowedMemberFields = ["status"];
      const invalidFields = payloadKeys.filter((field) => !allowedMemberFields.includes(field));
      if (invalidFields.length > 0) {
        throw new AppError(403, "Members can only update task status.");
      }
    }

    if ((isGlobalAdmin || isProjectAdmin) && payload.assigneeId) {
      const assigneeMembership = await getProjectMembership(
        prisma,
        task.project.id,
        payload.assigneeId
      );
      if (!assigneeMembership) {
        throw new AppError(400, "Assignee must be part of the project team.");
      }
    }

    const nextStatus = payload.status;
    const updateData = {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description || null } : {}),
      ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
      ...(payload.assigneeId !== undefined ? { assigneeId: payload.assigneeId || null } : {}),
      ...(payload.dueDate !== undefined ? { dueDate: normalizeDueDate(payload.dueDate) } : {}),
      ...(nextStatus !== undefined ? { status: nextStatus } : {})
    };

    if (nextStatus === "DONE") {
      updateData.completedAt = new Date();
    } else if (nextStatus && nextStatus !== "DONE") {
      updateData.completedAt = null;
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, role: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    return res.json({
      message: "Task updated successfully.",
      task: updatedTask
    });
  })
);

router.delete(
  "/tasks/:taskId",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });
    if (!task) {
      throw new AppError(404, "Task not found.");
    }

    if (req.user.role !== "ADMIN") {
      const membership = await getProjectMembership(prisma, task.projectId, req.user.id);
      if (!membership || membership.role !== "ADMIN") {
        throw new AppError(403, "Only admins can delete tasks.");
      }
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    return res.json({ message: "Task deleted." });
  })
);

module.exports = router;
