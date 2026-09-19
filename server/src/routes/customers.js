import { Router } from "express";
import { prisma } from "../utils/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { getCustomerAccount } from "../services/accountService.js";
import { getLeaderboard } from "../services/rankingService.js";
import { getPlayerOverview } from "../services/playerInsights.js";

const router = Router();
router.use(authenticate);

router.get("/", authorize("ADMIN", "CO_ADMIN"), async (req, res) => {
  const customers = await prisma.customerProfile.findMany({
    where: { active: true, user: { status: "ACTIVE" } },
    select: {
      id: true,
      customerCode: true,
      displayName: true,
      email: true,
      phone: true,
      favoriteTeam: true,
      createdAt: true,
    },
    orderBy: { displayName: "asc" },
  });
  res.json({ customers });
});

router.get("/me", authorize("CUSTOMER"), async (req, res) => {
  const profile = req.user.customerProfile;
  if (!profile)
    return res.status(404).json({ message: "Customer profile not found." });
  const [account, leaderboard, recentMatches, recentPayments] =
    await Promise.all([
      getCustomerAccount(prisma, profile.id),
      getLeaderboard(prisma),
      prisma.matchParticipant.findMany({
        where: { customerId: profile.id, match: { status: "ACTIVE" } },
        include: {
          match: {
            include: {
              matchType: true,
              participants: { include: { customer: true } },
            },
          },
        },
        orderBy: { match: { playedAt: "desc" } },
        take: 10,
      }),
      prisma.payment.findMany({
        where: { customerId: profile.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);
  const row = leaderboard.find((x) => x.customerId === profile.id) || null;
  res.json({ profile, account, stats: row, recentMatches, recentPayments });
});

router.get(
  "/:id/insights",
  authorize("ADMIN", "CO_ADMIN"),
  async (req, res) => {
    const overview = await getPlayerOverview(prisma, req.params.id);
    if (!overview)
      return res.status(404).json({ message: "Customer not found." });
    res.json(overview);
  },
);

router.get("/:id", authorize("ADMIN", "CO_ADMIN"), async (req, res) => {
  const customer = await prisma.customerProfile.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { username: true, status: true } } },
  });
  if (!customer)
    return res.status(404).json({ message: "Customer not found." });
  const account = await getCustomerAccount(prisma, customer.id);
  res.json({ customer, account });
});

export default router;
