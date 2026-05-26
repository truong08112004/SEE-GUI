import { createClient } from "@/lib/supabase/server";
import { ProjectDashboard } from "@/components/project-dashboard";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Fetch the first project and its swimlanes
    const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .limit(1)
        .single();

    const { data: swimlanes } = await supabase
        .from("swimlanes")
        .select("*")
        .eq("project_id", projects?.id || "")
        .order("position");

    const { data: tasks } = await supabase
        .from("tasks")
        .select(
            `
      *,
      task_assignments (
        id,
        assigned_at,
        users (id, email, full_name, avatar_url)
      )
    `
        )
        .eq("project_id", projects?.id || "")
        .order("position");

    return (
        <main className="min-h-screen bg-background">
            <ProjectDashboard
                project={projects}
                initialSwimlanes={swimlanes || []}
                initialTasks={tasks || []}
                user={user!}
            />
        </main>
    );
}
