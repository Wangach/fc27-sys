import { NavLink, Outlet } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faUsers,
  faGamepad,
  faMoneyBillTransfer,
  faFileInvoiceDollar,
  faTrophy,
  faComments,
  faShieldHalved,
  faGear,
  faUser,
  faReceipt,
  faRightFromBracket,
  faBarsProgress,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";

const staffLinks = [
  ["/staff/dashboard", "Dashboard", faChartLine],
  ["/staff/customers", "Players", faUsers],
  ["/staff/games", "Games", faGamepad],
  ["/staff/payments", "Transactions", faMoneyBillTransfer],
  ["/staff/debts", "Purchase Debts", faReceipt],
  ["/staff/invoices", "Invoices", faFileInvoiceDollar],
  ["/leaderboard", "Leaderboard", faTrophy],
  ["/staff/tickets", "Complaints", faComments],
];
const adminLinks = [
  ["/admin/users", "User Management", faShieldHalved],
  ["/admin/head-to-head", "Head-to-Head", faGamepad],
  ["/admin/audit", "Audit Logs", faBarsProgress],
  ["/admin/settings", "Settings", faGear],
];
const customerLinks = [
  ["/player/dashboard", "My Dashboard", faChartLine],
  ["/player/profile", "Profile", faUser],
  ["/player/games", "My Games", faGamepad],
  ["/player/transactions", "Transactions", faMoneyBillTransfer],
  ["/player/debts", "My Debts", faReceipt],
  ["/player/invoices", "Invoices", faFileInvoiceDollar],
  ["/leaderboard", "Leaderboard", faTrophy],
  ["/player/feedback", "Feedback", faComments],
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const links =
    user.role === "CUSTOMER"
      ? customerLinks
      : [...staffLinks, ...(user.role === "ADMIN" ? adminLinks : [])];
  return (
    <div className="min-h-screen bg-transparent lg:flex">
      <aside className="border-b border-white/10 bg-arena-900/95 lg:fixed lg:inset-y-0 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex h-20 items-center justify-between px-6">
          <div>
            <div className="text-2xl font-black italic tracking-tight">
              BH <span className="text-volt">ENTERTAINMENT</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[.25em] text-white/30">
              Club Operations
            </div>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
          {links.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${isActive ? "bg-volt text-arena-950 shadow-glow" : "text-white/55 hover:bg-white/5 hover:text-white"}`
              }
            >
              <FontAwesomeIcon icon={icon} className="w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden absolute bottom-5 left-4 right-4 lg:block">
          <button onClick={logout} className="btn-secondary w-full">
            <FontAwesomeIcon icon={faRightFromBracket} /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 lg:ml-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[.06] bg-arena-950/80 px-5 backdrop-blur md:px-8">
          <div className="text-xs font-black uppercase tracking-[.2em] text-white/35">
            Season 2026
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold">
                {user.customerProfile?.displayName || user.username}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-volt">
                {user.role.replace("_", " ")}
              </div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-volt font-black text-arena-950">
              {(user.customerProfile?.displayName || user.username)
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="text-white/40 hover:text-white lg:hidden"
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
            </button>
          </div>
        </header>
        <div className="p-5 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
