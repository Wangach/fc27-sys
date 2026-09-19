export async function getLeaderboard(db) {
  const customers = await db.customerProfile.findMany({
    where: { active: true, user: { status: "ACTIVE" } },
    include: {
      matchParticipants: {
        where: { match: { status: "ACTIVE" } },
        include: { match: true },
      },
    },
  });

  const table = customers.map((c) => {
    let wins = 0,
      draws = 0,
      losses = 0,
      gf = 0,
      ga = 0;
    for (const p of c.matchParticipants) {
      if (p.result === "WIN") wins++;
      if (p.result === "DRAW") draws++;
      if (p.result === "LOSS") losses++;
      gf += p.score;
    }
    return {
      customerId: c.id,
      customerCode: c.customerCode,
      name: c.displayName,
      favoriteTeam: c.favoriteTeam,
      played: wins + draws + losses,
      wins,
      draws,
      losses,
      gf,
      ga,
      gd: gf - ga,
      points: wins * 3 + draws,
      winRate:
        wins + draws + losses
          ? Number(((wins / (wins + draws + losses)) * 100).toFixed(1))
          : 0,
    };
  });

  // Goals against requires both participants, so fetch matches once and fold scores safely.
  const matches = await db.match.findMany({
    where: { status: "ACTIVE" },
    include: { participants: true },
  });
  const byId = new Map(table.map((row) => [row.customerId, row]));
  for (const match of matches) {
    if (match.participants.length !== 2) continue;
    const [a, b] = match.participants;
    const ra = byId.get(a.customerId);
    const rb = byId.get(b.customerId);
    if (ra) ra.ga += b.score;
    if (rb) rb.ga += a.score;
  }
  for (const row of table) row.gd = row.gf - row.ga;

  table.sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      b.winRate - a.winRate ||
      a.name.localeCompare(b.name),
  );
  return table.map((row, index) => ({ ...row, rank: index + 1 }));
}
