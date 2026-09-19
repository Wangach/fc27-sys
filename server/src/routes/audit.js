import { Router } from "express";
import { prisma } from "../utils/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, authorize("ADMIN"));

router.get("/", async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { username: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json({ logs });
});

export default router;
