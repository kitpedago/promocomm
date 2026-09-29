import { describe, expect, it } from 'vitest'

import {
  etiquetteTicket,
  lienTicket,
  parseAdresses,
  prochaineRelance,
  texteRelance,
} from './alerte-mail.helpers.ts'
import { decryptSecret, encryptSecret, isSecretParam } from './secrets.server.ts'

describe('lienTicket', () => {
  it('préfère la valeur configurée, puis le repli, sinon aucun lien', () => {
    expect(lienTicket('https://a.b/', 'http://c', 7)).toBe('https://a.b/tickets?ticket=7')
    expect(lienTicket('', 'http://c/', 7)).toBe('http://c/tickets?ticket=7')
    expect(lienTicket('', undefined, 7)).toBe('')
  })
})

describe('parseAdresses', () => {
  it('découpe lignes/virgules/points-virgules, déduplique, ignore les invalides', () => {
    expect(
      parseAdresses('Dev@Exemple.fr\ndev@exemple.fr; autre@exemple.fr,invalide, a@b'),
    ).toEqual(['dev@exemple.fr', 'autre@exemple.fr'])
    expect(parseAdresses(null)).toEqual([])
  })
})

describe('etiquetteTicket', () => {
  it('gravité pour les bugs seulement', () => {
    expect(etiquetteTicket({ id: 3, type: 'bug', gravite: 'majeure' })).toBe(
      'Bug [majeure] #3',
    )
    expect(etiquetteTicket({ id: 4, type: 'feature', gravite: 'mineure' })).toBe(
      'Feature #4',
    )
  })
})

describe('texteRelance', () => {
  it('un bloc par ticket, libellé du statut, lien si disponible', () => {
    const t = {
      id: 3,
      type: 'bug',
      gravite: 'majeure',
      titre: 'Total faux',
      statut: 'en_cours',
      creeParNom: 'Compta',
      creeLe: '28/09/2026',
    }
    expect(texteRelance([t], (id) => `http://c/tickets?ticket=${id}`)).toBe(
      'Bug [majeure] #3 — En cours — Total faux\n' +
        '  déposé le 28/09/2026 par Compta\n' +
        '  http://c/tickets?ticket=3',
    )
    expect(texteRelance([t, { ...t, id: 4 }], () => '').split('\n\n')).toHaveLength(2)
  })
})

describe('prochaineRelance', () => {
  it('8 h le jour même avant 8 h, le lendemain sinon', () => {
    expect(prochaineRelance(new Date(2026, 8, 29, 7, 0))).toEqual(
      new Date(2026, 8, 29, 8, 0),
    )
    expect(prochaineRelance(new Date(2026, 8, 29, 14, 0))).toEqual(
      new Date(2026, 8, 30, 8, 0),
    )
  })
  it('un timer déclenché un peu tôt ou à l’heure ne se réarme pas le même jour', () => {
    const demain = new Date(2026, 8, 30, 8, 0)
    expect(prochaineRelance(new Date(2026, 8, 29, 7, 59, 59, 990))).toEqual(demain)
    expect(prochaineRelance(new Date(2026, 8, 29, 8, 0))).toEqual(demain)
  })
})

describe('secrets.server', () => {
  it('chiffre/déchiffre en aller-retour (clé BETTER_AUTH_SECRET de test)', () => {
    process.env.APP_SECRETS_KEY = 'clef-de-test'
    const enc = encryptSecret('mon-secret-smtp')
    expect(enc.startsWith('enc:v1:')).toBe(true)
    expect(decryptSecret(enc)).toBe('mon-secret-smtp')
    // idempotent : une valeur déjà chiffrée n'est pas re-chiffrée
    expect(encryptSecret(enc)).toBe(enc)
    // rétro-compat : une valeur en clair est lue telle quelle
    expect(decryptSecret('en-clair')).toBe('en-clair')
    delete process.env.APP_SECRETS_KEY
  })
  it('isSecretParam cible le mot de passe SMTP, pas le reste', () => {
    expect(isSecretParam('SMTP_MotDePasse')).toBe(true)
    expect(isSecretParam('SMTP_Login')).toBe(false)
    expect(isSecretParam('Mail_Destinataires')).toBe(false)
  })
})
