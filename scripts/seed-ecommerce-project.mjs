import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseDotenvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const out = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }

  return out;
}

function getEnv(name) {
  return process.env[name] && String(process.env[name]).trim()
    ? String(process.env[name]).trim()
    : undefined;
}

function getRequiredEnv(name, fallback) {
  const v = getEnv(name) ?? fallback?.[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function estimateEffortChinaHours(attrs) {
  const baseEffort = 1200;
  const contribution =
    attrs.afp * -1.041 +
    attrs.input * -2.293 +
    attrs.output * 0.674 +
    attrs.enquiry * -0.344 +
    attrs.file * 1.247 +
    attrs.interface * 2.156 +
    attrs.resource * 3.892 +
    attrs.duration * 8.467;
  const totalEffort = baseEffort + contribution * 50;
  return Math.max(totalEffort, 100);
}

function hoursToMonths(hours) {
  return Math.round((hours / 160) * 100) / 100;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeChinaAttrs(size) {
  // “size” roughly maps to complexity for e-commerce tasks
  // Keep values within UI descriptor ranges.
  const afpBase = { s: 120, m: 220, l: 380, xl: 650 }[size] ?? 220;
  return {
    afp: randInt(afpBase - 40, afpBase + 80),
    input: randInt(10, size === "xl" ? 80 : size === "l" ? 55 : 40),
    output: randInt(10, size === "xl" ? 90 : size === "l" ? 60 : 45),
    enquiry: randInt(5, size === "xl" ? 45 : size === "l" ? 35 : 25),
    file: randInt(5, size === "xl" ? 45 : size === "l" ? 30 : 22),
    interface: randInt(2, size === "xl" ? 25 : size === "l" ? 18 : 12),
    resource: randInt(2, size === "xl" ? 8 : 7),
    duration: randInt(size === "s" ? 2 : size === "m" ? 4 : size === "l" ? 6 : 9, size === "xl" ? 18 : 14),
  };
}

async function ensureUser(supabase, { email, full_name, avatar_url = null, is_admin = false }) {
  const { data: existing, error: selErr } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("users")
    .insert({ email, full_name, avatar_url, is_admin })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function ensureProjectMember(supabase, { project_id, user_id, role }) {
  const { data: existing, error: selErr } = await supabase
    .from("project_members")
    .select("id, project_id, user_id, role")
    .eq("project_id", project_id)
    .eq("user_id", user_id)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("project_members")
    .insert({ project_id, user_id, role })
    .select("id, project_id, user_id, role")
    .single();
  if (error) throw error;
  return data;
}

async function ensureSwimlane(supabase, { project_id, name, position }) {
  const { data: existing, error: selErr } = await supabase
    .from("swimlanes")
    .select("*")
    .eq("project_id", project_id)
    .eq("name", name)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("swimlanes")
    .insert({ project_id, name, position })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function insertTask(supabase, task) {
  const { data, error } = await supabase.from("tasks").insert(task).select("*").single();
  if (error) throw error;
  return data;
}

async function insertAssignment(supabase, { task_id, user_id }) {
  const { data: existing, error: selErr } = await supabase
    .from("task_assignments")
    .select("id")
    .eq("task_id", task_id)
    .eq("user_id", user_id)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("task_assignments")
    .insert({ task_id, user_id })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

function usage() {
  console.log(
    [
      "",
      "Seed e-commerce demo data for a project.",
      "",
      "Usage:",
      "  node scripts/seed-ecommerce-project.mjs <projectId> [--tasks=30] [--members=8] [--force]",
      "",
      "Env required (can be in .env.local):",
      "  NEXT_PUBLIC_SUPABASE_URL",
      "  SUPABASE_SERVICE_ROLE_KEY",
      "",
    ].join("\n")
  );
}

async function main() {
  const projectId = process.argv[2];
  if (!projectId || projectId.startsWith("-")) {
    usage();
    process.exit(1);
  }

  const flags = new Set(process.argv.slice(3));
  const tasksFlag = process.argv.find((a) => a.startsWith("--tasks="));
  const membersFlag = process.argv.find((a) => a.startsWith("--members="));
  const force = flags.has("--force");

  const taskCount = Math.max(5, Number(tasksFlag?.split("=")[1] ?? 30));
  const memberCount = Math.max(3, Number(membersFlag?.split("=")[1] ?? 8));

  const envPath = path.resolve(__dirname, "..", ".env.local");
  const dotenv = parseDotenvFile(envPath);

  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL", dotenv);
  const serviceKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", dotenv);
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (projErr) throw projErr;

  console.log(`Seeding project: ${project.name} (${project.id})`);

  if (!force) {
    const { count, error: countErr } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);
    if (countErr) throw countErr;
    if ((count ?? 0) > 0) {
      console.log(
        `Project already has ${count} tasks. Re-run with --force if you want to add more demo tasks.`
      );
      return;
    }
  }

  const swimlaneNames = ["Backlog", "Todo", "In Progress", "Review", "Done"];
  const swimlanes = {};
  for (let i = 0; i < swimlaneNames.length; i++) {
    const lane = await ensureSwimlane(supabase, {
      project_id: projectId,
      name: swimlaneNames[i],
      position: i,
    });
    swimlanes[swimlaneNames[i]] = lane;
  }

  const memberTemplates = [
    ["owner", "Product Owner"],
    ["admin", "Tech Lead"],
    ["member", "Frontend Engineer"],
    ["member", "Backend Engineer"],
    ["member", "QA Engineer"],
    ["member", "UI/UX Designer"],
    ["member", "DevOps Engineer"],
    ["member", "Data Analyst"],
  ];

  const members = [];
  for (let i = 0; i < memberCount; i++) {
    const [role, title] = memberTemplates[i] ?? ["member", `Contributor ${i + 1}`];
    const email = `demo+${projectId.slice(0, 6)}.${i + 1}@example.com`;
    const full_name = `${title} ${i + 1}`;
    const user = await ensureUser(supabase, { email, full_name, is_admin: role === "admin" });
    await ensureProjectMember(supabase, {
      project_id: projectId,
      user_id: user.id,
      role: role === "owner" ? "owner" : role === "admin" ? "admin" : "member",
    });
    members.push(user);
  }

  console.log(`Members ensured: ${members.length}`);
  console.log(`Swimlanes ensured: ${Object.keys(swimlanes).length}`);

  const taskPool = [
    { title: "Set up Next.js app shell + routing", size: "m", lane: "Todo" },
    { title: "Design system: buttons, inputs, layout", size: "m", lane: "Todo" },
    { title: "Auth: sign in / sign up / reset password", size: "l", lane: "Backlog" },
    { title: "Product catalog page + filters", size: "l", lane: "Backlog" },
    { title: "Product detail page (PDP)", size: "m", lane: "Backlog" },
    { title: "Search + autocomplete", size: "m", lane: "Backlog" },
    { title: "Cart: add/update/remove items", size: "l", lane: "Backlog" },
    { title: "Checkout: address + shipping method", size: "xl", lane: "Backlog" },
    { title: "Payments: Stripe integration", size: "xl", lane: "Backlog" },
    { title: "Order confirmation + email receipt", size: "m", lane: "Backlog" },
    { title: "User account: order history", size: "m", lane: "Backlog" },
    { title: "Admin: product CRUD", size: "l", lane: "Backlog" },
    { title: "Admin: inventory + pricing rules", size: "xl", lane: "Backlog" },
    { title: "Admin: promotions/coupons", size: "l", lane: "Backlog" },
    { title: "Performance: image optimization + caching", size: "m", lane: "Backlog" },
    { title: "Observability: error tracking + logs", size: "s", lane: "Backlog" },
    { title: "SEO: metadata + sitemap + robots", size: "s", lane: "Backlog" },
    { title: "Accessibility pass (WCAG basics)", size: "s", lane: "Backlog" },
    { title: "Security: rate limiting + input validation", size: "m", lane: "Backlog" },
    { title: "CI/CD: preview deployments", size: "m", lane: "Backlog" },
  ];

  const createdTasks = [];
  for (let i = 0; i < taskCount; i++) {
    const base = taskPool[i % taskPool.length];
    const attrs = makeChinaAttrs(base.size);
    const effortPm = hoursToMonths(estimateEffortChinaHours(attrs));

    const laneName =
      i < Math.floor(taskCount * 0.15)
        ? "Done"
        : i < Math.floor(taskCount * 0.35)
          ? "In Progress"
          : base.lane;
    const lane = swimlanes[laneName] ?? swimlanes.Backlog;

    const assignee = pick(members);

    const task = await insertTask(supabase, {
      project_id: projectId,
      swimlane_id: lane.id,
      title: `${base.title}${i >= taskPool.length ? ` #${Math.floor(i / taskPool.length) + 1}` : ""}`,
      description: "Seeded e-commerce task for demo dashboard and estimation.",
      position: i,
      // China attributes
      attr_afp: attrs.afp,
      attr_input: attrs.input,
      attr_output: attrs.output,
      attr_enquiry: attrs.enquiry,
      attr_file: attrs.file,
      attr_interface: attrs.interface,
      attr_resource: attrs.resource,
      attr_duration: attrs.duration,
      // Store effort PM so board/reporting looks “ready”
      estimated_effort_pm: effortPm,
      // Light SEE multipliers so EAF/complexity charts have data
      attr_rely: [0.88, 1.0, 1.15, 1.3][randInt(0, 3)],
      attr_cplx: [0.88, 1.0, 1.15, 1.3, 1.5][randInt(0, 4)],
      attr_acap: [0.83, 1.0, 1.15][randInt(0, 2)],
      attr_pcap: [0.83, 1.0, 1.15][randInt(0, 2)],
      attr_tool: [0.83, 1.0, 1.15][randInt(0, 2)],
      attr_sced: [1.0, 1.08, 1.16, 1.23][randInt(0, 3)],
      ...(laneName === "Done"
        ? {
            start_date: new Date(Date.now() - randInt(7, 35) * 86400000).toISOString(),
            end_date: new Date(Date.now() - randInt(0, 6) * 86400000).toISOString(),
          }
        : {}),
    });

    await insertAssignment(supabase, { task_id: task.id, user_id: assignee.id });
    createdTasks.push(task);
  }

  console.log(`Tasks created: ${createdTasks.length}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

