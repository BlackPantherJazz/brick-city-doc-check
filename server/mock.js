import { readFileSync } from 'node:fs';
// ─────────────────────────────────────────────────────────────
// MOCK MODE — used when there is no AI key in .env, when a "sample"
// button is pressed, or as a fallback if the AI call fails on stage.
// These are the three fake notices from the build plan.
// ─────────────────────────────────────────────────────────────

const base = {
  language_of_notice: 'English',
  landlord_or_company: 'Sample Street Holdings LLC',
  unit_address: '45 Example Place, Apt 4B, Newark, NJ 07104',
  deadline_to_respond: null,
  mentions_court_or_filing: false,
  confidence: 'high',
  unreadable_parts: [],
};

// Where each value sits on the sample photos (measured by scripts/make-samples.py).
const BOXES = JSON.parse(readFileSync(new URL('./sample-boxes.json', import.meta.url), 'utf8'));

export const SAMPLES = {
  legal: {
    ...base,
    notice_type: 'rent_increase',
    current_rent: 1500,
    new_rent: 1545,
    notice_date: '2026-10-01',
    effective_date: '2026-12-01',
  },
  illegal: {
    ...base,
    notice_type: 'rent_increase',
    current_rent: 1500,
    new_rent: 1800,
    notice_date: '2026-10-01',
    effective_date: '2026-11-01',
  },
  court: {
    ...base,
    unit_address: '45 Example Place, Apt 2B, Newark, NJ 07104',
    notice_type: 'eviction_or_court',
    current_rent: null,
    new_rent: null,
    notice_date: '2026-10-08',
    effective_date: null,
    deadline_to_respond: '2026-10-22',
    mentions_court_or_filing: true,
  },
  yellow: {
    ...base,
    unit_address: '45 Example Place, Apt 3C, Newark, NJ 07104',
    notice_type: 'rent_increase',
    current_rent: 1600,
    new_rent: 1672,
    notice_date: '2026-10-01',
    effective_date: '2026-12-01',
  },
  short: {
    ...base,
    unit_address: '45 Example Place, Apt 1A, Newark, NJ 07104',
    notice_type: 'rent_increase',
    current_rent: 1400,
    new_rent: 1442,
    notice_date: '2026-10-10',
    effective_date: '2026-10-24',
  },
};
for (const [key, sample] of Object.entries(SAMPLES)) sample.locations = BOXES[key] ?? {};

/** In mock mode, pick a sample from the uploaded file's name (handy for testing). */
export function sampleFromFilename(name = '') {
  const n = name.toLowerCase();
  if (n.includes('court') || n.includes('evict')) return SAMPLES.court;
  if (n.includes('illegal')) return SAMPLES.illegal;
  if (n.includes('yellow')) return SAMPLES.yellow;
  if (n.includes('short')) return SAMPLES.short;
  return SAMPLES.legal;
}

const EXPLAIN = {
  escalate: {
    en: (f) => `This paper may be about court or eviction. Do not ignore it.${f.deadline_to_respond ? ` It may have a deadline: ${f.deadline_to_respond}.` : ''} Call free legal help today and bring this paper with you.`,
    es: (f) => `Este papel puede ser de la corte o de un desalojo. No lo ignore.${f.deadline_to_respond ? ` Puede tener una fecha límite: ${f.deadline_to_respond}.` : ''} Llame hoy a ayuda legal gratis y lleve este papel.`,
    pt: (f) => `Este papel pode ser sobre tribunal ou despejo. Não ignore.${f.deadline_to_respond ? ` Pode ter um prazo: ${f.deadline_to_respond}.` : ''} Ligue hoje para ajuda jurídica gratuita e leve este papel.`,
  },
  over_unconscionable: {
    en: () => 'Your landlord wants to raise your rent by more than 5% in one year. Newark can fine landlords for raises this big. You can send the letter below and ask for free legal help.',
    es: () => 'Su casero quiere subir su renta más de 5% en un año. Newark puede multar a los caseros por aumentos tan grandes. Puede enviar la carta de abajo y pedir ayuda legal gratis.',
    pt: () => 'Seu senhorio quer aumentar o aluguel em mais de 5% em um ano. Newark pode multar senhorios por aumentos tão grandes. Você pode enviar a carta abaixo e pedir ajuda jurídica gratuita.',
  },
  over_cap: {
    en: () => 'Your rent goes up more than 4%. In Newark, rent control limits yearly increases to the CPI change, and never more than 4%. Send the letter below to ask how the increase was calculated.',
    es: () => 'Su renta sube más de 4%. En Newark, el control de renta limita los aumentos anuales al cambio del CPI, y nunca más de 4%. Envíe la carta de abajo para preguntar cómo calcularon el aumento.',
    pt: () => 'Seu aluguel sobe mais de 4%. Em Newark, o controle de aluguel limita os aumentos anuais à variação do CPI, e nunca mais de 4%. Envie a carta abaixo para perguntar como o aumento foi calculado.',
  },
  depends_on_building: {
    en: () => 'Your rent goes up between 4% and 5%. Most Newark rentals are under rent control, with a 4% limit. Buildings with 4 or fewer units where the owner lives are not. Ask your landlord which applies to you.',
    es: () => 'Su renta sube entre 4% y 5%. La mayoría de los alquileres en Newark tienen control de renta, con un límite de 4%. Los edificios de 4 unidades o menos donde vive el dueño no lo tienen. Pregunte a su casero cuál aplica.',
    pt: () => 'Seu aluguel sobe entre 4% e 5%. A maioria dos aluguéis em Newark tem controle de aluguel, com limite de 4%. Prédios com 4 unidades ou menos onde o dono mora não têm. Pergunte ao senhorio qual se aplica.',
  },
  short_notice: {
    en: () => 'The amount looks OK. But the new rent starts very soon after the notice. Ask your landlord to give you the full notice time.',
    es: () => 'La cantidad parece bien. Pero la nueva renta empieza muy pronto después del aviso. Pida a su casero el tiempo de aviso completo.',
    pt: () => 'O valor parece certo. Mas o novo aluguel começa muito cedo depois do aviso. Peça ao senhorio o prazo de aviso completo.',
  },
  within_limits: {
    en: () => 'Your rent goes up a small amount. That looks within the limits. Still, ask your landlord for the unit\'s city registration number.',
    es: () => 'Su renta sube un poco. Eso parece dentro del límite. Aun así, pida a su casero el número de registro de la ciudad.',
    pt: () => 'Seu aluguel sobe um pouco. Isso parece dentro do limite. Mesmo assim, peça ao senhorio o número de registro na prefeitura.',
  },
  not_rent_increase: {
    en: () => 'This notice is not about a rent increase. Read it carefully and check any dates on it.',
    es: () => 'Este aviso no es sobre un aumento de renta. Léalo con cuidado y revise las fechas.',
    pt: () => 'Este aviso não é sobre aumento de aluguel. Leia com cuidado e confira as datas.',
  },
};

