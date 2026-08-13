// Suivi des tickets / features (mini-Mantis repris du SaaS isfectuteurs) +
// page « Nouveautés » — cf. docs/superpowers/specs/2026-08-13-tickets-nouveautes-design.md.
//
// Tout service connecté (Consultation compris — le signalement est du feedback,
// pas une écriture métier, écart assumé avec requireEcriture) : liste, fiche,
// création avec captures, commentaires. Service ADMINISTRATEUR (= le dev) :
// qualification (statut, doublon « même que #X », avancement, livraison,
// titre/description, réattribution du déposeur), archivage, masquage
// Nouveautés, édition/suppression d'échanges, suppression définitive.
import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, ilike, isNotNull, isNull, notInArray, or, sql } from 'drizzle-orm'

import { db } from '#/db/index.ts'
import {
  ticket,
  ticketCapture,
  ticketCommentaire,
  ticketLecture,
} from '#/db/schema.ts'
import { requireSession } from '#/lib/session.server.ts'
import { SERVICES, getService, serviceEmail } from '#/lib/services'
import {
  TICKET_GRAVITES,
  TICKET_STATUTS,
  TICKET_STATUTS_CLOS,
  TICKET_TYPES,
} from '#/lib/tickets.defs.ts'
import { CAPTURES_MAX, decodeCapture } from '#/lib/tickets.helpers.ts'

import type {
  FeatureLivree,
  TicketCaptureMeta,
  TicketCommentaire,
  TicketDetail,
  TicketGravite,
  TicketListItem,
  TicketStatut,
  TicketType,
} from '#/lib/tickets.defs.ts'
import type { CapturePayload } from '#/lib/tickets.helpers.ts'

/** Courriel du compte du service Administrateur (= le dev) — chip « Dev » du fil. */
const ADMIN_EMAIL = serviceEmail('admin')

/* ── Identité de l'appelant (dénormalisée dans les lignes) ── */

/** Courriel du compte service (minuscule) + libellé du service + rôle admin. */
async function identite(): Promise<{
  email: string
  nom: string
  estAdmin: boolean
}> {
  const session = await requireSession()
  const email = session.user.email.toLowerCase()
  const nom =
    getService(session.user.service)?.label ?? email.split('@')[0]
  return { email, nom, estAdmin: session.user.service === 'admin' }
}

async function requireAdmin() {
  const session = await requireSession()
  if (session.user.service !== 'admin')
    throw new Error('Réservé au service Administrateur')
  return session
}

/**
 * Marque un ticket LU par `email` (badge « non lus ») : à l'ouverture de la
 * fiche ET après chaque écriture de l'auteur — sinon sa propre action (qui
 * bump maj_le) repasserait le ticket en non-lu chez lui.
 */
async function marquerLu(ticketId: number, courriel: string): Promise<void> {
  await db
    .insert(ticketLecture)
    .values({ ticketId, courriel })
    .onConflictDoUpdate({
      target: [ticketLecture.ticketId, ticketLecture.courriel],
      set: { luLe: new Date() },
    })
}

/* ── Lecture ── */

/** Colonnes communes liste/fiche (dates formatées côté SQL, compteurs corrélés). */
const champsListe = (email: string) => ({
  id: ticket.id,
  type: sql<TicketType>`${ticket.type}`,
  gravite: sql<TicketGravite>`${ticket.gravite}`,
  titre: ticket.titre,
  pageConcernee: ticket.pageConcernee,
  statut: sql<TicketStatut>`${ticket.statut}`,
  ticketDoublonId: ticket.ticketDoublonId,
  avancement: ticket.avancement,
  dateLivraison: ticket.dateLivraison,
  creeParNom: ticket.creeParNom,
  creeLe: sql<string>`to_char(${ticket.creeLe}, 'YYYY-MM-DD HH24:MI')`,
  nbCommentaires: sql<number>`(select count(*)::int from ${ticketCommentaire} where ${ticketCommentaire.ticketId} = ${ticket.id})`,
  nbCaptures: sql<number>`(select count(*)::int from ${ticketCapture} where ${ticketCapture.ticketId} = ${ticket.id})`,
  archive: sql<boolean>`(${ticket.archiveLe} is not null)`,
  attenteMaReponse: sql<boolean>`(${ticket.attenteReponse} and ${ticket.creeParEmail} = ${email})`,
  masqueNouveautes: ticket.masqueNouveautes,
  livreParIa: ticket.livreParIa,
})

