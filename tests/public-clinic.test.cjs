const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Use the actual component, following the Node harness in saas.test.cjs.
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
  });
  module._compile(result.outputText, filename);
};
require('@angular/compiler');
const { Injector, runInInjectionContext } = require('@angular/core');
const { HttpErrorResponse } = require('@angular/common/http');
const { ActivatedRoute, convertToParamMap } = require('@angular/router');
const { BehaviorSubject, Subject } = require('rxjs');
const source = relative => require(path.join(__dirname, '../src/app', relative));
const { ClinicComponent } = source('pages/public/clinic/clinic.component.ts');
const { ClinicaService } = source('core/services/clinica.service.ts');
const html = fs.readFileSync(path.join(__dirname, '../src/app/pages/public/clinic/clinic.component.html'), 'utf8');
const componentSource = fs.readFileSync(path.join(__dirname, '../src/app/pages/public/clinic/clinic.component.ts'), 'utf8');
const clinic = (slug = 'los-andes', fields = {}) => ({
  id: 1, slug, nombre: 'Veterinaria Los Andes', descripcion: null,
  direccion: null, telefono: null, horarioAtencion: null, logoUrl: null, ...fields
});
const services = [
  { id: 1, nombre: 'Vacunaci\u00f3n canina', descripcion: 'Protecci\u00f3n y prevenci\u00f3n', costoBase: 45 },
  { id: 2, nombre: 'Consulta general', descripcion: 'Evaluaci\u00f3n felina', costoBase: 60.5 },
  { id: 3, nombre: 'Control', descripcion: null, costoBase: 0 }
];
const reply = (request, value) => { request.response.next(value); request.response.complete(); };
const fail = (request, status) => request.response.error(new HttpErrorResponse({ status }));

function fixture(t, initialSlug = 'los-andes') {
  const paramMap = new BehaviorSubject(convertToParamMap(initialSlug ? { slug: initialSlug } : {}));
  const calls = { clinic: [], services: [] };
  const request = (kind, args) => {
    const response = new Subject();
    calls[kind].push({ args, response });
    return response;
  };
  // Deliberately expose no authenticated, directory or mutation API methods.
  const api = {
    getPublicClinic: (...args) => request('clinic', args),
    getPublicServices: (...args) => request('services', args)
  };
  const injector = Injector.create({ providers: [
    { provide: ActivatedRoute, useValue: { paramMap } },
    { provide: ClinicaService, useValue: api }
  ] });
  const component = runInInjectionContext(injector, () => new ClinicComponent());
  component.ngOnInit();
  const destroy = () => { if (!injector.destroyed) injector.destroy(); };
  t.after(destroy);
  return { component, calls, paramMap, destroy,
    navigate: slug => paramMap.next(convertToParamMap(slug ? { slug } : {})) };
}

test('initial empty internal slug makes no requests; route emission starts exactly two public requests', t => {
  const { component: c, calls, navigate } = fixture(t, '');
  assert.deepEqual(calls, { clinic: [], services: [] });
  assert.equal(c.error(), 'not-found');
  assert.equal(c.loading(), false);
  assert.equal(c.servicesLoading(), false);
  navigate('los-andes');
  assert.deepEqual(calls.clinic.map(r => r.args), [['los-andes']]);
  assert.deepEqual(calls.services.map(r => r.args), [['los-andes']]);
  assert.equal(c.loading(), true);
  assert.equal(c.servicesLoading(), true);
  assert.equal(c.error(), '');
  assert.equal(c.servicesError(), false);
});

test('clinic success does not complete or hide independent service loading', t => {
  const { component: c, calls } = fixture(t);
  const data = clinic();
  reply(calls.clinic[0], data);
  assert.equal(c.clinic(), data);
  assert.equal(c.loading(), false);
  assert.equal(c.servicesLoading(), true);
  assert.deepEqual(c.servicios(), []);
  reply(calls.services[0], services);
  assert.equal(c.servicesLoading(), false);
  assert.equal(c.servicios(), services);
});

test('services can finish first without clearing clinic loading', t => {
  const { component: c, calls } = fixture(t);
  reply(calls.services[0], services);
  assert.equal(c.servicesLoading(), false);
  assert.equal(c.loading(), true);
  assert.equal(c.clinic(), null);
  assert.equal(c.servicios(), services);
  reply(calls.clinic[0], clinic());
  assert.equal(c.loading(), false);
});

for (const [status, expected] of [[404, 'not-found'], [500, 'unavailable'], [0, 'unavailable']]) {
  test(`clinic HTTP ${status} is ${expected}, not a successful empty profile`, t => {
    const { component: c, calls } = fixture(t);
    fail(calls.clinic[0], status);
    assert.equal(c.error(), expected);
    assert.equal(c.clinic(), null);
    assert.equal(c.loading(), false);
    assert.equal(c.servicesLoading(), true);
  });
}

