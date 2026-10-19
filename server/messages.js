// ─────────────────────────────────────────────────────────────
// THE PHRASEBOOK for the rules check.
//
// rules.js decides WHAT to say (which message, with which numbers).
// This file says HOW to say it, in every language the app speaks.
// Because the result carries all four languages, the result screen can
// switch language instantly, without asking the AI again.
//
// Each message is a function: numbers in, sentence out.
// Kreyòl, Spanish and Portuguese: please have a native speaker review.
// ─────────────────────────────────────────────────────────────

const M = {
  court: () => ({
    en: 'Notice mentions court, a filing, or eviction.',
    es: 'El aviso menciona la corte, una demanda o un desalojo.',
    pt: 'O aviso menciona tribunal, um processo ou despejo.',
    ht: 'Avi a pale de tribinal, yon pwosedi jidisyè, oswa degèpisman.',
  }),

  rent_change: ({ current, next, percent }) => ({
    en: `Rent goes from $${current} to $${next} (${percent}%).`,
    es: `El alquiler pasa de $${current} a $${next} (${percent}%).`,
    pt: `O aluguel passa de $${current} para $${next} (${percent}%).`,
    ht: `Lwaye a ap pase de $${current} a $${next} (${percent}%).`,
  }),

  notice_unclear: ({ min }) => ({
    en: `Check you got at least ${min} days' written notice (dates were unclear).`,
    es: `Verifique que recibió al menos ${min} días de aviso por escrito (las fechas no estaban claras).`,
    pt: `Confira se você recebeu pelo menos ${min} dias de aviso por escrito (as datas não estavam claras).`,
    ht: `Verifye ou te resevwa omwen ${min} jou avi alekri (dat yo pa t klè).`,
  }),

  notice_short: ({ days, min }) => ({
    en: `Only ${days} days between the notice and the new rent. Newark requires at least ${min} days' written notice (§ 19:2-3.2).`,
    es: `Solo ${days} días entre el aviso y el nuevo alquiler. Newark exige al menos ${min} días de aviso por escrito (§ 19:2-3.2).`,
    pt: `Apenas ${days} dias entre o aviso e o novo aluguel. Newark exige pelo menos ${min} dias de aviso por escrito (§ 19:2-3.2).`,
    ht: `Se sèlman ${days} jou ki genyen ant avi a ak nouvo lwaye a. Newark mande omwen ${min} jou avi alekri (§ 19:2-3.2).`,
  }),

  notice_ok: ({ days, min }) => ({
    en: `${days} days' notice (Newark requires at least ${min}).`,
    es: `${days} días de aviso (Newark exige al menos ${min}).`,
    pt: `${days} dias de aviso (Newark exige pelo menos ${min}).`,
    ht: `${days} jou avi (Newark mande omwen ${min}).`,
  }),

  registration: () => ({
    en: "Ask for the unit's rent registration. Newark does not allow increases on unregistered units (§ 19:2-3.1).",
    es: 'Pida el registro de alquiler de su unidad. Newark no permite aumentos en unidades no registradas (§ 19:2-3.1).',
    pt: 'Peça o registro de aluguel da sua unidade. Newark não permite aumentos em unidades não registradas (§ 19:2-3.1).',
    ht: 'Mande wè anrejistreman lwaye apatman ou an. Newark pa pèmèt ogmantasyon sou apatman ki pa anrejistre (§ 19:2-3.1).',
  }),

  over_unconscionable_exempt: ({ u }) => ({
    en: `Over ${u}% in one year, which Newark treats as unconscionable for units not under rent control.`,
    es: `Más del ${u}% en un año, lo que Newark considera abusivo para unidades sin control de alquiler.`,
    pt: `Mais de ${u}% em um ano, o que Newark considera abusivo para unidades sem controle de aluguel.`,
    ht: `Plis pase ${u}% nan yon ane. Newark konsidere sa abizif pou apatman ki pa anba kontwòl lwaye.`,
  }),

  over_unconscionable: ({ u, cap }) => ({
    en: `Over ${u}% in one year. That is above Newark's ${cap}% rent control cap and its ${u}% limit for other units.`,
    es: `Más del ${u}% en un año. Supera el tope de control de alquiler de Newark (${cap}%) y su límite del ${u}% para otras unidades.`,
    pt: `Mais de ${u}% em um ano. Isso passa do teto de controle de aluguel de Newark (${cap}%) e do limite de ${u}% para outras unidades.`,
    ht: `Plis pase ${u}% nan yon ane. Sa depase limit kontwòl lwaye Newark la (${cap}%) ak limit ${u}% pou lòt apatman yo.`,
  }),

  cap_rule: ({ cap }) => ({
    en: `Newark rent control caps yearly increases at the CPI change, and never more than ${cap}% (§ 19:2-3.1).`,
    es: `El control de alquiler de Newark limita los aumentos anuales al cambio del IPC, y nunca más del ${cap}% (§ 19:2-3.1).`,
    pt: `O controle de aluguel de Newark limita os aumentos anuais à variação do CPI, e nunca mais de ${cap}% (§ 19:2-3.1).`,
    ht: `Kontwòl lwaye Newark limite ogmantasyon chak ane a chanjman CPI a (endis pri yo), e li pa janm ka depase ${cap}% (§ 19:2-3.1).`,
  }),

  depends: ({ cap, u }) => ({
    en: `Under rent control the limit is ${cap}%. Owner-occupied buildings with 4 or fewer units are exempt, and their limit is ${u}%.`,
    es: `Con control de alquiler el límite es ${cap}%. Los edificios de 4 unidades o menos donde vive el dueño están exentos, y su límite es ${u}%.`,
    pt: `Com controle de aluguel o limite é ${cap}%. Prédios com 4 unidades ou menos onde o dono mora são isentos, e o limite deles é ${u}%.`,
    ht: `Anba kontwòl lwaye, limit la se ${cap}%. Bilding ki gen 4 apatman oswa mwens kote mèt kay la rete pa anba kontwòl lwaye, e limit yo se ${u}%.`,
  }),

  exempt_ok: ({ u }) => ({
    en: `Owner-occupied buildings with 4 or fewer units are not under rent control. The increase is under the ${u}% limit.`,
    es: `Los edificios de 4 unidades o menos donde vive el dueño no tienen control de alquiler. El aumento está por debajo del límite del ${u}%.`,
    pt: `Prédios com 4 unidades ou menos onde o dono mora não têm controle de aluguel. O aumento está abaixo do limite de ${u}%.`,
    ht: `Bilding ki gen 4 apatman oswa mwens kote mèt kay la rete pa anba kontwòl lwaye. Ogmantasyon an anba limit ${u}% la.`,
  }),

  under_cap: ({ cap }) => ({
    en: `Under ${cap}%. If your unit is under rent control, the limit can be lower (the CPI change), so ask how it was calculated.`,
    es: `Menos del ${cap}%. Si su unidad tiene control de alquiler, el límite puede ser más bajo (el cambio del IPC), así que pregunte cómo se calculó.`,
    pt: `Abaixo de ${cap}%. Se sua unidade tem controle de aluguel, o limite pode ser menor (a variação do CPI), então pergunte como foi calculado.`,
    ht: `Anba ${cap}%. Si apatman ou an anba kontwòl lwaye, limit la ka pi ba (chanjman CPI a), kidonk mande kijan yo te kalkile l.`,
  }),
};

/** msg('notice_ok', { days: 31, min: 30 }) -> { en: '31 days...', es: ..., pt: ..., ht: ... } */
export function msg(key, vars = {}) {
  const make = M[key];
  if (!make) throw new Error(`No message called "${key}"`);
  return make(vars);
}

export const MESSAGE_KEYS = Object.keys(M);
