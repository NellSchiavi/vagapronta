function (APP) {
  /*
   * Botão de favoritos "Enviar para o VagaPronta".
   * Roda na página da vaga, no navegador da própria pessoa: lê só o que está na tela
   * (título, empresa e texto do anúncio) e abre o VagaPronta em Adaptar com isso.
   * Os dados vão no endereço do VagaPronta, depois do "#" (essa parte não é enviada
   * a nenhum servidor). Nada de login, cliques ou navegação automática.
   */
  var d = document;
  var host = location.hostname.toLowerCase();
  var MAX = 12000;

  function clean(t) {
    return (t || '').replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function text(el) {
    return el ? clean(el.innerText || el.textContent) : '';
  }
  function first(list) {
    for (var i = 0; i < list.length; i++) {
      var el = d.querySelector(list[i]);
      if (el && text(el)) return el;
    }
    return null;
  }
  function meta(name) {
    var el = d.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]');
    return el ? clean(el.getAttribute('content')) : '';
  }
  function htmlToText(html) {
    var div = d.createElement('div');
    div.innerHTML = String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h\d|div)>/gi, '\n');
    return clean(div.textContent);
  }

  /* dados estruturados (schema.org JobPosting), quando o site publica */
  var ld = null;
  var scripts = d.querySelectorAll('script[type="application/ld+json"]');
  for (var s = 0; s < scripts.length && !ld; s++) {
    try {
      var data = JSON.parse(scripts[s].textContent);
      var items = [].concat(data);
      for (var k = 0; k < items.length; k++) if (items[k] && items[k]['@graph']) items = items.concat(items[k]['@graph']);
      for (var m = 0; m < items.length; m++) {
        var tp = items[m] && items[m]['@type'];
        if (tp === 'JobPosting' || (Array.isArray(tp) && tp.indexOf('JobPosting') >= 0)) { ld = items[m]; break; }
      }
    } catch (e) { /* bloco inválido: ignora */ }
  }

  /* onde cada site mostra a vaga */
  var SITES = [
    { test: /(^|\.)linkedin\.com$/,
      title: ['.job-details-jobs-unified-top-card__job-title', '.jobs-unified-top-card__job-title', '.top-card-layout__title', '.topcard__title'],
      company: ['.job-details-jobs-unified-top-card__company-name', '.jobs-unified-top-card__company-name', '.topcard__org-name-link', '.top-card-layout__second-subline a'],
      body: ['#job-details', '.jobs-description__content', '.jobs-box__html-content', '.show-more-less-html__markup', '.description__text'] },
    { test: /(^|\.)indeed\./,
      title: ['[data-testid="jobsearch-JobInfoHeader-title"]', '.jobsearch-JobInfoHeader-title', 'h1'],
      company: ['[data-testid="inlineHeader-companyName"]', '[data-company-name]', '.jobsearch-CompanyInfoContainer a'],
      body: ['#jobDescriptionText'] },
    { test: /(^|\.)gupy\.io$/,
      title: ['[data-testid="job-title"]', 'h1'],
      company: ['[data-testid="company-name"]'],
      body: ['[data-testid="job-description"]', '#job-description'] },
  ];
  var site = null;
  for (var i = 0; i < SITES.length; i++) if (SITES[i].test.test(host)) site = SITES[i];

  var title = '';
  var company = '';
  var body = '';
  var bodyEl = null;
  if (site) {
    title = text(first(site.title));
    company = text(first(site.company));
    bodyEl = first(site.body);
    /* Gupy: a descrição vem em várias seções */
    if (/gupy\.io$/.test(host)) {
      var parts = d.querySelectorAll('[data-testid="text-section"]');
      if (parts.length) body = Array.prototype.map.call(parts, text).join('\n\n');
    }
    if (!body) body = text(bodyEl);
  }
  if (ld) {
    title = title || clean(ld.title);
    company = company || clean(ld.hiringOrganization && ld.hiringOrganization.name);
    if (body.length < 200) body = htmlToText(ld.description);
  }
  title = title || text(d.querySelector('h1')) || meta('og:title') || clean(d.title);
  company = company || meta('og:site_name');

  /* a pessoa selecionou o anúncio? usa a seleção */
  var sel = String(window.getSelection ? window.getSelection() : '').trim();
  if (sel.length > 200) body = clean(sel);
  if (!body) body = text(first(['main', 'article', '[role="main"]'])) || text(d.body);

  /* é vaga se: o site publica JobPosting, ou achamos a descrição no lugar certo, ou o texto tem cara de anúncio */
  var looksLikeJob =
    Boolean(ld) ||
    Boolean(bodyEl && body.length > 200) ||
    (body.length > 300 && /(requisitos|responsabilidades|atribui[cç][oõ]es|atividades|qualifica[cç]|benef[ií]cios|o que esperamos|requirements|responsibilities|qualifications|what you.ll do|anforderungen|aufgaben)/i.test(body));
  if (!looksLikeJob) {
    alert('Esta página não parece ser o anúncio de uma vaga.\n\nAbra a página da vaga (com a descrição completa) e clique no botão de novo. Dica: se a página tiver muita coisa, selecione o texto do anúncio antes.');
    return;
  }

  /* link limpo: sem rastreamento nem tokens */
  var link = location.href;
  try {
    var u = new URL(location.href);
    if (/(^|\.)linkedin\.com$/.test(host)) {
      var mm = u.pathname.match(/\/jobs\/view\/(?:[^/]*?-)?(\d{6,})/);
      var id = (mm && mm[1]) || u.searchParams.get('currentJobId');
      link = id ? 'https://www.linkedin.com/jobs/view/' + id + '/' : u.origin + u.pathname;
    } else if (/(^|\.)indeed\./.test(host) && (u.searchParams.get('jk') || u.searchParams.get('vjk'))) {
      link = u.origin + '/viewjob?jk=' + (u.searchParams.get('jk') || u.searchParams.get('vjk'));
    } else {
      var DROP = /^(utm_.*|gclid|gbraid|wbraid|fbclid|msclkid|trackingid|refid|trk|trkemail|midtoken|midsig|otptoken|eid|lipi|lici|mc_cid|mc_eid|_hsenc|_hsmi|token|sessionid|sid|ref|source|src|from|tk)$/i;
      Array.from(u.searchParams.keys()).forEach(function (key) { if (DROP.test(key)) u.searchParams.delete(key); });
      if (u.hash.indexOf('=') >= 0) u.hash = '';
      link = u.toString();
    }
  } catch (e) { /* fica o endereço como está */ }

  var params = new URLSearchParams();
  params.set('link', link);
  if (title) params.set('titulo', title.slice(0, 200));
  if (company) params.set('empresa', company.slice(0, 120));
  params.set('texto', body.slice(0, MAX));
  var target = APP.replace(/#.*$/, '') + '#/adaptar?' + params.toString();
  var win = window.open(target, '_blank');
  if (!win) alert('O navegador bloqueou a nova aba. Permita pop-ups para este site e clique de novo.');
}