for (const status of [404, 500, 0]) {
  test(`service HTTP ${status} remains an error rather than an empty catalog`, t => {
    const { component: c, calls } = fixture(t);
    const data = clinic();
    reply(calls.clinic[0], data);
    fail(calls.services[0], status);
    assert.equal(c.servicesError(), true);
    assert.equal(c.servicesLoading(), false);
    assert.equal(c.clinic(), data);
    assert.equal(c.error(), '');
    assert.match(html, /@else if \(servicesError\(\)\)[\s\S]*retryServices\(\)[\s\S]*@else if \(servicios\(\)\.length === 0\)/);
  });
}

test('successful empty catalog has neither loading nor an error', t => {
  const { component: c, calls } = fixture(t);
  reply(calls.services[0], []);
  assert.deepEqual(c.servicios(), []);
  assert.equal(c.servicesError(), false);
  assert.equal(c.servicesLoading(), false);
});

test('retryClinic only reloads the clinic and clears its failure', t => {
  const { component: c, calls } = fixture(t);
  reply(calls.services[0], services);
  fail(calls.clinic[0], 500);
  c.retryClinic();
  assert.equal(calls.clinic.length, 2);
  assert.deepEqual(calls.clinic[1].args, ['los-andes']);
  assert.equal(calls.services.length, 1);
  assert.equal(c.loading(), true);
  assert.equal(c.error(), '');
  assert.equal(c.servicios(), services);
  reply(calls.clinic[1], clinic());
  assert.equal(c.clinic().slug, 'los-andes');
  assert.equal(c.loading(), false);
});

test('retryServices only reloads services and clears their failure', t => {
  const { component: c, calls } = fixture(t);
  const data = clinic();
  reply(calls.clinic[0], data);
  fail(calls.services[0], 0);
  c.retryServices();
  assert.equal(calls.services.length, 2);
  assert.deepEqual(calls.services[1].args, ['los-andes']);
  assert.equal(calls.clinic.length, 1);
  assert.equal(c.clinic(), data);
  assert.equal(c.servicesLoading(), true);
  assert.equal(c.servicesError(), false);
  reply(calls.services[1], services);
  assert.equal(c.servicios(), services);
  assert.equal(c.servicesLoading(), false);
});

test('slug change cancels both pending requests and rejects late old responses', t => {
  const { component: c, calls, navigate } = fixture(t);
  c.search.setValue('old query');
  navigate('nueva-clinica');
  assert.equal(calls.clinic[0].response.observed, false);
  assert.equal(calls.services[0].response.observed, false);
  assert.deepEqual(calls.clinic[1].args, ['nueva-clinica']);
  assert.deepEqual(calls.services[1].args, ['nueva-clinica']);
  assert.equal(c.clinic(), null);
  assert.deepEqual(c.servicios(), []);
  assert.equal(c.search.value, '');
  assert.equal(c.loading(), true);
  assert.equal(c.servicesLoading(), true);
  reply(calls.clinic[0], clinic('los-andes'));
  reply(calls.services[0], services);
  assert.equal(c.clinic(), null);
  assert.deepEqual(c.servicios(), []);
  const newer = clinic('nueva-clinica');
  reply(calls.clinic[1], newer);
  assert.equal(c.clinic(), newer);
  assert.deepEqual(c.servicios(), []);
  reply(calls.services[1], [services[2]]);
  assert.deepEqual(c.servicios(), [services[2]]);
});

test('navigation clears already loaded data, errors and logo fallback without mixing clinics', t => {
  const { component: c, calls, navigate } = fixture(t);
  reply(calls.clinic[0], clinic());
  reply(calls.services[0], services);
  c.logoFailed.set(true);
  c.search.setValue('vacuna');
  navigate('second');
  assert.equal(c.clinic(), null);
  assert.deepEqual(c.filteredServices(), []);
  assert.equal(c.logoFailed(), false);
  fail(calls.clinic[1], 500);
  fail(calls.services[1], 500);
  navigate('third');
  assert.equal(c.error(), '');
  assert.equal(c.servicesError(), false);
  reply(calls.services[2], [services[2]]);
  assert.equal(c.clinic(), null);
  assert.equal(c.loading(), true);
  reply(calls.clinic[2], clinic('third'));
  assert.equal(c.clinic().slug, 'third');
  assert.deepEqual(c.servicios(), [services[2]]);
});

