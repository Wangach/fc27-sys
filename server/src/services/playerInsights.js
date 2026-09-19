import { getLeaderboard } from './rankingService.js';

const round1 = (value) => Number(Number(value || 0).toFixed(1));

function safeRate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function mapRecentGame(row, customerId) {
  const match = row.match;
  const self = match.participants.find((p) => p.customerId === customerId) || row;
  const opponent = match.participants.find((p) => p.customerId !== customerId);
  return {
    id: match.id,
    matchCode: match.matchCode,
    playedAt: match.playedAt,
    matchType: match.matchType,
    result: self.result,
    score: self.score,
    team: self.team,
    opponent: opponent ? {
      id: opponent.customer.id,
      name: opponent.customer.displayName,
      customerCode: opponent.customer.customerCode,
      score: opponent.score,
      team: opponent.team,
    } : null,
  };
}

export async function getPlayerOverview(db, customerId) {
  const customer = await db.customerProfile.findUnique({
    where: { id: customerId },
    include: { user: { select: { username: true, status: true } } },
  });
  if (!customer) return null;

  const [leaderboard, recentParticipants, recentPayments] = await Promise.all([
    getLeaderboard(db),
    db.matchParticipant.findMany({
      where: { customerId, match: { status: 'ACTIVE' } },
      include: {
        match: {
          include: {
            matchType: true,
            participants: { include: { customer: true } },
          },
        },
      },
      orderBy: { match: { playedAt: 'desc' } },
      take: 5,
    }),
    db.payment.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        paymentNumber: true,
        amount: true,
        purpose: true,
        method: true,
        reference: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const stats = leaderboard.find((row) => row.customerId === customerId) || {
    customerId,
    customerCode: customer.customerCode,
    name: customer.displayName,
    favoriteTeam: customer.favoriteTeam,
    rank: null,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    winRate: 0,
  };

  return {
    customer,
    stats: {
      ...stats,
      winProbability: stats.winRate,
    },
    recentTransactions: recentPayments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
    })),
    recentGames: recentParticipants.map((row) => mapRecentGame(row, customerId)),
  };
}

function buildPrediction(playerOne, playerTwo, direct) {
  const totalOverallGames = playerOne.played + playerTwo.played;
  if (direct.meetings === 0 && totalOverallGames === 0) {
    return {
      available: false,
      playerOneWinProbability: null,
      drawProbability: null,
      playerTwoWinProbability: null,
      likelyOutcome: 'Not enough match history to estimate an outcome.',
      basis: 'No direct meetings or overall match history are available.',
    };
  }

  const historyWeight = direct.meetings > 0
    ? Math.min(0.75, 0.35 + Math.min(direct.meetings, 5) * 0.08)
    : 0;

  const p1Overall = playerOne.played ? safeRate(playerOne.wins, playerOne.played) : 0.5;
  const p2Overall = playerTwo.played ? safeRate(playerTwo.wins, playerTwo.played) : 0.5;
  const overallDraw = (playerOne.played || playerTwo.played)
    ? (safeRate(playerOne.draws, playerOne.played || 1) + safeRate(playerTwo.draws, playerTwo.played || 1)) / 2
    : 0;

  const p1Direct = direct.meetings ? safeRate(direct.playerOneWins, direct.meetings) : 0;
  const p2Direct = direct.meetings ? safeRate(direct.playerTwoWins, direct.meetings) : 0;
  const directDraw = direct.meetings ? safeRate(direct.draws, direct.meetings) : 0;

  let p1Raw = historyWeight * p1Direct + (1 - historyWeight) * p1Overall;
  let p2Raw = historyWeight * p2Direct + (1 - historyWeight) * p2Overall;
  let drawRaw = historyWeight * directDraw + (1 - historyWeight) * overallDraw;

  const total = p1Raw + p2Raw + drawRaw;
  if (total <= 0) {
    p1Raw = 0.5;
    p2Raw = 0.5;
    drawRaw = 0;
  }

  const normalizer = p1Raw + p2Raw + drawRaw;
  const playerOneWinProbability = round1((p1Raw / normalizer) * 100);
  const playerTwoWinProbability = round1((p2Raw / normalizer) * 100);
  const drawProbability = round1(Math.max(0, 100 - playerOneWinProbability - playerTwoWinProbability));

  const outcomes = [
    { label: `${playerOne.name} win`, value: playerOneWinProbability },
    { label: 'Draw', value: drawProbability },
    { label: `${playerTwo.name} win`, value: playerTwoWinProbability },
  ].sort((a, b) => b.value - a.value);

  const likelyOutcome = outcomes[0].value - outcomes[1].value < 5
    ? 'Too close to call'
    : outcomes[0].label;

  return {
    available: true,
    playerOneWinProbability,
    drawProbability,
    playerTwoWinProbability,
    likelyOutcome,
    basis: direct.meetings
      ? `Weighted mainly from ${direct.meetings} direct meeting${direct.meetings === 1 ? '' : 's'}, with overall records used as supporting context.`
      : 'No direct meetings yet; estimate is based on the players’ overall match records.',
  };
}

