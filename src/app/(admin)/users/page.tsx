"use client";

import { useEffect, useState, useCallback } from "react";
import { admin, type User, type Paginated } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Ban,
} from "lucide-react";

type UserRow = User & { total_sessions?: number };

export default function UsersPage() {
  const [users, setUsers] = useState<Paginated<UserRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Edit dialog
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (roleFilter !== "all") params.role = roleFilter;
      if (search.trim()) params.search = search.trim();
      const data = await admin.users.list(params);
      setUsers(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleFilter = (val: string) => {
    setRoleFilter(val);
    setPage(1);
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditRole(u.role);
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await admin.users.update(editUser.id, { role: editRole });
      setEditUser(null);
      fetchUsers();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;
    try {
      await admin.users.deactivate(userId);
      fetchUsers();
    } catch {
      /* ignore */
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      case "examiner":
        return <Badge variant="warning">Examiner</Badge>;
      default:
        return <Badge variant="secondary">Candidate</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Users</h1>
        <p className="text-sm text-zinc-500">Manage user accounts and roles</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search by username or email…"
            className="pl-9"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={handleRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="examiner">Examiner</SelectItem>
            <SelectItem value="candidate">Candidate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : !users || users.items.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
              No users found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell className="text-zinc-500">{u.email}</TableCell>
                    <TableCell>{roleBadge(u.role)}</TableCell>
                    <TableCell>
                      {u.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit role"
                          onClick={() => openEdit(u)}
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                        {u.is_active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Deactivate"
                            onClick={() => handleDeactivate(u.id)}
                          >
                            <Ban className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {users && users.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            Page {users.page} of {users.total_pages} ({users.total} users)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= users.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-zinc-700">
                  {editUser.username}
                </p>
                <p className="text-xs text-zinc-500">{editUser.email}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">
                  Role
                </label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candidate">Candidate</SelectItem>
                    <SelectItem value="examiner">Examiner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditUser(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