// Haitian Creole (Kreyòl ayisyen)
EXPLAIN.escalate.ht = (f) => `Papye sa a ka konsène tribinal oswa degèpisman. Pa inyore l.${f.deadline_to_respond ? ` Li ka gen yon dat limit: ${f.deadline_to_respond}.` : ''} Rele èd legal gratis jodi a epi pote papye sa a avè w.`;
EXPLAIN.over_unconscionable.ht = () => 'Mèt kay ou vle ogmante lwaye w plis pase 5% nan yon ane. Newark ka bay mèt kay amann pou ogmantasyon gwo konsa. Ou ka voye lèt ki anba a epi mande èd legal gratis.';
EXPLAIN.over_cap.ht = () => 'Lwaye w ap monte plis pase 4%. Nan Newark, kontwòl lwaye limite ogmantasyon chak ane a chanjman CPI a, epi janm plis pase 4%. Voye lèt ki anba a pou mande kijan yo kalkile ogmantasyon an.';
EXPLAIN.depends_on_building.ht = () => 'Lwaye w ap monte ant 4% ak 5%. Pifò lwaye nan Newark anba kontwòl lwaye, ak yon limit 4%. Bilding ki gen 4 apatman oswa mwens kote mèt kay la rete pa ladan. Mande mèt kay ou kiyès ki aplike pou ou.';
EXPLAIN.short_notice.ht = () => 'Kantite a sanble bon. Men nouvo lwaye a kòmanse twò vit apre avi a. Mande mèt kay ou ba ou tout tan avi a.';
EXPLAIN.within_limits.ht = () => 'Lwaye w ap monte yon ti kras. Sa sanble nan limit la. Kanmenm, mande mèt kay ou nimewo enskripsyon vil la pou apatman an.';
EXPLAIN.not_rent_increase.ht = () => 'Avi sa a pa konsène yon ogmantasyon lwaye. Li l byen epi verifye tout dat ki ladan l.';

const DISCLAIMER = {
  en: 'This is general information, not legal advice.',
  es: 'Esto es información general, no consejo legal.',
  pt: 'Isto é informação geral, não aconselhamento jurídico.',
  ht: 'Sa a se enfòmasyon jeneral, se pa konsèy legal.',
};

const blank = (v) => (v === null || v === undefined || v === '' ? '__________' : v);

export function mockLetter(f, check) {
  const concern =
    check.color === 'red' || check.color === 'yellow'
      ? '\nFrom what I understand of Newark\'s rent rules, this increase may be more than is allowed. I would like to talk about it before it takes effect.\n'
      : '';
  return `Date: __________

To: ${blank(f.landlord_or_company)}
Re: Rent increase notice for ${blank(f.unit_address)}

Hello,

I received your notice dated ${blank(f.notice_date)} raising my rent from $${blank(f.current_rent)} to $${blank(f.new_rent)}, starting ${blank(f.effective_date)}.
${concern}
Please send me, in writing:
1. The City of Newark rental registration number for my unit.
2. Whether my building is under Newark rent control, and how this increase was calculated.

Thank you,
__________ (your name)
__________ (your phone)`;
}

export function mockExplain({ fields, check, language }) {
  const key = check.verdictKey || 'not_rent_increase';
  const lang = EXPLAIN[key][language] ? language : 'en';
  return {
    verdict_line: check.headline ? check.headline[lang] : '',
    explanation: `${EXPLAIN[key][lang](fields)} ${DISCLAIMER[lang]}`,
    letter: check.status === 'escalate' || check.status === 'info' ? null : mockLetter(fields, check),
  };
}
