// Apollo: the decision-maker at a business, and their work email. A
// search costs nothing; revealing an email costs a credit, so it only
// happens when someone saves a lead. Server only.
//
// Uses APOLLO_API_KEY (a master key: the search needs one).

import { callJson } from "./http";
import { track, type Who } from "../usage";

const APOLLO = "https://api.apollo.io/api/v1";

export const apolloReady = () => Boolean(process.env.APOLLO_API_KEY);

async function post<T>(path: string, params: URLSearchParams) {
  return callJson<T>("Apollo", `${APOLLO}/${path}?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": process.env.APOLLO_API_KEY ?? "",
    },
    body: "{}",
  });
}

type ApolloPerson = {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  email_status?: string;
  phone_numbers?: { sanitized_number?: string; raw_number?: string }[];
  organization?: { primary_phone?: { number?: string } };
};

/** People at the business with one of these titles (no credits). */
export async function searchPeople(domain: string, titles: string[], who: Who) {
  const params = new URLSearchParams();
  params.append("q_organization_domains_list[]", domain);
  for (const title of titles) params.append("person_titles[]", title);
  params.set("per_page", "5");
  params.set("page", "1");
  const res = await post<{
    people?: ApolloPerson[];
    contacts?: ApolloPerson[];
  }>("mixed_people/api_search", params);
  track("apollo_search", who);
  return [...(res.people ?? []), ...(res.contacts ?? [])].filter((p) => p.id);
}

/** One person's work email (a credit when Apollo finds one). */
export async function revealPerson(
  who: Who,
  person: { id: string } | { name: string; domain: string },
) {
  const params = new URLSearchParams({ reveal_personal_emails: "false" });
  if ("id" in person) params.set("id", person.id);
  else {
    params.set("name", person.name);
    params.set("domain", person.domain);
  }
  const res = await post<{ person?: ApolloPerson }>("people/match", params);
  const p = res.person;
  if (p?.email) track("apollo_match", who);
  if (!p) return undefined;
  return {
    name: p.name ?? [p.first_name, p.last_name].filter(Boolean).join(" "),
    title: p.title ?? "",
    email: p.email ?? undefined,
    verified: p.email_status === "verified",
    phone:
      p.phone_numbers?.[0]?.sanitized_number ??
      p.phone_numbers?.[0]?.raw_number ??
      undefined,
  };
}
