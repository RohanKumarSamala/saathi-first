import { importPKCS8, SignJWT } from 'jose'
import type { Env } from './env.ts'

/**
 * A small Firestore REST client for the server. It signs in as the Firebase service
 * account, so it is not limited by firestore.rules: that is what lets it record Razorpay
 * payments, which browsers are never allowed to write.
 */

type Value =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { mapValue: { fields?: Record<string, Value> } }

type Plain = string | number | boolean | null | { [key: string]: Plain }
export type Fields = Record<string, Plain>

let cachedToken: { value: string; expires: number } | null = null

async function accessToken(env: Env) {
  if (env.FIRESTORE_EMULATOR_HOST) return 'owner'
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value
  const key = await importPKCS8(env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), 'RS256')
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/datastore' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(env.FIREBASE_CLIENT_EMAIL)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!response.ok) throw new Error(`Google token request failed: ${response.status} ${await response.text()}`)
  const body = (await response.json()) as { access_token: string; expires_in: number }
  cachedToken = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 }
  return cachedToken.value
}

const root = (env: Env) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`
const endpoint = (env: Env) =>
  env.FIRESTORE_EMULATOR_HOST
    ? `http://${env.FIRESTORE_EMULATOR_HOST}/v1/${root(env)}`
    : `https://firestore.googleapis.com/v1/${root(env)}`

async function call(env: Env, url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${await accessToken(env)}`, 'content-type': 'application/json' },
  })
  return response
}

function encode(value: Plain): Value {
  if (value === null) return { nullValue: null }
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } }
  }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (!Number.isSafeInteger(value)) throw new Error(`Only whole numbers are stored: ${value}`)
  return { integerValue: String(value) }
}

function decode(value: Value): unknown {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return value.timestampValue
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {})
  return null
}

const decodeFields = (fields: Record<string, Value>) =>
  Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decode(value)]))

/** Reads one document, e.g. getDocument(env, 'staff/abc'). Null when it does not exist. */
export async function getDocument(env: Env, path: string): Promise<Record<string, unknown> | null> {
  const response = await call(env, `${endpoint(env)}/${path}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Firestore read failed: ${response.status} ${await response.text()}`)
  const body = (await response.json()) as { fields?: Record<string, Value> }
  return decodeFields(body.fields ?? {})
}

/**
 * Adds up a number field across a collection's documents where `field == value`, done by
 * Firestore itself (an aggregation query), so it stays one request however many there are.
 */
export async function sumWhere(env: Env, collectionId: string, field: string, value: string, sumField: string) {
  const response = await call(env, `${endpoint(env)}:runAggregationQuery`, {
    method: 'POST',
    body: JSON.stringify({
      structuredAggregationQuery: {
        structuredQuery: {
          from: [{ collectionId }],
          where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } },
        },
        aggregations: [{ alias: 'total', sum: { field: { fieldPath: sumField } } }],
      },
    }),
  })
  if (!response.ok) throw new Error(`Firestore sum failed: ${response.status} ${await response.text()}`)
  const rows = (await response.json()) as { result?: { aggregateFields?: { total?: Value } } }[]
  const total = rows.find((row) => row.result)?.result?.aggregateFields?.total
  const sum = total ? Number(decode(total) ?? 0) : 0
  // The sum of whole paise is always whole; anything else means bad data, so stop.
  if (!Number.isSafeInteger(sum)) throw new Error(`${collectionId}.${sumField} does not add up to whole paise: ${sum}`)
  return sum
}

type Write = { path: string; fields: Fields; stamp?: string[]; mustNotExist?: boolean; merge?: boolean }

/**
 * Saves several documents in one all-or-nothing commit. `stamp` fields get the server's
 * time; `mustNotExist` makes the commit fail if the document is already there (returns false).
 */
export async function commit(env: Env, writes: Write[]) {
  const response = await call(env, `${endpoint(env)}:commit`, {
    method: 'POST',
    body: JSON.stringify({
      writes: writes.map((write) => ({
        update: {
          name: `${root(env)}/${write.path}`,
          fields: Object.fromEntries(Object.entries(write.fields).map(([key, value]) => [key, encode(value)])),
        },
        ...(write.merge ? { updateMask: { fieldPaths: Object.keys(write.fields) } } : {}),
        ...(write.mustNotExist ? { currentDocument: { exists: false } } : {}),
        ...(write.stamp?.length
          ? { updateTransforms: write.stamp.map((fieldPath) => ({ fieldPath, setToServerValue: 'REQUEST_TIME' })) }
          : {}),
      })),
    }),
  })
  if (response.ok) return true
  const text = await response.text()
  // ALREADY_EXISTS / FAILED_PRECONDITION: a mustNotExist document was already written.
  if (response.status === 409 || /ALREADY_EXISTS|FAILED_PRECONDITION/.test(text)) return false
  throw new Error(`Firestore write failed: ${response.status} ${text}`)
}
