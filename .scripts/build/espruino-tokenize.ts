/**
 * Espruino pretokeniser
 *
 * Adapted from the Pip-Boy.com create-holotape tooling. Copied from the
 * pip-boy.com source into this repo with permission from Cody Tolene, with
 * help from an AI assistant for this adaptation into the current repository.
 *
 * Credit:
 * - Cody Tolene (TypeScript rewrite for Pip-Boy 3000 support on Pip-Boy.com)
 * - AidansLab & eckserah (original JavaScript for the Pip-Boy 3000 Mk V)
 *   https://github.com/AidansLab/Pip-Boy-CFW-Builder/blob/main/untokenize.js
 *
 * LICENSE:
 * Pip-Boy.com tooling is Attribution-NonCommercial 4.0 International
 * (CC BY-NC 4.0).
 */

const LEX_OPERATOR_START = 138;
const LEX_NULLISH = 0xd0;
const LEX_RAW_STRING8 = 0xd1;
const LEX_RAW_STRING16 = 0xd2;
const LEX_RAW_INT0 = 0xd3;
const LEX_RAW_INT8 = 0xd4;
const LEX_RAW_INT16 = 0xd5;
const TOKEN_BY_TEXT = new Map<string, number>();
const TOKENS: readonly string[] = [
  '==',
  '===',
  '!=',
  '!==',
  '<=',
  '<<',
  '<<=',
  '>=',
  '>>',
  '>>>',
  '>>=',
  '>>>=',
  '+=',
  '-=',
  '++',
  '--',
  '*=',
  '/=',
  '%=',
  '&=',
  '&&',
  '|=',
  '||',
  '^=',
  '=>',
  'if',
  'else',
  'do',
  'while',
  'for',
  'break',
  'continue',
  'function',
  'return',
  'var',
  'let',
  'const',
  'this',
  'throw',
  'try',
  'catch',
  'finally',
  'true',
  'false',
  'null',
  'undefined',
  'new',
  'in',
  'instanceof',
  'switch',
  'case',
  'default',
  'delete',
  'typeof',
  'void',
  'debugger',
  'class',
  'extends',
  'super',
  'static',
  'of',
];

for (let index = 0; index < TOKENS.length; index += 1) {
  TOKEN_BY_TEXT.set(TOKENS[index], LEX_OPERATOR_START + index);
}
TOKEN_BY_TEXT.set('??', LEX_NULLISH);

const OPERATOR_TOKENS = [...TOKEN_BY_TEXT.keys()]
  .filter((token) => !/^[A-Za-z_$]/.test(token))
  .sort((left, right) => right.length - left.length);

const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[A-Za-z0-9_$]/;

function isIdentifierStart(ch: string): boolean {
  return IDENTIFIER_START.test(ch);
}

function isIdentifierPart(ch: string): boolean {
  return IDENTIFIER_PART.test(ch);
}

function isWhitespace(ch: string): boolean {
  return /\s/.test(ch);
}

function isDecimalDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isHexDigit(ch: string): boolean {
  return /^[0-9a-fA-F]$/.test(ch);
}

function isOctalDigit(ch: string): boolean {
  return ch >= '0' && ch <= '7';
}

function toByte(value: number): number {
  return ((value % 256) + 256) % 256;
}

function lowByte(value: number): number {
  return toByte(value);
}

function highByte(value: number): number {
  return toByte(Math.floor(value / 256));
}

type LexTokenKind =
  | 'identifier'
  | 'reserved'
  | 'integer'
  | 'float'
  | 'string'
  | 'template'
  | 'regex'
  | 'operator'
  | 'symbol';

interface LexToken {
  end: number;
  integerValue?: number;
  kind: LexTokenKind;
  rawStringBytes?: number[];
  text: string;
  tokenByte?: number;
}

