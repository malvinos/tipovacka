import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Obnovuje Supabase session při každém requestu a propisuje aktualizované
 * cookies do odpovědi. Volá se z kořenového middleware.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Důležité: nevkládat žádnou logiku mezi createServerClient a getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Onboarding: přihlášeného bez dokončeného uvítání pošli na /vitej.
  const pathname = request.nextUrl.pathname;
  const skip =
    pathname.startsWith("/vitej") ||
    pathname.startsWith("/prihlaseni") ||
    pathname.startsWith("/odhlaseni") ||
    pathname.startsWith("/auth");

  if (user && !skip) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .single();

    if (profile && !profile.onboarded) {
      const url = request.nextUrl.clone();
      url.pathname = "/vitej";
      const redirectResponse = NextResponse.redirect(url);
      // Přenes obnovené cookies do přesměrování.
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  return supabaseResponse;
}