export const listTicketsFn = createServerFn({ method: 'GET' })
  .validator(
    (d: { statut?: string; type?: string; gravite?: string; search?: string }) => ({
      statut: d.statut ?? '',
      type: d.type ?? '',
      gravite: d.gravite ?? '',
      search: (d.search ?? '').trim(),
    }),
  )
  .handler(async ({ data }): Promise<Array<TicketListItem>> => {
    const { email, estAdmin } = await identite()
    const conditions = [
      // Archivés : masqués partout sauf via la pseudo-valeur « archives »
      data.statut === 'archives'
        ? isNotNull(ticket.archiveLe)
        : isNull(ticket.archiveLe),
    ]
    // « Ouverts » = non clos, MAIS on remonte aussi les tickets clos où
    // l'appelant (déposeur) doit une réponse — sinon ils gonflent le badge
    // « réponse attendue » du menu sans jamais apparaître dans la vue par défaut
    if (data.statut === 'ouverts')
      conditions.push(
        or(
          notInArray(ticket.statut, TICKET_STATUTS_CLOS),
          and(eq(ticket.attenteReponse, true), eq(ticket.creeParEmail, email)),
        )!,
      )
    else if (data.statut && data.statut in TICKET_STATUTS)
      conditions.push(eq(ticket.statut, data.statut))
    if (data.type && data.type in TICKET_TYPES)
      conditions.push(eq(ticket.type, data.type))
    if (data.gravite && data.gravite in TICKET_GRAVITES) {
      conditions.push(eq(ticket.gravite, data.gravite))
      // La gravité ne s'applique qu'aux bugs (celle des features est neutralisée)
      conditions.push(eq(ticket.type, 'bug'))
    }
    if (data.search)
      conditions.push(
        or(
          ilike(ticket.titre, `%${data.search}%`),
          ilike(ticket.description, `%${data.search}%`),
          ilike(ticket.pageConcernee, `%${data.search}%`),
          ilike(ticket.creeParNom, `%${data.search}%`),
          sql`${ticket.id}::text = ${data.search}`,
        )!,
      )
    const rows = await db
      .select({
        ...champsListe(email),
        // Activité (maj_le) postérieure à la dernière lecture de l'appelant
        nonLu: sql<boolean>`(${ticket.majLe} > coalesce(${ticketLecture.luLe}, '-infinity'::timestamp))`,
      })
      .from(ticket)
      .leftJoin(
        ticketLecture,
        and(eq(ticketLecture.ticketId, ticket.id), eq(ticketLecture.courriel, email)),
      )
      .where(and(...conditions))
      .orderBy(desc(ticket.id))
      .limit(300)
    // « Livré par l'IA » : réservé à l'Administrateur
    if (!estAdmin) rows.forEach((r) => (r.livreParIa = false))
    return rows
  })

export interface TicketsBadge {
  /** Tickets avec activité non lue — Administrateur (0 pour les autres). */
  nonLus: number
  /** Tickets de L'APPELANT (déposeur) où le dev attend sa réponse. */
  aRepondre: number
}

/** Badge « Tickets » du menu latéral (pollé par la Sidebar). Archivés exclus. */
export const getTicketsBadgeFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TicketsBadge> => {
    const { email, estAdmin } = await identite()
    let nonLus = 0
    if (estAdmin) {
      const [r] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(ticket)
        .leftJoin(
          ticketLecture,
          and(
            eq(ticketLecture.ticketId, ticket.id),
            eq(ticketLecture.courriel, email),
          ),
        )
        .where(
          and(
            isNull(ticket.archiveLe),
            sql`${ticket.majLe} > coalesce(${ticketLecture.luLe}, '-infinity'::timestamp)`,
          ),
        )
      nonLus = r.n
    }
    const [rep] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(ticket)
      .where(
        and(
          isNull(ticket.archiveLe),
          eq(ticket.attenteReponse, true),
          eq(ticket.creeParEmail, email),
        ),
      )
    return { nonLus, aRepondre: rep.n }
  },
)

