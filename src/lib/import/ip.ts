import { isIP } from "node:net";

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

function blockedV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  });
}

function expandV6(ip: string): number[] | undefined {
  let address = ip.toLowerCase().split("%")[0] ?? "";
  // An IPv4 tail ("::ffff:10.0.0.1") becomes two hex groups.
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(address);
  if (v4?.[1]) {
    const n = ipv4ToInt(v4[1]);
    address = address.replace(v4[1], `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`);
  }
  const [head = "", tail] = address.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail !== undefined && tail !== "" ? tail.split(":") : [];
  const missing = 8 - headParts.length - tailParts.length;
  if (tail === undefined && headParts.length !== 8) return undefined;
  if (missing < 0) return undefined;
  const groups = [...headParts, ...Array(tail === undefined ? 0 : missing).fill("0"), ...tailParts];
  const values = groups.map((g) => parseInt(g, 16));
  return values.length === 8 && values.every((v) => Number.isInteger(v) && v >= 0 && v <= 0xffff) ? values : undefined;
}

function blockedV6(ip: string): boolean {
  const g = expandV6(ip);
  if (!g) return true;
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, h = 0, i = 0] = g;
  if (g.every((v) => v === 0)) return true; // ::
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0 && h === 0 && i === 1) return true; // ::1
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d): check the embedded IPv4.
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && (f === 0xffff || f === 0)) {
    return blockedV4(`${h >>> 8}.${h & 0xff}.${i >>> 8}.${i & 0xff}`);
  }
  if (a === 0x64 && b === 0xff9b) return blockedV4(`${h >>> 8}.${h & 0xff}.${i >>> 8}.${i & 0xff}`); // NAT64
  if ((a & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
  if ((a & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((a & 0xff00) === 0xff00) return true; // multicast
  if (a === 0x2001 && b === 0x0db8) return true; // documentation
  if (a === 0x2002) return blockedV4(`${b >>> 8}.${b & 0xff}.${c >>> 8}.${c & 0xff}`); // 6to4
  return false;
}

/** True for any address that isn't a normal public internet address. */
export function isBlockedAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return blockedV4(ip);
  if (version === 6) return blockedV6(ip);
  return true;
}
