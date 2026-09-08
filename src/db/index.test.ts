// Le proxy `db` doit pointer sur la bonne base selon le mode de la requête, et
// `dbLocale` ne jamais bouger — c'est lui qui porte l'authentification.
import { beforeAll, describe, expect, it, vi } from 'vitest'

const URL_LOCALE = 'postgresql://u:p@local:5432/dev'
const URL_PROD = 'postgresql://u:p@vps:5432/prod'

const mode = vi.hoisted(() => ({ courant: 'dev' as 'dev' | 'prod' }))

vi.mock('#/lib/dbmode.server.ts', () => ({
  modeBaseCourant: () => mode.courant,
  urlProd: () => URL_PROD,
}))

let db: typeof import('./index.ts').db
let dbLocale: typeof import('./index.ts').dbLocale

beforeAll(async () => {
  process.env.DATABASE_URL = URL_LOCALE
  ;({ db, dbLocale } = await import('./index.ts'))
})

// aucune connexion n'est ouverte : on lit l'URL du pool
const urlDe = (d: unknown) =>
  (d as { $client: { options: { connectionString: string } } }).$client.options
    .connectionString

describe('db (proxy)', () => {
  it('suit la base locale en mode dev', () => {
    mode.courant = 'dev'
    expect(urlDe(db)).toBe(URL_LOCALE)
  })
  it('suit la base de prod en mode prod', () => {
    mode.courant = 'prod'
    expect(urlDe(db)).toBe(URL_PROD)
  })
  it('laisse dbLocale sur la base locale quel que soit le mode', () => {
    mode.courant = 'prod'
    expect(urlDe(dbLocale)).toBe(URL_LOCALE)
  })
})
