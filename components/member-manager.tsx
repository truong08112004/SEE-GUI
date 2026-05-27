"use client";

import { useState, useEffect } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateMemberForm } from "@/components/create-member-form";
import { UserPlus, X, Search, Users, Shield } from "lucide-react";

interface ProjectMember {
  id: string;
  role: string | null;
  joined_at: string | null;
  users: Tables<"users"> | null;
}

interface MemberManagerProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canChangeRoles?: boolean;
  canManageMembers?: boolean;
  canCreateAccounts?: boolean;
  accountCreationAvailable?: boolean;
}

export function MemberManager({
  projectId,
  open,
  onOpenChange,
  canChangeRoles = false,
  canManageMembers = false,
  canCreateAccounts = false,
  accountCreationAvailable = false,
}: MemberManagerProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Tables<"users">[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMembers();
      if (canManageMembers) fetchAvailableUsers();
    }
  }, [open, projectId, canManageMembers]);

  const fetchMembers = async () => {
    const res = await fetch(`/api/projects/${projectId}/members`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data);
    }
  };

  const fetchAvailableUsers = async () => {
    const searchParam = searchQuery
      ? `&search=${encodeURIComponent(searchQuery)}`
      : "";
    const res = await fetch(
      `/api/users?excludeProject=${projectId}${searchParam}`
    );
    if (res.ok) {
      const users = await res.json();
      setAvailableUsers(users);
    }
  };

  useEffect(() => {
    if (open && canManageMembers) {
      const timer = setTimeout(() => {
        fetchAvailableUsers();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, open, canManageMembers]);

  const addMember = async (userId: string, role: string = "member") => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role }),
      });

      if (res.ok) {
        await fetchMembers();
        await fetchAvailableUsers();
        setSearchQuery("");
      }
    } catch (error) {
      console.error("Error adding member:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRole = async (memberId: string, role: string) => {
    try {
      await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      await fetchMembers();
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
      });
      await fetchMembers();
      await fetchAvailableUsers();
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name)
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    return email[0].toUpperCase();
  };

  const filteredUsers = availableUsers.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Project Members
          </DialogTitle>
          <DialogDescription>
            {canChangeRoles || canCreateAccounts
              ? "Add members, create new accounts, or manage roles"
              : "View project members (admins can edit)"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {canCreateAccounts && (
            <CreateMemberForm
              projectId={projectId}
              onCreated={async () => {
                await fetchMembers();
                if (canManageMembers) await fetchAvailableUsers();
              }}
              enabled={accountCreationAvailable}
              variant="plain"
            />
          )}

          {canManageMembers && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Add existing user</h4>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No matching users found
                  </p>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {user.full_name || user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addMember(user.id)}
                        disabled={isLoading}>
                        <UserPlus className="size-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {!canChangeRoles && !canCreateAccounts && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border border-muted">
              <Shield className="size-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Only project administrators can add, edit, or remove members.
              </p>
            </div>
          )}

          {/* Current Members */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Current members ({members.length})
            </h4>
            <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No members yet. Add someone from the panel above.
                </p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarImage
                          src={member.users?.avatar_url || undefined}
                        />
                        <AvatarFallback>
                          {getInitials(
                            member.users?.full_name || null,
                            member.users?.email || ""
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.users?.full_name || member.users?.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.users?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role || "member"}
                        onValueChange={(role) => updateRole(member.id, role)}
                        disabled={!canChangeRoles}>
                        <SelectTrigger className="w-24 h-8" disabled={!canChangeRoles}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => removeMember(member.id)}
                        disabled={!canChangeRoles}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
