// Every client, for the admin, and one client by id. SAMPLE: the three
// sample sign-ins plus six more. After the move, these read the database.

import { demoClient } from "./demo";
import { moreClients } from "./demo-more";
import type { Client } from "./types";

const SIGN_IN_CLIENTS = ["desert-star", "copper-state", "mesa-executive"];

export function allClients(now: Date): Client[] {
  return [
    ...SIGN_IN_CLIENTS.map((id) => demoClient(id, now)!),
    ...moreClients(now),
  ];
}

export function findClient(id: string, now: Date): Client | undefined {
  return demoClient(id, now) ?? moreClients(now).find((c) => c.id === id);
}
