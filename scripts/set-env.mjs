// 비밀 키를 화면에 보이지 않게 입력받아 .env.local 에 저장한다.
// 사용: node scripts/set-env.mjs 이름 [시작 글자]   (예: node scripts/set-env.mjs SUPABASE_SECRET_KEY sb_secret_)
import fs from "node:fs";

const name = process.argv[2];
if (!name || !/^[A-Z][A-Z0-9_]*$/.test(name)) {
  console.log("사용법: node scripts/set-env.mjs 이름 (대문자 · 숫자 · _ 만)");
  process.exit(1);
}

process.stdout.write(`${name} 값을 붙여넣고 Enter 를 누르세요 (화면에는 안 보여요): `);
const stdin = process.stdin;
stdin.setRawMode?.(true);
stdin.resume();
stdin.setEncoding("utf8");

let value = "";
stdin.on("data", (chunk) => {
  for (const ch of chunk) {
    if (ch === "\r" || ch === "\n") return save();
    if (ch === "\u0003") process.exit(1); // Ctrl-C
    if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
    else value += ch;
  }
});

function save() {
  stdin.setRawMode?.(false);
  // 붙여넣기 때 터미널이 끼워 넣는 표시(ESC[200~ … ESC[201~)와 제어 문자를 지운다
  value = value.replace(/\u001b\[20[01]~/g, "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!value) {
    console.log("\n값이 비어 있어 저장하지 않았어요.");
    process.exit(1);
  }
  const prefix = process.argv[3];
  if (prefix && !value.startsWith(prefix)) {
    console.log(`\n"${prefix}" 로 시작하지 않아 저장하지 않았어요 (${value.length}글자). 키 전체를 복사했는지 확인해 주세요.`);
    process.exit(1);
  }
  const file = ".env.local";
  const lines = (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "")
    .split("\n")
    .filter((l) => l && !l.startsWith(name + "="));
  lines.push(`${name}=${value}`);
  fs.writeFileSync(file, lines.join("\n") + "\n");
  console.log(`\n저장했어요: ${name} (${value.length}글자). 이제 이 창은 닫아도 돼요.`);
  process.exit(0);
}
