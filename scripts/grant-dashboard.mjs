// 대시보드 켜기 · 끄기 (D-27, 운영자 전용). .env.local 의 Supabase 비밀 키로 dashboard_access 표를 바꾼다.
// 사용: node --env-file=.env.local scripts/grant-dashboard.mjs 이메일 [메모]
//       node --env-file=.env.local scripts/grant-dashboard.mjs 이메일 --off
//       node --env-file=.env.local scripts/grant-dashboard.mjs --list
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.log(".env.local 에 NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SECRET_KEY 가 필요해요. --env-file=.env.local 을 붙여 실행하세요.");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });
const [arg, extra] = process.argv.slice(2);

async function allUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) return users;
  }
}

const users = await allUsers();

if (!arg || arg === "--list") {
  const { data } = await admin.from("dashboard_access").select("user_id, granted_at, note");
  console.log(`대시보드 이용자 ${data?.length ?? 0}명`);
  for (const r of data ?? []) {
    const u = users.find((x) => x.id === r.user_id);
    console.log(`- ${u?.email ?? r.user_id} · ${r.granted_at.slice(0, 10)}${r.note ? ` · ${r.note}` : ""}`);
  }
  process.exit(0);
}

const user = users.find((u) => u.email?.toLowerCase() === arg.toLowerCase());
if (!user) {
  console.log(`${arg} 로 가입한 계정이 없어요. 먼저 그 이메일로 한 번 로그인해야 해요.`);
  process.exit(1);
}

if (extra === "--off") {
  const { error } = await admin.from("dashboard_access").delete().eq("user_id", user.id);
  console.log(error ? `끄지 못했어요: ${error.message}` : `${arg} 의 대시보드를 껐어요.`);
} else {
  const { error } = await admin
    .from("dashboard_access")
    .upsert({ user_id: user.id, note: extra ?? null }, { onConflict: "user_id" });
  console.log(error ? `켜지 못했어요: ${error.message}` : `${arg} 의 대시보드를 켰어요.`);
}
