"use client";

import { useState, useEffect } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CreateMemberForm } from "@/components/create-member-form";
import { UserPlus, X, Search, Users, Mail, Shield } from "lucide-react";

interface ProjectMember {
    id: string;
    role: string | null;
    joined_at: string | null;
    users: Tables<"users"> | null;
}

interface TeamViewProps {
    projectId: string;
    canManageMembers?: boolean;
    canChangeRoles?: boolean;
    canCreateAccounts?: boolean;
    accountCreationAvailable?: boolean;
}

export function TeamView({
    projectId,
    canManageMembers = false,
    canChangeRoles = false,
    canCreateAccounts = false,
    accountCreationAvailable = false,
}: TeamViewProps) {
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [availableUsers, setAvailableUsers] = useState<Tables<"users">[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
    useEffect(() => {
        fetchMembers();
    }, [projectId]);

    useEffect(() => {
        if (canManageMembers) {
            fetchAvailableUsers();
        }
    }, [projectId, canManageMembers]);

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
        if (canManageMembers) {
            const timer = setTimeout(() => {
                fetchAvailableUsers();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, canManageMembers]);

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
        if (!confirm("Are you sure you want to remove this member?")) return;
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

    const refreshAll = async () => {
        await fetchMembers();
        if (canManageMembers) await fetchAvailableUsers();
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-[#172B4D]">People</h2>
                <p className="text-sm text-[#5E6C84] mt-1">
                    {canManageMembers || canCreateAccounts
                        ? "Manage project access, roles, and create new member accounts."
                        : "View project members. Contact an admin to make changes."}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-500" />
                                Project Members
                            </CardTitle>
                            <CardDescription>
                                People with access to this project
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {members.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        {canManageMembers
                                            ? "No members found. Invite someone from the right panel."
                                            : "No members found in this project."}
                                    </div>
                                ) : (
                                    members.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                                    <AvatarImage
                                                        src={member.users?.avatar_url || undefined}
                                                    />
                                                    <AvatarFallback className="bg-indigo-100 text-indigo-700">
                                                        {getInitials(
                                                            member.users?.full_name || null,
                                                            member.users?.email || ""
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-slate-900">
                                                        {member.users?.full_name || "Unknown User"}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Mail className="w-3 h-3" />
                                                        {member.users?.email}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                                                    <Shield className="w-3 h-3" />
                                                    <span className="capitalize">{member.role}</span>
                                                </div>
                                                <Select
                                                    value={member.role || "member"}
                                                    onValueChange={(role) => updateRole(member.id, role)}
                                                    disabled={!canChangeRoles}
                                                >
                                                    <SelectTrigger className="w-[110px] h-9" disabled={!canChangeRoles}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                        <SelectItem value="member">Member</SelectItem>
                                                        <SelectItem value="viewer">Viewer</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    onClick={() => removeMember(member.id)}
                                                    disabled={!canManageMembers}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {(canCreateAccounts || canManageMembers) ? (
                    <div className="md:col-span-1 space-y-4">
                        {canCreateAccounts && (
                            <>
                                <Button
                                    type="button"
                                    onClick={() => setIsCreateAccountOpen(true)}
                                    className="w-full rounded-sm bg-[#0052CC] hover:bg-[#0065FF]"
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Create member account
                                </Button>

                                <Dialog
                                    open={isCreateAccountOpen}
                                    onOpenChange={setIsCreateAccountOpen}
                                >
                                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Create member account</DialogTitle>
                                            <DialogDescription>
                                                Creates a Supabase auth user and adds them to this project.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <CreateMemberForm
                                            projectId={projectId}
                                            onCreated={async () => {
                                                await refreshAll();
                                                setIsCreateAccountOpen(false);
                                            }}
                                            enabled={accountCreationAvailable}
                                            variant="plain"
                                        />
                                    </DialogContent>
                                </Dialog>
                            </>
                        )}
                        {canManageMembers && (
                        <Card className="bg-white border-[#DFE1E6] rounded-sm ads-raised">
                            <CardHeader className="border-b border-[#DFE1E6] pb-3">
                                <CardTitle className="text-base font-semibold text-[#172B4D] flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-[#0052CC]" />
                                    Add existing user
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="Search users..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 bg-white"
                                        />
                                    </div>

                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                        {filteredUsers.length === 0 ? (
                                            <p className="text-sm text-slate-500 text-center py-4">
                                                No users found matching "{searchQuery}"
                                            </p>
                                        ) : (
                                            filteredUsers.map((user) => (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <Avatar className="h-8 w-8 shrink-0">
                                                            <AvatarImage src={user.avatar_url || undefined} />
                                                            <AvatarFallback className="text-xs">
                                                                {getInitials(user.full_name, user.email)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0 truncate">
                                                            <p className="text-sm font-medium truncate">
                                                                {user.full_name || user.email}
                                                            </p>
                                                            <p className="text-xs text-slate-500 truncate">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 shrink-0"
                                                        onClick={() => addMember(user.id)}
                                                        disabled={isLoading}
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        )}
                    </div>
                ) : (
                    <div className="md:col-span-1">
                        <Card className="bg-slate-50 border-slate-200">
                            <CardHeader className="bg-slate-100/50 border-b border-slate-200 pb-4">
                                <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Access Restricted
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-3 text-sm text-slate-600">
                                    <p>
                                        Only administrators can add, edit, or remove team members.
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Contact your project administrator to manage team members.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
