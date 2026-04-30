const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { ensureProjectAccess, ensureProjectAdmin } = require("../utils/access");

const router = express.Router();

const createProjectSchema = z.object({
  name: z.string().trim().min(3, "Project name must have at least 3 characters.").max(120),
  description: z
    .string()
    .trim()
    .max(600, "Description is too long.")
    .optional()
    .or(z.literal(""))
});

const updateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Project name must have at least 3 characters.")
    .max(120)
    .optional(),
  description: z
    .string()
    .trim()
    .max(600, "Description is too long.")
    .optional()
    .or(z.literal(""))
});

const addMemberSchema = z.object({
  userId: z.string().min(1, "User id is required."),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER")
});

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;

    const whereClause =
      req.user.role === "ADMIN"
        ? {}
        : {
            members: {
              some: {
                userId: req.user.id
              }
            }
          };

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          where: {
            userId: req.user.id
          },
          select: {
            role: true
          }
        },
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    const normalizedProjects = projects.map((project) => ({
      ...project,
      myRole: req.user.role === "ADMIN" ? "ADMIN" : project.members[0]?.role || "MEMBER"
    }));

    return res.json({ projects: normalizedProjects });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    if (req.user.role !== "ADMIN") {
      throw new AppError(403, "Only ADMIN users can create projects.");
    }

    const prisma = req.app.locals.prisma;
    const data = createProjectSchema.parse(req.body);

    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          name: data.name,
          description: data.description || null,
          ownerId: req.user.id
        }
      });

      await tx.projectMember.create({
        data: {
          projectId: createdProject.id,
          userId: req.user.id,
          role: "ADMIN"
        }
      });

      return createdProject;
    });

    return res.status(201).json({
      message: "Project created successfully.",
      project
    });
  })
);

router.get(
  "/:projectId",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const { projectId } = req.params;
    await ensureProjectAccess(prisma, req.user, projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        _count: {
          select: { tasks: true, members: true }
        }
      }
    });

    if (!project) {
      throw new AppError(404, "Project not found.");
    }

    return res.json({ project });
  })
);

router.patch(
  "/:projectId",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const { projectId } = req.params;
    const data = updateProjectSchema.parse(req.body);
    await ensureProjectAdmin(prisma, req.user, projectId);

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {})
      }
    });

    return res.json({
      message: "Project updated successfully.",
      project
    });
  })
);

router.delete(
  "/:projectId",
  asyncHandler(async (req, res) => {
    if (req.user.role !== "ADMIN") {
      throw new AppError(403, "Only ADMIN users can delete projects.");
    }

    const prisma = req.app.locals.prisma;
    const { projectId } = req.params;

    await prisma.project.delete({
      where: { id: projectId }
    });

    return res.json({ message: "Project deleted." });
  })
);

router.post(
  "/:projectId/members",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const { projectId } = req.params;
    const data = addMemberSchema.parse(req.body);

    await ensureProjectAdmin(prisma, req.user, projectId);

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true }
    });
    if (!user) {
      throw new AppError(404, "User not found.");
    }

    const member = await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: data.userId
        }
      },
      update: {
        role: data.role
      },
      create: {
        projectId,
        userId: data.userId,
        role: data.role
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    return res.status(201).json({
      message: "Member added to project.",
      member
    });
  })
);

router.delete(
  "/:projectId/members/:userId",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const { projectId, userId } = req.params;
    await ensureProjectAdmin(prisma, req.user, projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true }
    });
    if (!project) {
      throw new AppError(404, "Project not found.");
    }
    if (project.ownerId === userId) {
      throw new AppError(400, "Project owner cannot be removed from team.");
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    return res.json({ message: "Member removed from project." });
  })
);

module.exports = router;