export const getTicketFn = createServerFn({ method: 'GET' })
  .validator((d: { id: number }) => ({ id: Number(d.id) }))
  .handler(async ({ data }): Promise<TicketDetail | null> => {
    const { email, estAdmin } = await identite()
    const doublon = sql<
      string | null
    >`(select d.titre from ${ticket} d where d.id = ${ticket.ticketDoublonId})`
    const rows = await db
      .select({
        ...champsListe(email),
        nonLu: sql<boolean>`false`,
        description: ticket.description,
        creeParEmail: ticket.creeParEmail,
        attenteReponse: ticket.attenteReponse,
        majLe: sql<string>`to_char(${ticket.majLe}, 'YYYY-MM-DD HH24:MI')`,
        doublonTitre: doublon,
      })
      .from(ticket)
      .where(eq(ticket.id, data.id))
    const t = rows.at(0)
    if (!t) return null
    const [commentaires, captures] = await Promise.all([
      db
        .select({
          id: ticketCommentaire.id,
          auteurNom: ticketCommentaire.auteurNom,
          auteurEmail: ticketCommentaire.auteurEmail,
          texte: ticketCommentaire.texte,
          creeLe: sql<string>`to_char(${ticketCommentaire.creeLe}, 'YYYY-MM-DD HH24:MI')`,
        })
        .from(ticketCommentaire)
        .where(eq(ticketCommentaire.ticketId, data.id))
        .orderBy(ticketCommentaire.id),
      db
        .select({
          id: ticketCapture.id,
          nomFichier: ticketCapture.nomFichier,
          mime: ticketCapture.mime,
          taille: ticketCapture.taille,
          auteurNom: ticketCapture.auteurNom,
          auteurEmail: ticketCapture.auteurEmail,
          description: ticketCapture.description,
          miniature: ticketCapture.miniature,
          commentaireId: ticketCapture.commentaireId,
        })
        .from(ticketCapture)
        .where(eq(ticketCapture.ticketId, data.id))
        .orderBy(ticketCapture.id),
      // Ouvrir la fiche = lire le ticket (badge « non lus »)
      marquerLu(data.id, email),
    ])
    if (!estAdmin) t.livreParIa = false
    return {
      ...t,
      commentaires: commentaires.map(
        (c): TicketCommentaire => ({ ...c, estDev: c.auteurEmail === ADMIN_EMAIL }),
      ),
      captures: captures satisfies Array<TicketCaptureMeta>,
    }
  })

/** Contenu d'une capture, à la demande (jamais dans la liste — blobs lourds). */
export const getTicketCaptureFn = createServerFn({ method: 'GET' })
  .validator((d: { id: number }) => ({ id: Number(d.id) }))
  .handler(
    async ({
      data,
    }): Promise<{ nomFichier: string; description: string; dataUrl: string } | null> => {
      await requireSession()
      const c = (
        await db
          .select({
            nomFichier: ticketCapture.nomFichier,
            description: ticketCapture.description,
            mime: ticketCapture.mime,
            contenu: ticketCapture.contenu,
          })
          .from(ticketCapture)
          .where(eq(ticketCapture.id, data.id))
      ).at(0)
      return c
        ? {
            nomFichier: c.nomFichier,
            description: c.description,
            dataUrl: `data:${c.mime};base64,${Buffer.from(c.contenu).toString('base64')}`,
          }
        : null
    },
  )

/**
 * Page « Nouveautés » : les features livrées (ou fermées après livraison),
 * groupées côté client par date de livraison décroissante.
 */
export const listFeaturesLivreesFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<FeatureLivree>> => {
    await requireSession()
    const dateGroupe = sql<string>`coalesce(${ticket.dateLivraison}, ${ticket.majLe}::date)`
    return db
      .select({
        id: ticket.id,
        titre: ticket.titre,
        description: ticket.description,
        pageConcernee: ticket.pageConcernee,
        dateLivraison: sql<string>`to_char(${dateGroupe}, 'YYYY-MM-DD')`,
      })
      .from(ticket)
      .where(
        and(
          eq(ticket.type, 'feature'),
          sql`${ticket.statut} in ('livre', 'ferme')`,
          eq(ticket.masqueNouveautes, false),
        ),
      )
      .orderBy(desc(dateGroupe), desc(ticket.id))
      .limit(500)
  },
)

/* ── Écriture (tous services connectés) ── */

async function insertCaptures(
  ticketId: number,
  captures: Array<CapturePayload>,
  who: { email: string; nom: string },
  commentaireId: number | null = null,
) {
  for (const c of captures.slice(0, CAPTURES_MAX)) {
    const d = decodeCapture(c)
    await db.insert(ticketCapture).values({
      ticketId,
      commentaireId,
      nomFichier: d.nom,
      mime: d.mime,
      taille: d.taille,
      contenu: Buffer.from(d.b64, 'base64'),
      auteurEmail: who.email,
      auteurNom: who.nom,
      miniature: d.miniature,
    })
  }
}

