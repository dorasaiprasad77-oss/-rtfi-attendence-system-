"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatDate, getInitials, statusColor } from "@/lib/utils";
import {
  Search,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Edit2,
  Radio,
  KeyRound,
} from "lucide-react";
import ImportModal from "./import-modal";

interface UserData {
  id: string;
  name: string;
  email: string;
  rollNo: string | null;
  department: string | null;
  role: string;
  rfidUid: string | null;
  isActive: boolean;
  photoUrl: string | null;
  createdAt: string;
  _count: { attendance: number };
}

interface PaginatedUsers {
  users: UserData[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function UsersPage() {
  const [data, setData] = useState<PaginatedUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [resetUser, setResetUser] = useState<UserData | null>(null);


  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const res = await api.get<PaginatedUsers>(`/api/users?${params}`);
      setData(res);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user? This action cannot be undone.")) return;
    try {
      await api.delete(`/api/users/${id}`);
      loadUsers();
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Users</h1>
          <p className="text-sm text-white/35 mt-0.5">
            {data?.pagination.total || 0} total users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary">
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button onClick={() => { setEditingUser(null); setShowModal(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or roll number..."
            className="input-field pl-10"
          />
        </form>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="input-field w-auto min-w-[140px]"
        >
          <option value="">All Roles</option>
          <option value="STUDENT">Student</option>
          <option value="FACULTY">Faculty</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2d3a]/50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider hidden md:table-cell">Roll No</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider hidden lg:table-cell">Department</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider hidden sm:table-cell">RFID</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider hidden md:table-cell">Attendance</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-[#2a2d3a]/30">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-5 bg-white/5 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-xs text-white/20">
                    No users found
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-[10px] font-bold text-brand-400 shrink-0">
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{user.name}</p>
                          <p className="text-[11px] text-white/25 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50 hidden md:table-cell">{user.rollNo || "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/50 hidden lg:table-cell">{user.department || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        user.role === "ADMIN"
                          ? "text-purple-400 bg-purple-400/10 border-purple-400/20"
                          : user.role === "FACULTY"
                          ? "text-blue-400 bg-blue-400/10 border-blue-400/20"
                          : "text-white/50 bg-white/5 border-white/10"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {user.rfidUid ? (
                        <button
                          onClick={() => { setEditingUser(user); setShowModal(true); }}
                          className="flex items-center gap-1.5 text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors"
                        >
                          <Radio className="w-3 h-3" />
                          {user.rfidUid}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setEditingUser(user); setShowModal(true); }}
                          className="text-[11px] text-white/20 hover:text-white/40 transition-colors"
                        >
                          Assign card
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40 hidden md:table-cell">
                      {user._count.attendance} days
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditingUser(user); setShowModal(true); }}
                          className="p-1.5 rounded-md hover:bg-white/5 text-white/20 hover:text-white/50 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setResetUser(user)}
                          className="p-1.5 rounded-md hover:bg-amber-500/10 text-white/20 hover:text-amber-400 transition-colors"
                          title="Reset password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2d3a]/50">
            <p className="text-[11px] text-white/25">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md hover:bg-white/5 text-white/30 hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
                disabled={page === data.pagination.totalPages}
                className="p-1.5 rounded-md hover:bg-white/5 text-white/30 hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <UserModal
          user={editingUser}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          onSaved={() => { setShowModal(false); setEditingUser(null); loadUsers(); }}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); loadUsers(); }}
        />
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
        />
      )}
    </div>
  );
}

function ResetPasswordModal({ user, onClose }: { user: UserData; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post(`/api/users/${user.id}/reset-password`, { password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3a]/50">
          <h3 className="text-sm font-semibold text-white">Reset Password</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/5 text-white/30 hover:text-white/60">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!success ? (
            <>
              <p className="text-xs text-white/40">
                Set a new password for <span className="text-white/70 font-medium">{user.name}</span>
                ({user.email})
              </p>
              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-[11px] font-medium text-white/40 mb-1">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="Min 6 characters"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" disabled={loading || password.length < 6} className="btn-primary text-xs">
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm text-white font-medium mb-1">Password Reset</p>
              <p className="text-xs text-white/35 mb-4">
                {user.name}&apos;s password has been updated.
              </p>
              <button onClick={onClose} className="btn-primary text-xs px-6">Done</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function UserModal({ user, onClose, onSaved }: { user: UserData | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    rollNo: user?.rollNo || "",
    department: user?.department || "",
    role: user?.role || "STUDENT",
    rfidUid: user?.rfidUid || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: any = { ...form };
      if (!body.password && user) delete body.password;
      if (!body.rfidUid) delete body.rfidUid;

      if (user) {
        await api.put(`/api/users/${user.id}`, body);
      } else {
        if (!body.password) {
          setError("Password is required for new users");
          setLoading(false);
          return;
        }
        await api.post("/api/users", body);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3a]/50">
          <h3 className="text-sm font-semibold text-white">{user ? "Edit User" : "Add New User"}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/5 text-white/30 hover:text-white/60">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1">Full Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input-field" />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="input-field" />
          </div>

          {!user && (
            <div>
              <label className="block text-[11px] font-medium text-white/40 mb-1">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" placeholder="Min 6 characters" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-white/40 mb-1">Roll Number</label>
              <input type="text" value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-white/40 mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1">Department</label>
            <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input-field" />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1">RFID Card UID</label>
            <input type="text" value={form.rfidUid} onChange={(e) => setForm({ ...form, rfidUid: e.target.value })} className="input-field" placeholder="e.g. AA:BB:CC:DD" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary text-xs">
              {loading ? "Saving..." : user ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
