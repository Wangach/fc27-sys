import { useEffect, useState } from 'react';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import { kes } from '../utils/format';

function validationMessage(error) {
  const issues = error?.response?.data?.errors;
  if (Array.isArray(issues) && issues.length) {
    return issues
      .map((issue) => `${issue.path?.join('.') || 'value'}: ${issue.message}`)
      .join(' • ');
  }
  return error?.response?.data?.message || 'Unable to save the match fee.';
}

export default function SettingsPage() {
  const [data, setData] = useState(null);
  const [savingCode, setSavingCode] = useState('');
  const [notice, setNotice] = useState(null);

  const load = async () => {
    const response = await api.get('/settings', {
      params: { _ts: Date.now() },
    });
    setData(response.data);
  };

  useEffect(() => {
    load().catch((error) => {
      setNotice({ type: 'error', text: validationMessage(error) });
    });
  }, []);

  const updateType = (index, patch) => {
    setData((current) => ({
      ...current,
      matchTypes: current.matchTypes.map((type, i) =>
        i === index ? { ...type, ...patch } : type,
      ),
    }));
  };

  const save = async (type, index) => {
    setSavingCode(type.code);
    setNotice(null);

    try {
      const payload =
        type.code === 'FAIR_PAY'
          ? {
              perPlayerFee: Number(type.perPlayerFee),
              active: Boolean(type.active),
            }
          : {
              loserFee: Number(type.loserFee),
              active: Boolean(type.active),
            };

      const response = await api.patch(`/settings/match-types/${type.code}`, payload);
      updateType(index, response.data.matchType);
      setNotice({ type: 'success', text: response.data.message });
    } catch (error) {
      setNotice({ type: 'error', text: validationMessage(error) });
    } finally {
      setSavingCode('');
    }
  };

  if (!data) {
    return <div className="text-volt">Loading settings…</div>;
  }

  return (
    <>
      <PageHeader
        title="System Settings"
        subtitle="Match fees are stored on the server and used directly by the game billing engine."
      />

      {notice && (
        <div
          className={`mb-5 rounded-2xl border p-4 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
              : 'border-red-400/30 bg-red-400/10 text-red-100'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {data.matchTypes.map((type, index) => {
          const isFairPay = type.code === 'FAIR_PAY';
          const feeValue = isFairPay ? type.perPlayerFee : type.loserFee;

          return (
            <div key={type.id} className="panel p-5">
              <div className="eyebrow">{type.code.replace('_', ' ')}</div>
              <h2 className="mt-1 text-2xl font-black">{type.name}</h2>

              <p className="mt-2 text-sm text-white/50">
                {isFairPay
                  ? `Each player is currently charged ${kes(type.perPlayerFee)}.`
                  : `The losing player is currently charged ${kes(type.loserFee)}.`}
              </p>

              <div className="mt-5">
                <label className="label">
                  {isFairPay ? 'Fee per player' : 'Loser fee'}
                </label>
                <input
                  className="field"
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  value={feeValue}
                  onChange={(event) =>
                    updateType(index, {
                      [isFairPay ? 'perPlayerFee' : 'loserFee']: event.target.value,
                    })
                  }
                />
                <p className="mt-2 text-xs text-white/40">
                  {isFairPay
                    ? 'This amount is charged to each player whenever a Fair Pay match is recorded.'
                    : 'This is the normal Loser Pay charge. Draw-resolution rules derive their amounts from this fee.'}
                </p>
              </div>

              <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(type.active)}
                  onChange={(event) => updateType(index, { active: event.target.checked })}
                />
                Active match type
              </label>

              <button
                className="btn-primary mt-5"
                disabled={savingCode === type.code}
                onClick={() => save(type, index)}
              >
                {savingCode === type.code ? 'Saving…' : 'Save rule'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="panel mt-6 p-5 text-sm text-white/50">
        <strong className="text-white">Billing rule:</strong> Loser Pay uses the loser fee. Fair Pay uses the
        fee-per-player value and creates one game charge for each participant. A Fair Pay fee of KES 0 means
        no financial charge will be created for Fair Pay matches.
      </div>
    </>
  );
}
