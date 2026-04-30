const express = require("express");
const { z } = require("zod");
const { requireAuth, authorizeRoles } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const router = express.Router();

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"])
});

router.use(requireAuth, authorizeRoles("ADMIN"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    return res.json({ users });
  })
);

router.patch(
  "/:userId/role",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const { role } = updateRoleSchema.parse(req.body);
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, "User not found.");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    return res.json({
      message: "User role updated.",
      user: updatedUser
    });
  })
);

module.exports = router;
