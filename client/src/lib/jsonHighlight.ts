export type JsonTokenKind = 'plain' | 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punct';

export interface JsonToken {
  text: string;
  kind: JsonTokenKind;
}

const PATTERN =
  /("(?:\\.|[^"\\])*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|\b(true|false)\b|\b(null)\b/g;

/** Tokenize a value's pretty-printed JSON for lightweight syntax highlighting. */
export function tokenizeJson(value: unknown): JsonToken[] {
  const text = JSON.stringify(value ?? null, null, 2) ?? 'null';
  const tokens: JsonToken[] = [];
  let last = 0;

  for (const match of text.matchAll(PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ text: text.slice(last, index), kind: 'plain' });

    if (match[1] !== undefined) {
      tokens.push({ text: match[1], kind: match[2] ? 'key' : 'string' });
      if (match[2]) tokens.push({ text: match[2], kind: 'punct' });
    } else if (match[3] !== undefined) {
      tokens.push({ text: match[3], kind: 'number' });
    } else if (match[4] !== undefined) {
      tokens.push({ text: match[4], kind: 'boolean' });
    } else if (match[5] !== undefined) {
      tokens.push({ text: match[5], kind: 'null' });
    }

    last = index + match[0].length;
  }

  if (last < text.length) tokens.push({ text: text.slice(last), kind: 'plain' });
  return tokens;
}

export const JSON_KIND_CLASS: Record<JsonTokenKind, string> = {
  plain: 'text-muted',
  punct: 'text-subtle',
  key: 'text-accent-300',
  string: 'text-success-400',
  number: 'text-orchestrator',
  boolean: 'text-brand-300',
  null: 'text-danger-400',
};