export const createTicketFn = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      type?: string
      gravite?: string
      titre?: string
      description?: string
      page?: string
      captures?: Array<CapturePayload>
    }) => ({
      type: d.type === 'feature' ? ('feature' as const) : ('bug' as const),
      gravite: (d.gravite && d.gravite in TICKET_GRAVITES
        ? d.gravite
        : 'mineure') as TicketGravite,
      titre: (d.titre ?? '').trim().slice(0, 200),
      description: (d.description ?? '').trim(),
      page: (d.page ?? '').trim().slice(0, 200),
      captures: Array.isArray(d.captures) ? d.captures : [],
    }),
  )
  .handler(async ({ data }): Promise<{ id: number }> => {
    const who = await identite()
    if (!data.titre) throw new Error('Le titre est obligatoire.')
    if (data.captures.length > CAPTURES_MAX)
      throw new Error(`${CAPTURES_MAX} captures maximum.`)
    // Captures validées AVANT l'insertion (pas de fiche orpheline si l'une
    // est illisible/trop lourde) ; gravité neutralisée pour une feature
    data.captures.forEach(decodeCapture)
    const [row] = await db
      .insert(ticket)
      .values({
        type: data.type,
        gravite: data.type === 'feature' ? 'mineure' : data.gravite,
        titre: data.titre,
        description: data.description,
        pageConcernee: data.page,
        creeParEmail: who.email,
        creeParNom: who.nom,
      })
      .returning({ id: ticket.id })
    await insertCaptures(row.id, data.captures, who)
    await marquerLu(row.id, who.email)
    return { id: row.id }
  })

export const addTicketCommentaireFn = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      ticketId?: number
      texte?: string
      demandeReponse?: boolean
      captures?: Array<CapturePayload>
    }) => ({
      ticketId: Number(d.ticketId),
      texte: (d.texte ?? '').trim(),
      demandeReponse: d.demandeReponse === true,
      captures: Array.isArray(d.captures) ? d.captures : [],
    }),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const who = await identite()
    if (!data.texte && !data.captures.length) throw new Error('Commentaire vide.')
    if (data.captures.length > CAPTURES_MAX)
      throw new Error(`${CAPTURES_MAX} captures maximum par réponse.`)
    data.captures.forEach(decodeCapture)
    const [ins] = await db
      .insert(ticketCommentaire)
      .values({
        ticketId: data.ticketId,
        auteurEmail: who.email,
        auteurNom: who.nom,
        texte: data.texte,
      })
      .returning({ id: ticketCommentaire.id })
    await insertCaptures(data.ticketId, data.captures, who, ins.id)
    // « Demande une réponse » : posée par le DEV avec son commentaire (coche),
    // levée dès que le DÉPOSEUR publie — le badge « à répondre » se décompte
    const tk = (
      await db
        .select({ creeParEmail: ticket.creeParEmail })
        .from(ticket)
        .where(eq(ticket.id, data.ticketId))
    ).at(0)
    const set: { majLe: Date; attenteReponse?: boolean } = { majLe: new Date() }
    if (tk?.creeParEmail === who.email) set.attenteReponse = false
    else if (data.demandeReponse && who.estAdmin) set.attenteReponse = true
    await db.update(ticket).set(set).where(eq(ticket.id, data.ticketId))
    await marquerLu(data.ticketId, who.email)
    return { ok: true }
  })

/**
 * Suppression d'un échange du fil (Administrateur) — ses captures jointes
 * suivent (FK CASCADE). Ne touche ni maj_le ni attente_reponse (retirer un
 * message ne doit pas re-signaler le ticket ni fausser la boucle Q/R).
 */
