import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, getAdminSessionUsername, verifyAdminSessionToken } from "@/lib/admin-session";

// Dùng chung cho server component / route handler của khu vực admin.
export async function isAdminRequest() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function getAdminUsername() {
  const cookieStore = await cookies();
  return getAdminSessionUsername(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}