test('duplicate slug emissions do not reload; missing slug cancels pending work', t => {
  const { component: c, calls, navigate } = fixture(t);
  navigate('los-andes');
  assert.equal(calls.clinic.length, 1);
  assert.equal(calls.services.length, 1);
  navigate('');
  assert.equal(calls.clinic[0].response.observed, false);
  assert.equal(calls.services[0].response.observed, false);
  assert.equal(c.error(), 'not-found');
  assert.equal(c.loading(), false);
  assert.equal(c.servicesLoading(), false);
  assert.equal(c.clinic(), null);
  assert.deepEqual(c.servicios(), []);
});

test('injector destruction cancels requests, route and toSignal search subscriptions', t => {
  const { component: c, calls, paramMap, destroy, navigate } = fixture(t);
  c.servicios.set(services);
  c.search.setValue('control');
  assert.deepEqual(c.filteredServices(), [services[2]]);
  assert.equal(paramMap.observed, true);
  destroy();
  assert.equal(paramMap.observed, false);
  assert.equal(calls.clinic[0].response.observed, false);
  assert.equal(calls.services[0].response.observed, false);
  reply(calls.clinic[0], clinic('late'));
  reply(calls.services[0], []);
  navigate('late');
  c.retryClinic();
  c.retryServices();
  c.search.setValue('vacuna');
  assert.equal(c.clinic(), null);
  assert.deepEqual(c.filteredServices(), [services[2]]);
  assert.equal(calls.clinic.length, 1);
  assert.equal(calls.services.length, 1);
});

test('search ignores accents and case and requires all words across name and description', t => {
  const { component: c, calls } = fixture(t);
  reply(calls.services[0], services);
  for (const [query, expected] of [
    ['VACUNACION', [services[0]]], ['proteccion CANINA', [services[0]]],
    ['  FELINA\tconsulta  ', [services[1]]], ['evaluacion', [services[1]]],
    ['VACUNACI\u00d3N prevencion', [services[0]]], ['control ausente', []],
    ['', services], [' \t ', services]
  ]) {
    c.search.setValue(query);
    assert.deepEqual(c.filteredServices(), expected, query);
  }
  assert.equal(calls.services.length, 1);
});

test('money uses es-PE Intl PEN formatting, including free services, without dollar symbols', t => {
  const { component: c } = fixture(t);
  for (const amount of [0, 45, 60.5, 1234.56]) {
    const formatted = c.formatMoney(amount);
    assert.equal(formatted, new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount));
    assert.doesNotMatch(formatted, /\$/);
  }
  assert.match(html, /formatMoney\(s\.costoBase\)/);
});

test('phone sanitizes spaces and hyphens, preserves international prefix and never infers +51', t => {
  const { component: c } = fixture(t);
  for (const [telefono, expected] of [
    [' +51 987-654-321 ', 'tel:+51987654321'], ['+34 612-345-678', 'tel:+34612345678'],
    ['987 654-321', 'tel:987654321'], ['12345678', 'tel:12345678'],
    ['12345678901234567890', 'tel:12345678901234567890']
  ]) {
    c.clinic.set(clinic('phone', { telefono }));
    assert.equal(c.phoneHref(), expected, telefono);
  }
});

test('phone rejects dangerous schemes, markup, misplaced pluses and invalid digit lengths', t => {
  const { component: c } = fixture(t);
  for (const telefono of [null, '', '   ', 'javascript:alert(1)', 'data:text/html,12345678',
    'tel:+51987654321', 'https://example.test', '12345678;ext=1', '<12345678>',
    '++51987654321', '987+654321', '1234567', '123456789012345678901', '+', '---']) {
    c.clinic.set(clinic('phone', { telefono }));
    assert.equal(c.phoneHref(), null, String(telefono));
  }
});

