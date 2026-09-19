import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faScaleBalanced,
  faSkullCrossbones,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";
import { dateTime, kes } from "../utils/format";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  matchTypeCode: "LOSER_PAY",
  playerOneId: "",
  playerTwoId: "",
  playerOneTeam: "",
  playerTwoTeam: "",
  playerOneScore: 0,
  playerTwoScore: 0,
};

export default function GamesPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [types, setTypes] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [drawModalOpen, setDrawModalOpen] = useState(false);
  const [drawMode, setDrawMode] = useState(null);
  const [superScores, setSuperScores] = useState({
    playerOne: 0,
    playerTwo: 0,
  });
  const [drawError, setDrawError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    Promise.all([
      api.get("/customers"),
      api.get("/matches/types"),
      api.get("/matches"),
      api.get("/football-teams"),
    ]).then(([c, t, m, ft]) => {
      setCustomers(c.data.customers);
      setTypes(t.data.matchTypes);
      setMatches(m.data.matches);
      setTeams(ft.data.footballTeams || []);
    });

  useEffect(() => {
    load();
  }, []);

  const loserPayType = useMemo(
    () => types.find((type) => type.code === "LOSER_PAY"),
    [types],
  );
  const normalLoserFee = Number(loserPayType?.loserFee || 0);
  const playerOne = customers.find((c) => c.id === form.playerOneId);
  const playerTwo = customers.find((c) => c.id === form.playerTwoId);

  const clearDrawModal = () => {
    setDrawModalOpen(false);
    setDrawMode(null);
    setDrawError("");
    setSuperScores({ playerOne: 0, playerTwo: 0 });
  };

  const recordMatch = async (payload) => {
    setSaving(true);
    setError("");
    setDrawError("");
    try {
      await api.post("/matches", payload);
      setForm((current) => ({
        ...current,
        playerOneScore: 0,
        playerTwoScore: 0,
      }));
      clearDrawModal();
      await load();
      return true;
    } catch (err) {
      const message = err.response?.data?.message || "Could not record match.";
      if (drawModalOpen) setDrawError(message);
      else setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (
      form.matchTypeCode === "LOSER_PAY" &&
      Number(form.playerOneScore) === Number(form.playerTwoScore)
    ) {
      setDrawMode(null);
      setDrawError("");
      setSuperScores({ playerOne: 0, playerTwo: 0 });
      setDrawModalOpen(true);
      return;
    }

    await recordMatch(form);
  };

  const chooseHalfHalf = async () => {
    await recordMatch({ ...form, drawResolution: "HALF_HALF" });
  };

  const submitSuperLoser = async () => {
    const playerOneScore = Number(superScores.playerOne);
    const playerTwoScore = Number(superScores.playerTwo);
    if (playerOneScore === playerTwoScore) {
      setDrawError(
        "The Super-looser score must produce a winner and a loser. It cannot also be a draw.",
      );
      return;
    }
    await recordMatch({
      ...form,
      drawResolution: "SUPER_LOSER",
      superLoserPlayerOneScore: playerOneScore,
      superLoserPlayerTwoScore: playerTwoScore,
    });
  };

  return (
    <>
      <PageHeader
        title="Games"
        subtitle="Scores and debt effects are derived on the server. Drawn loser-pay matches require a Half-Half or Super-looser payment decision."
      />

      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <form onSubmit={submit} className="panel p-5">
          <div className="eyebrow">Record result</div>
          <h2 className="mb-5 mt-1 text-xl font-black uppercase">New match</h2>

          {error && (
            <div className="mb-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <label className="label">Match type</label>
          <select
            className="field mb-4"
            value={form.matchTypeCode}
            onChange={(e) =>
              setForm({ ...form, matchTypeCode: e.target.value })
            }
          >
            {types.map((type) => (
              <option key={type.id} value={type.code}>
                {type.name}{" "}
                {type.code === "LOSER_PAY"
                  ? `— loser KES ${Number(type.loserFee)}`
                  : Number(type.perPlayerFee) > 0
                    ? `— KES ${Number(type.perPlayerFee)} each`
                    : "— no fee configured"}
              </option>
            ))}
          </select>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Player 1</label>
              <select
                required
                className="field"
                value={form.playerOneId}
                onChange={(e) =>
                  setForm({ ...form, playerOneId: e.target.value })
                }
              >
                <option value="">Select</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.displayName}
                  </option>
                ))}
              </select>
              <input
                className="field mt-2"
                list="football-team-options"
                placeholder={
                  teams.length ? "Search/select team" : "Import teams first"
                }
                value={form.playerOneTeam}
                onChange={(e) =>
                  setForm({ ...form, playerOneTeam: e.target.value })
                }
              />
              <input
                className="field mt-2 text-center text-2xl font-black"
                type="number"
                min="0"
                max="99"
                value={form.playerOneScore}
                onChange={(e) =>
                  setForm({ ...form, playerOneScore: Number(e.target.value) })
                }
              />
            </div>

            <div>
              <label className="label">Player 2</label>
              <select
                required
                className="field"
                value={form.playerTwoId}
                onChange={(e) =>
                  setForm({ ...form, playerTwoId: e.target.value })
                }
              >
                <option value="">Select</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.displayName}
                  </option>
                ))}
              </select>
              <input
                className="field mt-2"
                list="football-team-options"
                placeholder={
                  teams.length ? "Search/select team" : "Import teams first"
                }
                value={form.playerTwoTeam}
                onChange={(e) =>
                  setForm({ ...form, playerTwoTeam: e.target.value })
                }
              />
              <input
                className="field mt-2 text-center text-2xl font-black"
                type="number"
                min="0"
                max="99"
                value={form.playerTwoScore}
                onChange={(e) =>
                  setForm({ ...form, playerTwoScore: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <datalist id="football-team-options">
            {teams.map((team) => (
              <option key={team.id} value={team.name}>
                {team.country}
              </option>
            ))}
          </datalist>

          <div className="mt-3 text-xs text-white/40">
            {teams.length
              ? `${teams.length.toLocaleString()} football teams loaded from PostgreSQL.`
              : "No football teams are loaded yet. Run the development team importer from the server folder."}
          </div>

          <button
            disabled={saving}
            className="btn-primary mt-5 w-full disabled:opacity-50"
          >
            {saving ? "Recording…" : "Record match"}
          </button>
        </form>

        <div className="panel p-5">
          <h2 className="mb-4 font-black uppercase">Match history</h2>
          <div className="max-h-[650px] space-y-3 overflow-auto pr-1">
            {matches.map((match) => {
              const [a, b] = match.participants;
              return (
                <div
                  key={match.id}
                  className="rounded-xl border border-white/[.07] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-white/35">
                        {match.matchCode} • {dateTime(match.playedAt)}
                      </div>
                      <div className="mt-2 text-lg font-black">
                        {a?.customer.displayName}{" "}
                        <span className="mx-2 text-volt">
                          {a?.score} : {b?.score}
                        </span>{" "}
                        {b?.customer.displayName}
                      </div>
                      <div className="mt-1 text-xs text-white/40">
                        {a?.team || "—"} vs {b?.team || "—"} •{" "}
                        {match.matchType.name}
                      </div>

                      {match.drawResolution === "HALF_HALF" && (
                        <div className="mt-2 text-xs font-bold text-amber-200">
                          Draw resolved as Half-Half •{" "}
                          {match.charges
                            .map(
                              (charge) =>
                                `${charge.customer.displayName} ${kes(charge.amount)}`,
                            )
                            .join(" • ")}
                        </div>
                      )}

                      {match.drawResolution === "SUPER_LOSER" && (
                        <div className="mt-2 text-xs font-bold text-orange-200">
                          Super-looser {match.superLoserPlayerOneScore}:
                          {match.superLoserPlayerTwoScore} •{" "}
                          {match.charges
                            .map(
                              (charge) =>
                                `${charge.customer.displayName} charged ${kes(charge.amount)}`,
                            )
                            .join(" • ")}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusPill value={match.status} />
                      {!match.drawResolution && match.charges?.length > 0 && (
                        <span className="text-xs font-bold text-volt">
                          {match.charges
                            .map(
                              (charge) =>
                                `${charge.customer.displayName} ${kes(charge.amount)}`,
                            )
                            .join(" • ")}
                        </span>
                      )}
                      {user.role === "ADMIN" && match.status === "ACTIVE" && (
                        <button
                          onClick={async () => {
                            if (
                              confirm(
                                "Cancel this match and void its active game charge?",
                              )
                            ) {
                              await api.post(`/matches/${match.id}/cancel`);
                              load();
                            }
                          }}
                          className="text-xs font-bold text-red-300"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {drawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#111411] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow">Loser-pay draw</div>
                <h2 className="mt-1 text-2xl font-black uppercase">
                  Who pays for this match?
                </h2>
                <p className="mt-2 text-sm text-white/50">
                  {playerOne?.displayName || "Player 1"} and{" "}
                  {playerTwo?.displayName || "Player 2"} finished{" "}
                  <strong className="text-white">
                    {form.playerOneScore}:{form.playerTwoScore}
                  </strong>
                  . Choose how the KES {normalLoserFee || 30} game cost should
                  be resolved.
                </p>
              </div>
              <button
                type="button"
                onClick={clearDrawModal}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/5 hover:text-white"
                aria-label="Close draw resolution"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {drawError && (
              <div className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">
                {drawError}
              </div>
            )}

            {!drawMode && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={chooseHalfHalf}
                  className="rounded-2xl border border-white/10 bg-white/[.04] p-5 text-left transition hover:border-volt/50 hover:bg-volt/5 disabled:opacity-50"
                >
                  <FontAwesomeIcon
                    icon={faScaleBalanced}
                    className="text-xl text-volt"
                  />
                  <div className="mt-4 text-lg font-black uppercase">
                    Half-Half
                  </div>
                  <div className="mt-1 text-sm text-white/45">
                    Split one normal game cost equally:{" "}
                    <strong className="text-white">
                      KES {(normalLoserFee / 2 || 15).toFixed(2)} each
                    </strong>
                    .
                  </div>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setDrawMode("SUPER_LOSER");
                    setDrawError("");
                  }}
                  className="rounded-2xl border border-white/10 bg-white/[.04] p-5 text-left transition hover:border-orange-300/50 hover:bg-orange-300/5 disabled:opacity-50"
                >
                  <FontAwesomeIcon
                    icon={faSkullCrossbones}
                    className="text-xl text-orange-300"
                  />
                  <div className="mt-4 text-lg font-black uppercase">
                    Super-looser
                  </div>
                  <div className="mt-1 text-sm text-white/45">
                    Enter a decisive tiebreak score. The tiebreak loser pays{" "}
                    <strong className="text-white">
                      KES {(normalLoserFee * 2 || 60).toFixed(2)}
                    </strong>
                    .
                  </div>
                </button>
              </div>
            )}

            {drawMode === "SUPER_LOSER" && (
              <div className="mt-6">
                <div className="rounded-2xl border border-orange-300/15 bg-orange-300/5 p-4">
                  <div className="text-sm font-bold text-orange-200">
                    Enter the Super-looser tiebreak score
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    This score determines only who pays. The original match
                    remains recorded as a {form.playerOneScore}:
                    {form.playerTwoScore} draw for player statistics.
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                  <div>
                    <label className="label">
                      {playerOne?.displayName || "Player 1"}
                    </label>
                    <input
                      className="field text-center text-2xl font-black"
                      type="number"
                      min="0"
                      max="99"
                      value={superScores.playerOne}
                      onChange={(e) =>
                        setSuperScores({
                          ...superScores,
                          playerOne: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="pb-3 text-xl font-black text-white/30">:</div>
                  <div>
                    <label className="label">
                      {playerTwo?.displayName || "Player 2"}
                    </label>
                    <input
                      className="field text-center text-2xl font-black"
                      type="number"
                      min="0"
                      max="99"
                      value={superScores.playerTwo}
                      onChange={(e) =>
                        setSuperScores({
                          ...superScores,
                          playerTwo: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawMode(null);
                      setDrawError("");
                    }}
                    className="btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={submitSuperLoser}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {saving
                      ? "Recording…"
                      : `Record & charge KES ${(normalLoserFee * 2 || 60).toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}

            {!drawMode && saving && (
              <div className="mt-4 text-center text-sm text-white/40">
                Recording match…
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
