import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { getAuthContext, getProjectAuth } from "@/lib/auth";
import { can, normalizeRole, type ProjectRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const excludeProject = searchParams.get("excludeProject");

  if (excludeProject) {
    const ctx = await getProjectAuth(excludeProject);
    if (
      !ctx ||
      !can(ctx.role, "member:add", ctx.isGlobalAdmin)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!auth.isGlobalAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  let query = supabase
    .from("users")
    .select("id, email, full_name, avatar_url")
    .order("full_name", { ascending: true });

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data: users, error } = await query.limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (excludeProject && users) {
    const { data: existingMembers } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", excludeProject);

    const memberIds = existingMembers?.map((m) => m.user_id) || [];
    return NextResponse.json(users.filter((u) => !memberIds.includes(u.id)));
  }

  return NextResponse.json(users);
}

/** Tạo tài khoản auth + public.users (+ optional project member) bằng service role */
export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "Server missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const {
    email,
    password,
    full_name,
    project_id,
    project_role = "member",
    is_admin = false,
  } = body as {
    email: string;
    password: string;
    full_name?: string;
    project_id?: string;
    project_role?: ProjectRole;
    is_admin?: boolean;
  };

  if (!email?.trim() || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  if (project_id) {
    const ctx = await getProjectAuth(project_id);
    if (
      !ctx ||
      !can(ctx.role, "member:create_account", ctx.isGlobalAdmin)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!auth.isGlobalAdmin) {
    return NextResponse.json(
      { error: "Only global admins can create users without a project" },
      { status: 403 }
    );
  }

  if (is_admin && !auth.isGlobalAdmin) {
    return NextResponse.json(
      { error: "Only global admins can grant global admin" },
      { status: 403 }
    );
  }

  const role = normalizeRole(project_role);
  if (role === "owner" && project_id) {
    return NextResponse.json(
      { error: "Cannot assign owner role when creating account" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: existingProfile } = await supabase
    .from("users")
    .select("id, user_auth_id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (existingProfile) {
    if (project_id) {
      const { data: existingMember } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", project_id)
        .eq("user_id", existingProfile.id)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this project" },
          { status: 400 }
        );
      }

      const { data: member, error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id,
          user_id: existingProfile.id,
          role,
        })
        .select()
        .single();

      if (memberError) {
        return NextResponse.json({ error: memberError.message }, { status: 500 });
      }

      return NextResponse.json({
        user: existingProfile,
        member,
        message: "Existing user added to project",
      });
    }

    return NextResponse.json(
      { error: "Email already registered" },
      { status: 400 }
    );
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: full_name ? { full_name } : undefined,
    });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || "Failed to create auth user" },
      { status: 500 }
    );
  }

  const { data: dbUser, error: dbError } = await admin
    .from("users")
    .insert({
      email: email.trim().toLowerCase(),
      full_name: full_name?.trim() || null,
      user_auth_id: authData.user.id,
      is_admin: is_admin === true,
    })
    .select("id, email, full_name, avatar_url, is_admin")
    .single();

  if (dbError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  let member = null;
  if (project_id) {
    const { data: memberRow, error: memberError } = await admin
      .from("project_members")
      .insert({
        project_id,
        user_id: dbUser.id,
        role,
      })
      .select()
      .single();

    if (memberError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      await admin.from("users").delete().eq("id", dbUser.id);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }
    member = memberRow;
  }

  return NextResponse.json(
    {
      user: dbUser,
      member,
      auth_user_id: authData.user.id,
    },
    { status: 201 }
  );
}
