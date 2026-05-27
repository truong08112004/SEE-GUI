"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { UserPlus, Loader2, AlertCircle } from "lucide-react";
import { PROJECT_ROLES, ROLE_LABELS, type ProjectRole } from "@/lib/permissions";

interface CreateMemberFormProps {
  projectId: string;
  onCreated: () => void;
  /** false when server has no SUPABASE_SERVICE_ROLE_KEY */
  enabled?: boolean;
  compact?: boolean;
  /** Render without Card/header (for Dialog embedding) */
  variant?: "card" | "section" | "plain";
}

export function CreateMemberForm({
  projectId,
  onCreated,
  enabled = true,
  compact = false,
  variant,
}: CreateMemberFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [projectRole, setProjectRole] = useState<ProjectRole>("member");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const assignableRoles = PROJECT_ROLES.filter((r) => r !== "owner");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enabled) return;
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim() || undefined,
          project_id: projectId,
          project_role: projectRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      const label = data.user?.email || email.trim();
      setSuccess(
        data.message === "Existing user added to project"
          ? `Added ${label} to the project (account already existed)`
          : `Account created for ${label}`
      );
      setEmail("");
      setPassword("");
      setFullName("");
      setProjectRole("member");
      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!enabled && (
        <div className="flex gap-2 text-sm text-[#974F0C] bg-[#FFFAE6] border border-[#FFE380] px-3 py-2 rounded-sm">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <p>
            <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> is not
            configured on the server. Add the key from Supabase Dashboard →
            Settings → API to <code className="text-xs">.env.local</code>, then
            restart the app.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="member-email" className="text-[#172B4D]">
          Email
        </Label>
        <Input
          id="member-email"
          type="email"
          required
          disabled={!enabled}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="member@company.com"
          className="border-2 border-[#DFE1E6] rounded-sm h-9"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="member-password" className="text-[#172B4D]">
          Password
        </Label>
        <Input
          id="member-password"
          type="password"
          required
          minLength={6}
          disabled={!enabled}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 6 characters"
          className="border-2 border-[#DFE1E6] rounded-sm h-9"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="member-name" className="text-[#172B4D]">
          Full name (optional)
        </Label>
        <Input
          id="member-name"
          disabled={!enabled}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
          className="border-2 border-[#DFE1E6] rounded-sm h-9"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-[#172B4D]">Project role</Label>
        <Select
          value={projectRole}
          onValueChange={(v) => setProjectRole(v as ProjectRole)}
          disabled={!enabled}
        >
          <SelectTrigger className="border-2 border-[#DFE1E6] rounded-sm h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assignableRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-[#DE350B] bg-[#FFEBE6] px-3 py-2 rounded-sm">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-[#006644] bg-[#E3FCEF] px-3 py-2 rounded-sm">
          {success}
        </p>
      )}

      <Button
        type="submit"
        disabled={isLoading || !enabled}
        className="w-full rounded-sm bg-[#0052CC] hover:bg-[#0065FF]"
      >
        {isLoading && <Loader2 className="size-4 mr-2 animate-spin" />}
        Create & add to project
      </Button>
    </form>
  );

  const resolvedVariant: NonNullable<CreateMemberFormProps["variant"]> =
    variant ?? (compact ? "section" : "card");

  if (resolvedVariant === "plain") {
    return formBody;
  }

  if (resolvedVariant === "section") {
    return (
      <div className="space-y-3 border-b border-[#DFE1E6] pb-4">
        <div>
          <h4 className="text-sm font-medium text-[#172B4D] flex items-center gap-2">
            <UserPlus className="size-4 text-[#0052CC]" />
            Create new account
          </h4>
          <p className="text-xs text-[#5E6C84] mt-1">
            Creates a Supabase Auth user and adds them to this project (service
            role, server-only).
          </p>
        </div>
        {formBody}
      </div>
    );
  }

  return (
    <Card className="border-[#DFE1E6] rounded-sm ads-raised bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-[#172B4D] flex items-center gap-2">
          <UserPlus className="size-4 text-[#0052CC]" />
          Create member account
        </CardTitle>
        <CardDescription className="text-[#5E6C84] text-sm">
          Creates a Supabase auth user and adds them to this project with the
          selected role.
        </CardDescription>
      </CardHeader>
      <CardContent>{formBody}</CardContent>
    </Card>
  );
}
