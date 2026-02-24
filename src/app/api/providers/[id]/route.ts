import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, sender_email, invoice_url, logo_url } = body;

    const search_query = sender_email
      ? `from:${sender_email} subject:(receipt OR invoice OR payment OR facture)`
      : undefined;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (sender_email) updateData.sender_email = sender_email;
    if (search_query) updateData.search_query = search_query;
    if (invoice_url !== undefined) updateData.invoice_url = invoice_url || null;
    if (logo_url !== undefined) updateData.logo_url = logo_url || null;

    const { data, error } = await supabase
      .from("providers")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_default", false)
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("providers")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_default", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