export const deleteTicketCommentaireFn = createServerFn({ method: 'POST' })
  .validator((d: { id?: number }) => ({ id: Number(d.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin()
    const rows = await db
      .delete(ticketCommentaire)
      .where(eq(ticketCommentaire.id, data.id))
      .returning({ id: ticketCommentaire.id })
    if (!rows.length) throw new Error('Échange introuvable.')
    return { ok: true }
  })

/** Modification du texte d'un échange (Administrateur) — mêmes règles. */
export const updateTicketCommentaireFn = createServerFn({ method: 'POST' })
  .validator((d: { id?: number; texte?: string }) => ({
    id: Number(d.id),
    texte: (d.texte ?? '').trim(),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin()
    if (!data.texte)
      throw new Error("Le texte de l'échange ne peut pas être vide.")
    const rows = await db
      .update(ticketCommentaire)
      .set({ texte: data.texte })
      .where(eq(ticketCommentaire.id, data.id))
      .returning({ id: ticketCommentaire.id })
    if (!rows.length) throw new Error('Échange introuvable.')
    return { ok: true }
  })

/** Ajout de captures après coup : déposeur (ticket non clos) ou Administrateur. */
export const addTicketCapturesFn = createServerFn({ method: 'POST' })
  .validator((d: { ticketId?: number; captures?: Array<CapturePayload> }) => ({
    ticketId: Number(d.ticketId),
    captures: Array.isArray(d.captures) ? d.captures : [],
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const who = await identite()
    const t = (
      await db
        .select({
          creeParEmail: ticket.creeParEmail,
          statut: ticket.statut,
          nb: sql<number>`(select count(*)::int from ${ticketCapture}
            where ${ticketCapture.ticketId} = ${ticket.id} and ${ticketCapture.commentaireId} is null)`,
        })
        .from(ticket)
        .where(eq(ticket.id, data.ticketId))
    ).at(0)
    if (!t) throw new Error('Ticket introuvable.')
    if (t.creeParEmail !== who.email) {
      if (!who.estAdmin) throw new Error('Réservé au déposeur du ticket.')
    } else if (TICKET_STATUTS_CLOS.includes(t.statut as TicketStatut)) {
      throw new Error('Ticket clos : captures verrouillées.')
    }
    // Plafond sur les captures DE LA FICHE (celles des réponses ont leur
    // propre plafond par réponse, cf. addTicketCommentaireFn)
    if (t.nb + data.captures.length > CAPTURES_MAX)
      throw new Error(`${CAPTURES_MAX} captures maximum par ticket.`)
    data.captures.forEach(decodeCapture)
    await insertCaptures(data.ticketId, data.captures, who)
    await db
      .update(ticket)
      .set({ majLe: new Date() })
      .where(eq(ticket.id, data.ticketId))
    await marquerLu(data.ticketId, who.email)
    return { ok: true }
  })

/**
 * Renomme une capture (champ description, affiché à la place du nom de
 * fichier) : auteur de la capture ou Administrateur. Vider = revenir au nom de
 * fichier. Pas de bump maj_le (cosmétique).
 */
export const renameTicketCaptureFn = createServerFn({ method: 'POST' })
  .validator((d: { id?: number; description?: string }) => ({
    id: Number(d.id),
    description: (d.description ?? '').trim().slice(0, 200),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const who = await identite()
    const c = (
      await db
        .select({ auteurEmail: ticketCapture.auteurEmail })
        .from(ticketCapture)
        .where(eq(ticketCapture.id, data.id))
    ).at(0)
    if (!c) throw new Error('Capture introuvable.')
    if (c.auteurEmail !== who.email && !who.estAdmin)
      throw new Error('Réservé à l’auteur de la capture.')
    await db
      .update(ticketCapture)
      .set({ description: data.description })
      .where(eq(ticketCapture.id, data.id))
    return { ok: true }
  })

/* ── Qualification (Administrateur = le dev) ── */

export const updateTicketStatutFn = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      id?: number
      statut?: string
      idDoublon?: number | null
      avancement?: number
      dateLivraison?: string | null
      titre?: string
      description?: string
      type?: string
      gravite?: string
      page?: string
      creeParEmail?: string
    }) => ({
      id: Number(d.id),
      statut: (d.statut && d.statut in TICKET_STATUTS
        ? d.statut
        : 'nouveau') as TicketStatut,
      idDoublon: d.idDoublon ? Number(d.idDoublon) : null,
      avancement: Math.max(0, Math.min(100, Number(d.avancement ?? 0))),
      dateLivraison: (d.dateLivraison ?? '').trim() || null,
      // undefined = inchangé ; titre vide ignoré, description vide acceptée
      titre: d.titre === undefined ? undefined : d.titre.trim().slice(0, 200),
      description:
        d.description === undefined ? undefined : d.description.trim(),
      type:
        d.type !== undefined && d.type in TICKET_TYPES
          ? (d.type as TicketType)
          : undefined,
      gravite:
        d.gravite !== undefined && d.gravite in TICKET_GRAVITES
          ? (d.gravite as TicketGravite)
          : undefined,
      page: d.page === undefined ? undefined : d.page.trim().slice(0, 200),
      creeParEmail:
        d.creeParEmail === undefined
          ? undefined
          : d.creeParEmail.trim().toLowerCase(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin()
    const { email } = await identite()
    let idDoublon: number | null = null
    if (data.statut === 'doublon') {
      if (!data.idDoublon || data.idDoublon === data.id)
        throw new Error("Statut « Doublon » : indiquez le n° du ticket d'origine.")
      const dup = await db
        .select({ id: ticket.id })
        .from(ticket)
        .where(eq(ticket.id, data.idDoublon))
      if (!dup.length) throw new Error(`Ticket #${data.idDoublon} introuvable.`)
      idDoublon = data.idDoublon
    }
    const set: Partial<typeof ticket.$inferInsert> = {
      statut: data.statut,
      ticketDoublonId: idDoublon,
      // Livré sans date explicite → aujourd'hui (alimente les Nouveautés)
      dateLivraison:
        data.dateLivraison ??
        (data.statut === 'livre'
          ? new Date().toISOString().slice(0, 10)
          : null),
      avancement:
        data.statut === 'livre' || data.statut === 'ferme'
          ? 100
          : data.avancement,
      majLe: new Date(),
    }
    if (data.titre !== undefined && data.titre !== '') set.titre = data.titre
    if (data.description !== undefined) set.description = data.description
    if (data.type !== undefined) set.type = data.type
    // Gravité : bugs seulement — neutralisée si le ticket est (ou devient) une feature
    if (data.type === 'feature') set.gravite = 'mineure'
    else if (data.gravite !== undefined) {
      const typeEff =
        data.type ??
        (
          await db
            .select({ type: ticket.type })
            .from(ticket)
            .where(eq(ticket.id, data.id))
        )[0]?.type
      if (typeEff === 'bug') set.gravite = data.gravite
    }
    if (data.page !== undefined) set.pageConcernee = data.page
    // Réattribution du déposeur : parmi les comptes services (liste statique)
    if (data.creeParEmail !== undefined && data.creeParEmail !== '') {
      const service = SERVICES.find(
        (s) => serviceEmail(s.slug) === data.creeParEmail,
      )
      set.creeParEmail = data.creeParEmail
      set.creeParNom = service?.label ?? data.creeParEmail.split('@')[0]
    }
    const rows = await db
      .update(ticket)
      .set(set)
      .where(eq(ticket.id, data.id))
      .returning({ id: ticket.id })
    if (!rows.length) throw new Error('Ticket introuvable.')
    await marquerLu(data.id, email)
    return { ok: true }
  })

/** Archive / désarchive (Administrateur) : masqué des listes, réversible. */
export const archiverTicketFn = createServerFn({ method: 'POST' })
  .validator((d: { id?: number; archive?: boolean }) => ({
    id: Number(d.id),
    archive: d.archive === true,
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin()
    const rows = await db
      .update(ticket)
      .set({ archiveLe: data.archive ? new Date() : null })
      .where(eq(ticket.id, data.id))
      .returning({ id: ticket.id })
    if (!rows.length) throw new Error('Ticket introuvable.')
    return { ok: true }
  })

/**
 * « Masquer dans Nouveautés » (Administrateur) : retire/réaffiche une feature
 * du changelog sans toucher son statut (≠ archivage). Sans effet sur /tickets.
 */
export const setTicketMasqueNouveautesFn = createServerFn({ method: 'POST' })
  .validator((d: { id?: number; masque?: boolean }) => ({
    id: Number(d.id),
    masque: d.masque === true,
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin()
    const rows = await db
      .update(ticket)
      .set({ masqueNouveautes: data.masque })
      .where(eq(ticket.id, data.id))
      .returning({ id: ticket.id })
    if (!rows.length) throw new Error('Ticket introuvable.')
    return { ok: true }
  })

/**
 * Suppression DÉFINITIVE (Administrateur) — commentaires/captures/lectures
 * suivent (CASCADE) ; les tickets marqués « même que #X » vers celui-ci sont déliés.
 */
export const deleteTicketFn = createServerFn({ method: 'POST' })
  .validator((d: { id?: number }) => ({ id: Number(d.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin()
    await db
      .update(ticket)
      .set({ ticketDoublonId: null })
      .where(eq(ticket.ticketDoublonId, data.id))
    const rows = await db
      .delete(ticket)
      .where(eq(ticket.id, data.id))
      .returning({ id: ticket.id })
    if (!rows.length) throw new Error('Ticket introuvable.')
    return { ok: true }
  })