function readStringLiteral(
  source: string,
  index: number,
): {
  bytes: number[];
  end: number;
  rawEncodable: boolean;
} | null {
  const delimiter = source[index];
  if (delimiter !== '"' && delimiter !== "'" && delimiter !== '`') {
    return null;
  }

  const bytes: number[] = [];
  let rawEncodable = true;
  for (let i = index + 1; i < source.length; i += 1) {
    const ch = source[i];

    if (ch === delimiter) {
      return { bytes, end: i + 1, rawEncodable };
    }

    if (delimiter !== '`' && (ch === '\n' || ch === '\r')) {
      return null;
    }

    if (ch !== '\\') {
      const code = ch.charCodeAt(0);
      if (code > 0xff) {
        rawEncodable = false;
      } else {
        bytes.push(code);
      }
      continue;
    }

    i += 1;
    const escaped = source[i];
    if (escaped === undefined) {
      return null;
    }

    switch (escaped) {
      case 'b':
        bytes.push(0x08);
        break;
      case 'f':
        bytes.push(0x0c);
        break;
      case 'n':
        bytes.push(0x0a);
        break;
      case 'r':
        bytes.push(0x0d);
        break;
      case 't':
        bytes.push(0x09);
        break;
      case 'v':
        bytes.push(0x0b);
        break;
      case 'x': {
        const hex = source.slice(i + 1, i + 3);
        if (hex.length !== 2 || ![...hex].every(isHexDigit)) {
          return null;
        }
        bytes.push(toByte(Number.parseInt(hex, 16)));
        i += 2;
        break;
      }
      case 'u': {
        const hex = source.slice(i + 1, i + 5);
        if (hex.length !== 4 || ![...hex].every(isHexDigit)) {
          return null;
        }
        const code = Number.parseInt(hex, 16);
        if (code > 0xff) {
          rawEncodable = false;
        } else {
          bytes.push(code);
        }
        i += 4;
        break;
      }
      default:
        if (isOctalDigit(escaped)) {
          let octal = escaped;
          for (let j = 0; j < 2 && isOctalDigit(source[i + 1] ?? ''); j += 1) {
            i += 1;
            octal += source[i];
          }
          bytes.push(toByte(Number.parseInt(octal, 8)));
        } else {
          bytes.push(toByte(escaped.charCodeAt(0)));
        }
        break;
    }
  }

  return null;
}

function readTemplateLiteral(
  source: string,
  index: number,
): {
  end: number;
  hasInterpolation: boolean;
  text: string;
} | null {
  if (source[index] !== '`') {
    return null;
  }

  let hasInterpolation = false;
  let nesting = 0;
  let lastCh = '`';
  for (let i = index + 1; i < source.length; i += 1) {
    const ch = source[i];

    if (nesting === 0 && ch === '\\') {
      i += 1;
      lastCh = source[i] ?? '';
      continue;
    }

    if (ch === '{' && (lastCh === '$' || nesting > 0)) {
      nesting += 1;
      hasInterpolation ||= lastCh === '$';
    } else if (ch === '}' && nesting > 0) {
      nesting -= 1;
    } else if (ch === '`' && nesting === 0) {
      return {
        end: i + 1,
        hasInterpolation,
        text: source.slice(index, i + 1),
      };
    }

    lastCh = ch;
  }

  return null;
}

function readNumberLiteral(source: string, index: number): LexToken | null {
  if (
    !isDecimalDigit(source[index] ?? '') &&
    !(source[index] === '.' && isDecimalDigit(source[index + 1] ?? ''))
  ) {
    return null;
  }

  let end = index;
  let normalized = '';
  let canBeFloating = true;
  let kind: LexTokenKind = 'integer';

  if (source[end] === '.') {
    kind = 'float';
    normalized += '.';
    end += 1;
  } else {
    if (source[end] === '0') {
      normalized += source[end];
      end += 1;
      if (['x', 'X', 'b', 'B', 'o', 'O'].includes(source[end] ?? '')) {
        canBeFloating = false;
        normalized += source[end];
        end += 1;
      }
    }

    while (
      isDecimalDigit(source[end] ?? '') ||
      (!canBeFloating && isHexDigit(source[end] ?? '')) ||
      source[end] === '_'
    ) {
      if (source[end] !== '_') {
        normalized += source[end];
      }
      end += 1;
    }

    if (canBeFloating && source[end] === '.') {
      kind = 'float';
      normalized += '.';
      end += 1;
    }
  }

  if (kind === 'float') {
    while (isDecimalDigit(source[end] ?? '') || source[end] === '_') {
      if (source[end] !== '_') {
        normalized += source[end];
      }
      end += 1;
    }
  }

  if (canBeFloating && ['e', 'E'].includes(source[end] ?? '')) {
    kind = 'float';
    normalized += source[end];
    end += 1;
    if (source[end] === '-' || source[end] === '+') {
      normalized += source[end];
      end += 1;
    }
    while (isDecimalDigit(source[end] ?? '') || source[end] === '_') {
      if (source[end] !== '_') {
        normalized += source[end];
      }
      end += 1;
    }
  }

  const value = kind === 'integer' ? Number(normalized) : Number.NaN;
  return {
    end,
    integerValue: Number.isSafeInteger(value) ? value : undefined,
    kind,
    text: source.slice(index, end),
  };
}

