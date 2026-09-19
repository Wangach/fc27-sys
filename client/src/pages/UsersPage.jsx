import { useEffect, useState } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import StatusPill from "../components/StatusPill";

const empty = {
  username: "",
  password: "",
  role: "CUSTOMER",
  displayName: "",
  email: "",
  phone: "",
  favoriteTeam: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const load = () => api.get("/users").then((r) => setUsers(r.data.users));
  useEffect(() => {
    load();
  }, []);
  const formatApiError = (err, fallback) => {
    const data = err.response?.data;
    if (data?.errors?.length) {
      const first = data.errors[0];
      const field =
        Array.isArray(first.path) && first.path.length
          ? `${first.path.join(".")}: `
          : "";
      return `${field}${first.message}`;
    }
    return data?.message || fallback;
  };
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      username: form.username.trim(),
      password: form.password,
      role: form.role,
    };
    if (form.role === "CUSTOMER") {
      payload.displayName = form.displayName.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.favoriteTeam.trim())
        payload.favoriteTeam = form.favoriteTeam.trim();
    }
    try {
      await api.post("/users", payload);
      setForm(empty);
      await load();
    } catch (err) {
      setError(formatApiError(err, "Could not create user."));
    }
  };
  const startEdit = (u) =>
    setEditing({
      id: u.id,
      username: u.username,
      displayName: u.customerProfile?.displayName || "",
      email: u.customerProfile?.email || "",
      phone: u.customerProfile?.phone || "",
      favoriteTeam: u.customerProfile?.favoriteTeam || "",
    });
  const saveEdit = async () => {
    try {
      await api.patch(`/users/${editing.id}`, {
        username: editing.username,
        displayName: editing.displayName || undefined,
        email: editing.email || null,
        phone: editing.phone || null,
        favoriteTeam: editing.favoriteTeam || null,
      });
      setEditing(null);
      load();
    } catch (err) {
      setError(formatApiError(err, "Could not update user."));
    }
  };
  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Admin-only provisioning and profile maintenance. Removing access deactivates an account so historical matches and financial records remain intact."
      />
      <div className="grid gap-6 xl:grid-cols-[.7fr_1.3fr]">
        <form onSubmit={submit} className="panel p-5">
          <h2 className="mb-5 text-xl font-black uppercase">Add account</h2>
          {error && (
            <div className="mb-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <label className="label">Role</label>
          <select
            className="field mb-4"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option>CUSTOMER</option>
            <option>CO_ADMIN</option>
            <option>ADMIN</option>
          </select>
          {form.role === "CUSTOMER" && (
            <>
              <label className="label">Display name</label>
              <input
                required
                className="field mb-4"
                value={form.displayName}
                onChange={(e) =>
                  setForm({ ...form, displayName: e.target.value })
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="field"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="field"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <label className="label mt-4">Favourite team</label>
              <input
                className="field mb-4"
                value={form.favoriteTeam}
                onChange={(e) =>
                  setForm({ ...form, favoriteTeam: e.target.value })
                }
              />
            </>
          )}
          <label className="label">Username</label>
          <input
            required
            className="field mb-4"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <label className="label">Initial password</label>
          <input
            required
            type="password"
            minLength="10"
            className="field"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button className="btn-primary mt-5 w-full">Create account</button>
        </form>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Player</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-bold">{u.username}</td>
                  <td>{u.role.replace("_", " ")}</td>
                  <td>{u.customerProfile?.displayName || "—"}</td>
                  <td>
                    <StatusPill value={u.status} />
                  </td>
                  <td>
                    <div className="flex gap-3">
                      <button
                        className="text-xs font-bold text-volt"
                        onClick={() => startEdit(u)}
                      >
                        Edit
                      </button>
                      <button
                        className={`text-xs font-bold ${u.status === "ACTIVE" ? "text-red-300" : "text-volt"}`}
                        onClick={async () => {
                          await api.patch(`/users/${u.id}`, {
                            status:
                              u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                          });
                          load();
                        }}
                      >
                        {u.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="panel w-full max-w-xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase">Edit account</h2>
              <button
                onClick={() => setEditing(null)}
                className="text-white/50"
              >
                ✕
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Username</label>
                <input
                  className="field"
                  value={editing.username}
                  onChange={(e) =>
                    setEditing({ ...editing, username: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Display name</label>
                <input
                  className="field"
                  value={editing.displayName}
                  onChange={(e) =>
                    setEditing({ ...editing, displayName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  className="field"
                  value={editing.phone}
                  onChange={(e) =>
                    setEditing({ ...editing, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="field"
                  type="email"
                  value={editing.email}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Favourite team</label>
                <input
                  className="field"
                  value={editing.favoriteTeam}
                  onChange={(e) =>
                    setEditing({ ...editing, favoriteTeam: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={saveEdit}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
