const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/overview",
  requireAuth,
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const now = new Date();

    const visibilityWhere =
      req.user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { assigneeId: req.user.id },
              {
                project: {
                  members: {
                    some: {
                      userId: req.user.id
                    }
                  }
                }
              }
            ]
          };

    const tasks = await prisma.task.findMany({
      where: visibilityWhere,
      include: {
        project: {
          select: { id: true, name: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
    });

    const summary = tasks.reduce(
      (accumulator, task) => {
        accumulator.total += 1;
        if (task.status === "TODO") {
          accumulator.todo += 1;
        }
        if (task.status === "IN_PROGRESS") {
          accumulator.inProgress += 1;
        }
        if (task.status === "DONE") {
          accumulator.done += 1;
        }
        if (task.dueDate && task.dueDate < now && task.status !== "DONE") {
          accumulator.overdue += 1;
        }
        return accumulator;
      },
      {
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        overdue: 0
      }
    );

    const overdueTasks = tasks
      .filter((task) => task.dueDate && task.dueDate < now && task.status !== "DONE")
      .slice(0, 10);

    const assignedToMe = tasks.filter((task) => task.assigneeId === req.user.id).slice(0, 10);

    const upcomingDeadlines = tasks
      .filter((task) => task.dueDate && task.dueDate >= now && task.status !== "DONE")
      .sort((first, second) => new Date(first.dueDate) - new Date(second.dueDate))
      .slice(0, 10);

    return res.json({
      summary,
      overdueTasks,
      assignedToMe,
      upcomingDeadlines
    });
  })
);

module.exports = router;