function canStartRegex(previous: LexToken | null): boolean {
  if (previous === null) {
    return true;
  }

  if (previous.tokenByte !== undefined) {
    return !['true', 'false', 'null', 'undefined'].includes(previous.text);
  }

  return (
    previous.kind === 'symbol' && '!%&*+-/<=>?[{}(,;:'.includes(previous.text)
  );
}

function readRegexLiteral(source: string, index: number): LexToken {
  let end = index + 1;
  while (end < source.length && source[end] !== '/' && source[end] !== '\n') {
    if (source[end] === '\\' && end + 1 < source.length) {
      end += 2;
    } else {
      end += 1;
    }
  }

  if (source[end] === '/') {
    end += 1;
    while (['g', 'i', 'm', 'y', 'u'].includes(source[end] ?? '')) {
      end += 1;
    }
  }

  return { end, kind: 'regex', text: source.slice(index, end) };
}

function skipWhitespaceAndComments(source: string, start: number): number {
  let index = start;
  while (index < source.length) {
    if (isWhitespace(source[index])) {
      index += 1;
      continue;
    }

    if (source[index] === '/' && source[index + 1] === '/') {
      index += 2;
      while (
        index < source.length &&
        source[index] !== '\n' &&
        source[index] !== '\r'
      ) {
        index += 1;
      }
      continue;
    }

    if (source[index] === '/' && source[index + 1] === '*') {
      index += 2;
      while (
        index + 1 < source.length &&
        !(source[index] === '*' && source[index + 1] === '/')
      ) {
        index += 1;
      }
      index = Math.min(index + 2, source.length);
      continue;
    }

    break;
  }
  return index;
}

function readLexToken(
  source: string,
  index: number,
  previous: LexToken | null,
): LexToken {
  const ch = source[index];

  if (ch === '"' || ch === "'") {
    const literal = readStringLiteral(source, index);
    if (literal) {
      return {
        end: literal.end,
        kind: 'string',
        rawStringBytes: literal.rawEncodable ? literal.bytes : undefined,
        text: source.slice(index, literal.end),
      };
    }
  }

  if (ch === '`') {
    const template = readTemplateLiteral(source, index);
    if (template) {
      if (!template.hasInterpolation) {
        const literal = readStringLiteral(source, index);
        if (literal) {
          return {
            end: literal.end,
            kind: 'string',
            rawStringBytes: literal.rawEncodable ? literal.bytes : undefined,
            text: template.text,
          };
        }
      }
      return { end: template.end, kind: 'template', text: template.text };
    }
  }

  if (ch === '/' && canStartRegex(previous)) {
    return readRegexLiteral(source, index);
  }

  const number = readNumberLiteral(source, index);
  if (number) {
    return number;
  }

  if (isIdentifierStart(ch)) {
    let end = index + 1;
    while (end < source.length && isIdentifierPart(source[end])) {
      end += 1;
    }
    const text = source.slice(index, end);
    const tokenByte = TOKEN_BY_TEXT.get(text);
    return {
      end,
      kind: tokenByte === undefined ? 'identifier' : 'reserved',
      text,
      tokenByte,
    };
  }

  const operator = OPERATOR_TOKENS.find((candidate) =>
    source.startsWith(candidate, index),
  );
  if (operator) {
    return {
      end: index + operator.length,
      kind: 'operator',
      text: operator,
      tokenByte: TOKEN_BY_TEXT.get(operator),
    };
  }

  return { end: index + 1, kind: 'symbol', text: ch };
}