test('maps encodes only the published address and never guesses a location', t => {
  const { component: c } = fixture(t);
  for (const direccion of [null, '', ' \t ']) {
    c.clinic.set(clinic('lima', { nombre: 'Clinica Lima', direccion }));
    assert.equal(c.mapsHref(), null);
  }
  const address = 'Av. Per\u00fa 123 & Jr. Sol #4 / Lima?';
  c.clinic.set(clinic('different-slug', { direccion: `  ${address}  ` }));
  assert.equal(c.mapsHref(), `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
  const url = new URL(c.mapsHref());
  assert.deepEqual([...url.searchParams], [['api', '1'], ['query', address]]);
});

test('logos allow HTTP and HTTPS but reject credentials, executable schemes and relative URLs', t => {
  const { component: c } = fixture(t);
  for (const logoUrl of ['https://cdn.example.test/logo.png', 'http://cdn.example.test/logo.png']) {
    c.clinic.set(clinic('logo', { logoUrl }));
    assert.equal(c.safeLogoUrl(), logoUrl);
  }
  for (const logoUrl of [null, '', 'not a url', '/logo.png', '//cdn.example.test/logo.png',
    'https://user:pass@example.test/logo.png', 'https://user@example.test/logo.png',
    'https://:pass@example.test/logo.png', 'data:image/svg+xml,<svg/>', 'javascript:alert(1)',
    'file:///logo.png', 'blob:https://example.test/id']) {
    c.clinic.set(clinic('logo', { logoUrl }));
    assert.equal(c.safeLogoUrl(), null, String(logoUrl));
  }
});

test('broken logo falls back and a new route permits the new clinic logo', t => {
  const { component: c, calls, navigate } = fixture(t);
  const logoUrl = 'https://cdn.example.test/logo.png';
  reply(calls.clinic[0], clinic('los-andes', { logoUrl }));
  assert.equal(c.safeLogoUrl(), logoUrl);
  c.logoFailed.set(true);
  assert.equal(c.safeLogoUrl(), null);
  navigate('second');
  assert.equal(c.logoFailed(), false);
  assert.equal(c.safeLogoUrl(), null);
  reply(calls.clinic[1], clinic('second', { logoUrl }));
  assert.equal(c.safeLogoUrl(), logoUrl);
  assert.match(html, /@if \(safeLogoUrl\(\); as logo\)/);
  assert.match(html, /\[src\]="logo"[^>]*\(error\)="logoFailed\.set\(true\)"/);
});

test('clinic icons are local SVGs and remain independent of external icon fonts', () => {
  assert.doesNotMatch(html, /material-symbols-outlined/);
  const icons = html.match(/<svg\b[^>]*>/g) || [];
  assert.ok(icons.length > 5);
  for (const icon of icons) {
    assert.match(icon, /aria-hidden="true"/);
    assert.match(icon, /focusable="false"/);
  }
});

test('registration to login retains the selected clinic instead of falling back to a generic context', () => {
  const register = fs.readFileSync(path.join(__dirname, '../src/app/pages/auth/register/register.component.ts'), 'utf8');
  assert.match(register, /routerLink="\/auth"\s+\[queryParams\]="clinicSlug \? \{ clinica: clinicSlug \} : \{\}"/);
});

test('native account links bind the exact loaded clinic slug to the established auth routes', () => {
  const anchors = html.match(/<a\b[^>]*>/g) || [];
  const register = anchors.filter(tag => /routerLink="\/auth\/register"/.test(tag));
  const login = anchors.filter(tag => /routerLink="\/auth"/.test(tag));
  assert.equal(register.length, 1);
  assert.equal(login.length, 2);
  assert.match(register[0], /\[queryParams\]="\{ clinica: c\.slug \}"/);
  assert.ok(login.some(tag => /\[queryParams\]="\{ clinica: c\.slug \}"/.test(tag)));
  assert.ok(login.some(tag => /\[queryParams\]="!loading\(\) && !error\(\) && clinic\(\) \? \{ clinica: clinic\(\)\?\.slug \} : \{\}"/.test(tag)));
  for (const tag of [...register, ...login]) assert.doesNotMatch(tag, /\(click\)|href="javascript:|target=/);
});

test('template wires safe helpers, retries, distinct errors and search without invented claims or booking forms', () => {
  assert.match(html, /error\(\) === 'not-found'/);
  assert.match(html, /error\(\) === 'unavailable'/);
  assert.match(html, /\(click\)="retryClinic\(\)"/);
  assert.match(html, /\(click\)="retryServices\(\)"/);
  assert.match(html, /\[formControl\]="search"/);
  assert.match(html, /\[href\]="phone"/);
  assert.match(html, /\[href\]="maps"[^>]*rel="noopener noreferrer"/);
  assert.match(html, /\(click\)="scrollToServices\(\)"/);
  const forms = html.match(/<form\b[^>]*>/g) || [];
  assert.equal(forms.length, 1);
  assert.match(forms[0], /role="search"/);
  assert.doesNotMatch(html + componentSource, /verified|verificad[oa]|rating|testimoni|4\.9|5\.0|24\s*\/\s*7|urgencias|emergencias|annual|anual|\[innerHTML\]|\bobs\b/i);
  assert.doesNotMatch(html, /ngSubmit|datetime-local|type="date"|type="time"|formGroup/);
});

test('public component calls only getPublicClinic and getPublicServices on ClinicaService', () => {
  const calls = [...componentSource.matchAll(/this\.api\.(\w+)\s*\(/g)].map(match => match[1]);
  assert.deepEqual(calls.sort(), ['getPublicClinic', 'getPublicServices']);
  assert.doesNotMatch(componentSource, /HttpClient|AuthService|CitaService|MascotaService|localStorage|sessionStorage/);
});
