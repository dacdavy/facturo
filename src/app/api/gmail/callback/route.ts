import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTokensFromCode, getUserEmail } from "@/lib/gmail";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=gmail_auth_denied`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login`
    );
  }

  try {
    const tokens = await getTokensFromCode(code);
    const email = await getUserEmail(tokens.access_token!);

    const { error: dbError } = await supabase
      .from("email_accounts")
      .upsert(
        {
          user_id: user.id,
          provider: "gmail",
          email: email!,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
        },
        { onConflict: "user_id,email" }
      );

    if (dbError) {
      console.error("Error saving email account:", dbError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=save_failed`
      );
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=gmail_connected`
    );
  } catch (err) {
    console.error("Gmail callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=gmail_callback_failed`
    );
  }
}
