// ─────────────────────────────────────────────────────────────
// MOCK MODE — used when there is no AI key in .env, when a "sample"
// button is pressed, or as a fallback if the AI call fails on stage.
// These are the three fake notices from the build plan.
// ─────────────────────────────────────────────────────────────

const base = {
  language_of_notice: 'English',
  landlord_or_company: 'Broad Street Property Group LLC',
  unit_address: '123 Example Ave, Apt 4B, Newark, NJ 07102',
  deadline_to_respond: null,
  mentions_court_or_filing: false,
  confidence: 'high',
  unreadable_parts: [],
};

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
    notice_type: 'eviction_or_court',
    current_rent: null,
    new_rent: null,
    notice_date: '2026-10-08',
    effective_date: null,
    deadline_to_respond: '2026-10-22',
    mentions_court_or_filing: true,
  },
};

/** In mock mode, pick a sample from the uploaded file's name (handy for testing). */
export function sampleFromFilename(name = '') {
  const n = name.toLowerCase();
  if (n.includes('court') || n.includes('evict')) return SAMPLES.court;
  if (n.includes('illegal')) return SAMPLES.illegal;
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
    en: () => 'Your rent goes up between 4% and 5%. In buildings with 3 or more apartments, the limit may be lower. Send the letter to ask how the raise was figured.',
    es: () => 'Su renta sube entre 4% y 5%. En edificios con 3 o más apartamentos, el límite puede ser menor. Envíe la carta para preguntar cómo calcularon el aumento.',
    pt: () => 'Seu aluguel sobe entre 4% e 5%. Em prédios com 3 ou mais apartamentos, o limite pode ser menor. Envie a carta para perguntar como o aumento foi calculado.',
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
EXPLAIN.over_cap.ht = () => 'Lwaye w ap monte ant 4% ak 5%. Nan bilding ki gen 3 apatman oswa plis, limit la ka pi ba. Voye lèt la pou mande kijan yo kalkile ogmantasyon an.';
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