function shouldPreserveSpace(
  previous: LexToken | null,
  current: LexToken,
): boolean {
  if (previous === null) {
    return false;
  }

  const wordOrNumber = (token: LexToken): boolean =>
    token.kind === 'identifier' ||
    token.kind === 'integer' ||
    token.kind === 'float';

  if (wordOrNumber(previous) && wordOrNumber(current)) {
    return true;
  }

  return (
    (previous.text === '-' && current.text === '-') ||
    (previous.text === '+' && current.text === '+') ||
    (previous.text === '/' && current.kind === 'regex') ||
    (previous.kind === 'regex' &&
      (current.text === '/' || current.kind === 'identifier'))
  );
}

function appendSourceText(output: number[], text: string): void {
  for (const ch of text) {
    const codePoint = ch.codePointAt(0) ?? 0;
    if (codePoint <= 0xff) {
      output.push(codePoint);
    } else {
      output.push(...new TextEncoder().encode(ch));
    }
  }
}

function pushRawString(output: number[], bytes: readonly number[]): void {
  if (bytes.length <= 0xff) {
    output.push(LEX_RAW_STRING8, bytes.length, ...bytes);
    return;
  }

  output.push(
    LEX_RAW_STRING16,
    lowByte(bytes.length),
    highByte(bytes.length),
    ...bytes,
  );
}

function pushRawInteger(output: number[], value: number): void {
  if (value === 0) {
    output.push(LEX_RAW_INT0);
  } else if (value >= -128 && value <= 127) {
    output.push(LEX_RAW_INT8, toByte(value));
  } else {
    output.push(LEX_RAW_INT16, lowByte(value), highByte(value));
  }
}

function decodeStaticAtob(
  tokens: readonly LexToken[],
  index: number,
): { bytes: number[]; end: number } | null {
  const identifier = tokens[index];
  const openParen = tokens[index + 1];
  const string = tokens[index + 2];
  const closeParen = tokens[index + 3];
  if (
    identifier?.kind !== 'identifier' ||
    identifier.text !== 'atob' ||
    openParen?.kind !== 'symbol' ||
    openParen.text !== '(' ||
    string?.kind !== 'string' ||
    string.rawStringBytes === undefined ||
    string.rawStringBytes.length === 0 ||
    closeParen?.kind !== 'symbol' ||
    closeParen.text !== ')'
  ) {
    return null;
  }

  let encoded = '';
  for (const byte of string.rawStringBytes) {
    encoded += String.fromCharCode(byte);
  }

  try {
    const decoded = atob(encoded);
    const bytes = [...decoded].map((ch) => ch.charCodeAt(0));
    return bytes.length <= 0xffff ? { bytes, end: index + 3 } : null;
  } catch {
    return null;
  }
}

/**
 * Converts JavaScript source into Espruino's pretokenised byte stream:
 * comments and redundant whitespace are dropped, reserved words and operators
 * become single token bytes, and simple strings/integers are stored as raw
 * values. Static `atob("...")` calls are decoded into raw strings so the
 * device does not pay the base64 decode cost at load time.
 */
export function tokenizeEspruino(input: string): Uint8Array {
  const tokens: LexToken[] = [];
  let index = 0;
  let previous: LexToken | null = null;
  while (index < input.length) {
    index = skipWhitespaceAndComments(input, index);
    if (index >= input.length) {
      break;
    }

    const token = readLexToken(input, index, previous);
    tokens.push(token);
    previous = token;
    index = token.end;
  }

  const output: number[] = [];
  previous = null;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (shouldPreserveSpace(previous, token)) {
      output.push(32);
    }

    const decodedAtob = decodeStaticAtob(tokens, i);
    if (decodedAtob) {
      pushRawString(output, decodedAtob.bytes);
      previous = tokens[decodedAtob.end];
      i = decodedAtob.end;
      continue;
    }

    if (token.tokenByte !== undefined) {
      output.push(token.tokenByte);
    } else if (
      token.kind === 'integer' &&
      token.integerValue !== undefined &&
      token.integerValue >= -32768 &&
      token.integerValue < 32768
    ) {
      pushRawInteger(output, token.integerValue);
    } else if (
      token.kind === 'string' &&
      token.rawStringBytes !== undefined &&
      token.rawStringBytes.length > 0 &&
      token.rawStringBytes.length <= 0xffff
    ) {
      pushRawString(output, token.rawStringBytes);
    } else {
      appendSourceText(output, token.text);
    }

    previous = token;
  }

  return new Uint8Array(output);
}
