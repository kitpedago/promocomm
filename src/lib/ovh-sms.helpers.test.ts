import { describe, expect, it } from 'vitest'

import {
  lienTicket,
  normPortee,
  normReceiver,
  parseDestinataires,
  ticketDeclencheSms,
} from './ovh-sms.helpers.ts'
import { decryptSecret, encryptSecret, isSecretParam } from './secrets.server.ts'

describe('lienTicket', () => {
  it('préfère la valeur configurée, puis le repli, sinon aucun lien', () => {
    expect(lienTicket('https://a.b/', 'http://c', 7)).toBe('https://a.b/tickets?ticket=7')
    expect(lienTicket('', 'http://c/', 7)).toBe('http://c/tickets?ticket=7')
    expect(lienTicket('', undefined, 7)).toBe('')
  })
})

describe('normReceiver', () => {
  it('normalise les formats FR courants en +33…', () => {
    expect(normReceiver('06 12 34 56 78')).toBe('+33612345678')
    expect(normReceiver('0612345678')).toBe('+33612345678')
    expect(normReceiver('+33 6 12 34 56 78')).toBe('+33612345678')
    expect(normReceiver('0033612345678')).toBe('+33612345678')
    expect(normReceiver('33612345678')).toBe('+33612345678')
  })
  it('ignore les numéros non FR ou invalides', () => {
    expect(normReceiver('')).toBe('')
    expect(normReceiver('12345')).toBe('')
    expect(normReceiver('+1 555 123 4567')).toBe('')
    expect(normReceiver('0012345678')).toBe('') // 0 après le 0 initial
  })
})

describe('parseDestinataires', () => {
  it('découpe lignes/virgules/points-virgules et déduplique', () => {
    expect(
      parseDestinataires('06 12 34 56 78\n0612345678; 07 00 00 00 01,invalide'),
    ).toEqual(['+33612345678', '+33700000001'])
    expect(parseDestinataires(null)).toEqual([])
  })
})

describe('ticketDeclencheSms', () => {
  it('« tous » : tous les bugs, pas les features', () => {
    expect(ticketDeclencheSms('tous', 'bug', 'confort')).toBe(true)
    expect(ticketDeclencheSms('tous', 'feature', 'mineure')).toBe(false)
  })
  it('« grave » : bugs bloquants/majeurs seulement', () => {
    expect(ticketDeclencheSms('grave', 'bug', 'bloquante')).toBe(true)
    expect(ticketDeclencheSms('grave', 'bug', 'majeure')).toBe(true)
    expect(ticketDeclencheSms('grave', 'bug', 'mineure')).toBe(false)
    expect(ticketDeclencheSms('grave', 'feature', 'mineure')).toBe(false)
  })
  it('« bugfeature » : tout ticket', () => {
    expect(ticketDeclencheSms('bugfeature', 'bug', 'confort')).toBe(true)
    expect(ticketDeclencheSms('bugfeature', 'feature', 'mineure')).toBe(true)
  })
  it('normPortee replie les valeurs inconnues sur « tous »', () => {
    expect(normPortee('grave')).toBe('grave')
    expect(normPortee('nimporte')).toBe('tous')
    expect(normPortee(null)).toBe('tous')
  })
})

describe('secrets.server', () => {
  it('chiffre/déchiffre en aller-retour (clé BETTER_AUTH_SECRET de test)', () => {
    process.env.APP_SECRETS_KEY = 'clef-de-test'
    const enc = encryptSecret('mon-secret-ovh')
    expect(enc.startsWith('enc:v1:')).toBe(true)
    expect(decryptSecret(enc)).toBe('mon-secret-ovh')
    // idempotent : une valeur déjà chiffrée n'est pas re-chiffrée
    expect(encryptSecret(enc)).toBe(enc)
    // rétro-compat : une valeur en clair est lue telle quelle
    expect(decryptSecret('en-clair')).toBe('en-clair')
    delete process.env.APP_SECRETS_KEY
  })
  it('isSecretParam cible secrets et clés consommateur', () => {
    expect(isSecretParam('OVH_SMS_ApplicationSecret')).toBe(true)
    expect(isSecretParam('OVH_SMS_ConsumerKey')).toBe(true)
    expect(isSecretParam('OVH_SMS_ApplicationKey')).toBe(false)
    expect(isSecretParam('OVH_SMS_Destinataires')).toBe(false)
  })
})
