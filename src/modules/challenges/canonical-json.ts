/**
 * Serialize JSON data with recursively sorted object keys.
 *
 * Arrays retain their order because order is meaningful in ChallengeSpec. Values
 * that JSON would silently discard or coerce are rejected to avoid ambiguous
 * content hashes.
 */
export function canonicalizeJson(value: unknown): string {
  return serializeCanonical(value, "$", new WeakSet<object>());
}

function serializeCanonical(
  value: unknown,
  path: string,
  ancestors: WeakSet<object>,
): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Non-finite number at ${path} cannot be canonicalized`);
    }
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }

  if (typeof value !== "object") {
    throw new TypeError(`Unsupported ${typeof value} value at ${path}`);
  }

  if (ancestors.has(value)) {
    throw new TypeError(`Circular reference detected at ${path}`);
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const entries = value.map((entry, index) =>
        serializeCanonical(entry, `${path}[${index}]`, ancestors),
      );
      return `[${entries.join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Non-plain object at ${path} cannot be canonicalized`);
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const entries = keys.map((key) => {
      const encodedKey = JSON.stringify(key);
      const encodedValue = serializeCanonical(record[key], `${path}.${key}`, ancestors);
      return `${encodedKey}:${encodedValue}`;
    });
    return `{${entries.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

