import { redirect } from "next/navigation";

export default function CallbackRedirectPage() {
  redirect("/vi/auth/callback");
}