export async function getHeadToHeadComparison(db, playerOneId, playerTwoId) {
  if (!playerOneId || !playerTwoId || playerOneId === playerTwoId) return null;

  const [players, leaderboard, matches] = await Promise.all([
    db.customerProfile.findMany({
      where: { id: { in: [playerOneId, playerTwoId] }, active: true, user: { status: 'ACTIVE' } },
      select: { id: true, customerCode: true, displayName: true, favoriteTeam: true },
    }),
    getLeaderboard(db),
    db.match.findMany({
      where: {
        status: 'ACTIVE',
        AND: [
          { participants: { some: { customerId: playerOneId } } },
          { participants: { some: { customerId: playerTwoId } } },
        ],
      },
      include: {
        matchType: true,
        participants: { include: { customer: true } },
      },
      orderBy: { playedAt: 'desc' },
    }),
  ]);

  if (players.length !== 2) return null;
  const one = players.find((p) => p.id === playerOneId);
  const two = players.find((p) => p.id === playerTwoId);
  const overallOne = leaderboard.find((row) => row.customerId === playerOneId) || { played: 0, wins: 0, draws: 0, losses: 0, winRate: 0, rank: null };
  const overallTwo = leaderboard.find((row) => row.customerId === playerTwoId) || { played: 0, wins: 0, draws: 0, losses: 0, winRate: 0, rank: null };

  let playerOneWins = 0;
  let playerTwoWins = 0;
  let draws = 0;
  let playerOneGoals = 0;
  let playerTwoGoals = 0;

  const meetings = matches.map((match) => {
    const p1 = match.participants.find((p) => p.customerId === playerOneId);
    const p2 = match.participants.find((p) => p.customerId === playerTwoId);
    if (!p1 || !p2) return null;

    playerOneGoals += p1.score;
    playerTwoGoals += p2.score;
    if (p1.score > p2.score) playerOneWins++;
    else if (p2.score > p1.score) playerTwoWins++;
    else draws++;

    return {
      id: match.id,
      matchCode: match.matchCode,
      playedAt: match.playedAt,
      matchType: match.matchType,
      playerOneScore: p1.score,
      playerTwoScore: p2.score,
      playerOneTeam: p1.team,
      playerTwoTeam: p2.team,
      result: p1.score === p2.score ? 'DRAW' : p1.score > p2.score ? 'PLAYER_ONE_WIN' : 'PLAYER_TWO_WIN',
    };
  }).filter(Boolean);

  const direct = {
    meetings: meetings.length,
    playerOneWins,
    playerTwoWins,
    draws,
    playerOneGoals,
    playerTwoGoals,
    playerOneHeadToHeadWinRate: meetings.length ? round1((playerOneWins / meetings.length) * 100) : 0,
    playerTwoHeadToHeadWinRate: meetings.length ? round1((playerTwoWins / meetings.length) * 100) : 0,
    drawRate: meetings.length ? round1((draws / meetings.length) * 100) : 0,
  };

  const prediction = buildPrediction(
    { ...overallOne, name: one.displayName },
    { ...overallTwo, name: two.displayName },
    direct,
  );

  return {
    playerOne: { ...one, overall: overallOne },
    playerTwo: { ...two, overall: overallTwo },
    headToHead: direct,
    prediction,
    recentMeetings: meetings.slice(0, 5),
  };
}
