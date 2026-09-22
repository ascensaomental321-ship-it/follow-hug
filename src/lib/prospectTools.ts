export const TOOL_LINKS = {
  buscalink: 'https://business-link-grabber.lovable.app/',
  buscaSocio: 'https://partner-finder-3d.lovable.app/',
  script: 'https://script-flow-names.lovable.app/',
} as const;

export function buildToolUrls(nome: string) {
  const raw = (nome ?? '').trim();
  const empresa = encodeURIComponent(raw);
  // Se o texto tiver um CNPJ (14 dígitos), usa o parâmetro ?cnpj=
  const digits = raw.replace(/\D/g, '');
  const cnpj = digits.length === 14 ? digits : '';
  const buscaSocio = cnpj
    ? `${TOOL_LINKS.buscaSocio}?cnpj=${cnpj}`
    : `${TOOL_LINKS.buscaSocio}?empresa=${empresa}&q=${empresa}&query=${empresa}`;
  return {
    buscalink: `${TOOL_LINKS.buscalink}?empresa=${empresa}&nome=${empresa}&q=${empresa}`,
    buscaSocio,
    script: `${TOOL_LINKS.script}?empresa=${empresa}&nome=${empresa}`,
  };
}

/**
 * Copia o nome da empresa de forma SÍNCRONA (mantém o gesto do usuário, evita
 * bloqueio de pop-up e funciona dentro de iframes onde a Clipboard API falha).
 * No Buscalink basta dar Ctrl+V em qualquer lugar da página.
 */
export function copyCompanyName(nome: string) {
  const text = (nome ?? '').trim();
  if (!text) return false;
  let ok = false;
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, text.length);
    ok = document.execCommand('copy');
    document.body.removeChild(el);
  } catch {
    ok = false;
  }
  // Tentativa extra (assíncrona) pela Clipboard API moderna.
  try {
    navigator.clipboard?.writeText(text).then(
      () => {},
      () => {},
    );
  } catch {
    /* ignora */
  }
  return ok;
}

/** Abre as três ferramentas de prospecção já preenchidas com o nome da empresa. */
export function openProspectTools(nome: string) {
  const urls = buildToolUrls(nome);
  // Copia antes de abrir (síncrono): no Buscalink é só dar Ctrl+V.
  const copied = copyCompanyName(nome);
  // Buscalink por último para ficar como aba ativa/mais recente.
  [urls.script, urls.buscalink].forEach((url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  return copied;
}

/** Abre apenas o Script já preenchido com o nome da empresa. */
export function openScriptTool(nome: string) {
  const urls = buildToolUrls(nome);
  const copied = copyCompanyName(nome);
  window.open(urls.script, '_blank', 'noopener,noreferrer');
  return copied;
}

/** Abre apenas o Buscalink já preenchido com o nome da empresa. */
export function openBuscalinkTool(nome: string) {
  const urls = buildToolUrls(nome);
  const copied = copyCompanyName(nome);
  window.open(urls.buscalink, '_blank', 'noopener,noreferrer');
  return copied;
}
