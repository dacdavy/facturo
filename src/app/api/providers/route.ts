import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .or(`is_default.eq.true,user_id.eq.${user.id}`)
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, sender_email, invoice_url, logo_url } = body;

    if (!name || !sender_email) {
      return NextResponse.json(
        { error: "Name and sender email are required" },
        { status: 400 }
      );
    }

    const search_query = `from:${sender_email} subject:(receipt OR invoice OR payment OR facture)`;

    const { data, error } = await supabase
      .from("providers")
      .insert({
        user_id: user.id,
        name,
        sender_email,
        invoice_url: invoice_url || null,
        logo_url: logo_url || null,
        search_query,
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
