const FIRST = ["Avery", "Jordan", "Sam", "Riley", "Casey", "Quinn", "Morgan", "Taylor"];
const LAST = ["Patel", "Nguyen", "Garcia", "Khan", "Okafor", "Berg", "Silva", "Cohen"];
const STREETS = ["Oak", "Maple", "Cedar", "Pine", "Lake", "Hill"];

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function stamp() {
  return Date.now().toString(36);
}

export type DataKind =
  | "email"
  | "phone"
  | "name"
  | "address"
  | "uuid"
  | "lorem"
  | "card"
  | "password";

export function generate(kind: DataKind): string {
  switch (kind) {
    case "email":
      return `qa+${stamp()}@example.com`;
    case "phone":
      return `+1-555-01${String(Math.floor(Math.random() * 90) + 10)}`;
    case "name":
      return `${pick(FIRST)} ${pick(LAST)}`;
    case "address":
      return `${Math.floor(Math.random() * 900) + 100} ${pick(STREETS)} St, Springfield, IL 62701`;
    case "uuid":
      return crypto.randomUUID();
    case "lorem":
      return "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.";
    case "card":
      return "4242424242424242";
    case "password":
      return `Qa-${stamp()}-Test!9`;
  }
}

export const DATA_BUTTONS: { kind: DataKind; label: string }[] = [
  { kind: "email", label: "Email" },
  { kind: "phone", label: "Phone" },
  { kind: "name", label: "Name" },
  { kind: "address", label: "Address" },
  { kind: "uuid", label: "UUID" },
  { kind: "lorem", label: "Lorem" },
  { kind: "card", label: "Test card" },
  { kind: "password", label: "Password" },
];
