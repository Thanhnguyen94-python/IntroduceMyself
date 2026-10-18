// Tạo mới hoặc đặt lại mật khẩu tài khoản admin trên Supabase (dùng khi quên mật khẩu).
// Dùng: npm run admin:set-password -- <username> [email]
// Đọc NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY từ .env.local. Mật khẩu nhập ẩn, không lưu lịch sử shell.
import { createInterface } from "readline";
import { existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const [rawUsername, rawEmail] = process.argv.slice(2);
const username = (rawUsername ?? "").trim().toLowerCase();
const email = (rawEmail ?? "").trim().toLowerCase() || null;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

if (!/^[a-z0-9._@+-]{3,120}$/.test(username)) fail("Dùng: npm run admin:set-password -- <username> [email]");
if (!url || !serviceKey) fail("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = rl._writeToOutput.bind(rl);
    rl._writeToOutput = (text) => write(text.startsWith(question) ? text : "*");
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

const password = await askHidden("Mật khẩu mới (>= 10 ký tự): ");
if (password.length < 10) fail("Mật khẩu quá ngắn.");
const confirm = await askHidden("Nhập lại mật khẩu: ");
if (confirm !== password) fail("Hai lần nhập không khớp.");

// "$2a$" để cả bcryptjs và hàm SQL verify_admin_login (pgcrypto) đều đọc được.
const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10).replace(/^\$2b\$/, "$2a$"));
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: existing, error: findError } = await supabase.from("admin_profiles").select("id").eq("username", username).limit(1);
if (findError) fail(`Không đọc được admin_profiles: ${findError.message}`);

const now = new Date().toISOString();
const result = existing?.length
  ? await supabase.from("admin_profiles").update({ password_hash: passwordHash, is_active: true, updated_at: now }).eq("id", existing[0].id)
  : await supabase
      .from("admin_profiles")
      .insert({ username, email, display_name: username, role: "admin", is_active: true, password_hash: passwordHash });

if (result.error) fail(`Không lưu được: ${result.error.message}`);
console.log(`✔ Đã ${existing?.length ? "đặt lại mật khẩu cho" : "tạo"} tài khoản admin "${username}".`);
