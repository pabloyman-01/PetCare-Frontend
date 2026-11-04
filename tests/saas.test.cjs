const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Exercise the actual TS classes without repairing the unrelated Karma configuration.
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
  });
  module._compile(result.outputText, filename);
};
require('@angular/compiler');
const { Injector, runInInjectionContext } = require('@angular/core');
const { HttpClient, HttpErrorResponse } = require('@angular/common/http');
const { Router } = require('@angular/router');
const { Subject, of, throwError } = require('rxjs');
const source = relative => require(path.join(__dirname, '../src/app', relative));
const { OPERATOR_ROLE, sessionHome, canAccessRoles } = source('core/guards/session-policy.ts');
const { AuthGuard } = source('core/guards/auth.guard.ts');
const { RoleGuard } = source('core/guards/role.guard.ts');
const { AuthService, API_URL } = source('core/services/auth.service.ts');
const { SaasService } = source('core/services/saas.service.ts');
const { SaasClinicasComponent, auditReasonValidator } = source('pages/saas/saas-clinicas.component.ts');
const { routes } = source('app.routes.ts');
const wait = (ms = 10) => new Promise(resolve => setTimeout(resolve, ms));
const page = (items, current = 0, totalPages = 3) => ({ items, page: current, totalPages, totalElements: 43 });
const clinic = id => ({
  id, nombre: `Clinica ${id}`, slug: `clinica-${id}`, estado: 'ACTIVA', createdAt: '2026-11-01T00:00:00',
  plan: { plan: 'TRIAL', tier: 'PRO', status: 'TRIAL', readOnly: false, trialStartedAt: '2026-11-01T00:00:00',
    trialEndsAt: '2026-11-15T00:00:00', daysRemaining: 12, staffUsed: 7, staffLimit: 5, petsUsed: 2600, petsLimit: 2500 }
});

function fixture(t, overrides = {}) {
  const calls = { list: [], audit: [], mutations: [], navigations: [] };
  let user = { id: 10, fullName: 'Operator', email: 'operator@example.test', roles: [OPERATOR_ROLE], forcePasswordChange: false };
  const auth = {
    user: () => user, isAuthenticated: () => true, roles: () => user.roles,
    isSaasOperator: () => user.roles.includes(OPERATOR_ROLE), mustChangePassword: () => user.forcePasswordChange,
    homeUrl: () => sessionHome(user.roles, user.forcePasswordChange), updateSessionUser: value => { user = value; },
    me: () => of(user), ...overrides.auth
  };
  const api = {
    list: (...args) => { const response = new Subject(); calls.list.push({ args, response }); return response; },
    audit: (...args) => { const response = new Subject(); calls.audit.push({ args, response }); return response; },
    changePlan: (...args) => { const response = new Subject(); calls.mutations.push({ kind: 'plan', args, response }); return response; },
    changeEstado: (...args) => { const response = new Subject(); calls.mutations.push({ kind: 'estado', args, response }); return response; }
  };
  const injector = Injector.create({ providers: [
    { provide: AuthService, useValue: auth }, { provide: SaasService, useValue: api },
    { provide: Router, useValue: { navigateByUrl: url => calls.navigations.push(url) } }
  ] });
  const component = runInInjectionContext(injector, () => new SaasClinicasComponent());
  component.ngOnInit();
  const destroy = () => { if (!injector.destroyed) injector.destroy(); };
  t.after(destroy);
  return { component, calls, auth, destroy };
}

test('session destinations and mixed roles always prioritize the operator workspace', () => {
  assert.equal(sessionHome([OPERATOR_ROLE]), '/saas/clinicas');
  assert.equal(sessionHome([OPERATOR_ROLE, 'ROLE_ADMIN']), '/saas/clinicas');
  assert.equal(sessionHome([OPERATOR_ROLE], true), '/change-password');
  assert.equal(sessionHome(['ROLE_ADMIN']), '/dashboard');
  for (const clinical of ['ROLE_ADMIN', 'ROLE_VETERINARIO', 'ROLE_ASISTENTE', 'ROLE_DUENIO']) {
    assert.equal(canAccessRoles([OPERATOR_ROLE, clinical], [clinical]), false);
    assert.equal(canAccessRoles([OPERATOR_ROLE, clinical]), false);
    assert.equal(canAccessRoles([OPERATOR_ROLE, clinical], [OPERATOR_ROLE]), true);
    assert.equal(canAccessRoles([clinical], [OPERATOR_ROLE]), false);
  }
});

test('guards return redirects for anonymous, forced-password and rejected role navigation', () => {
  const router = { parseUrl: url => ({ url }) };
  const auth = { isAuthenticated: () => true, mustChangePassword: () => false,
    roles: () => [OPERATOR_ROLE, 'ROLE_ADMIN'], homeUrl: () => '/saas/clinicas' };
  const guard = new RoleGuard(auth, router);
  assert.deepEqual(guard.canActivate({ data: {} }), { url: '/saas/clinicas' });
  assert.deepEqual(guard.canActivateChild({ data: { roles: ['ROLE_ADMIN'] } }), { url: '/saas/clinicas' });
  assert.equal(guard.canActivate({ data: { roles: [OPERATOR_ROLE] } }), true);
  auth.roles = () => ['ROLE_ADMIN']; auth.homeUrl = () => '/dashboard';
  assert.deepEqual(guard.canActivate({ data: { roles: [OPERATOR_ROLE] } }), { url: '/dashboard' });
  auth.mustChangePassword = () => true;
  const authGuard = new AuthGuard(auth, router);
  assert.deepEqual(authGuard.canActivate({ routeConfig: { path: 'saas/clinicas' } }), { url: '/change-password' });
  assert.equal(authGuard.canActivate({ routeConfig: { path: 'change-password' } }), true);
  assert.deepEqual(guard.canActivateChild({ data: {} }), { url: '/change-password' });
  auth.isAuthenticated = () => false;
  assert.deepEqual(authGuard.canActivate({}), { url: '/auth' });
  assert.deepEqual(guard.canActivate({ data: {} }), { url: '/auth' });
});

test('operator route is outside MainLayout and clinical children are guarded', () => {
  const operator = routes.find(route => route.path === 'saas/clinicas');
  const clinical = routes.find(route => route.children);
  assert.deepEqual(operator.data.roles, [OPERATOR_ROLE]);
  assert.deepEqual(operator.canActivate, [AuthGuard, RoleGuard]);
  assert.deepEqual(clinical.canActivate, [AuthGuard, RoleGuard]);
  assert.deepEqual(clinical.canActivateChild, [RoleGuard]);
  const injector = Injector.create({ providers: [{ provide: AuthService, useValue: {
    isAuthenticated: () => true, homeUrl: () => '/saas/clinicas'
  } }] });
  assert.equal(runInInjectionContext(injector, () => routes[0].redirectTo({})), '/saas/clinicas');
  assert.equal(runInInjectionContext(injector, () => routes.at(-1).redirectTo({})), '/saas/clinicas');
  injector.destroy();
});

test('reason requires 5..500 trimmed characters', () => {
  for (const value of ['', '    ', ' abcd ', 'x'.repeat(501)]) assert.ok(auditReasonValidator({ value }));
  for (const value of [' abcde ', 'x'.repeat(500)]) assert.equal(auditReasonValidator({ value }), null);
});

test('SaaS service uses exact endpoints, query pagination and trimmed mutation bodies', () => {
  const calls = [];
  const http = { get: (...args) => { calls.push(args); return of(null); }, patch: (...args) => { calls.push(args); return of(null); } };
  const injector = Injector.create({ providers: [{ provide: HttpClient, useValue: http }] });
  const api = runInInjectionContext(injector, () => new SaasService());
  api.list(' clinic ', 2); api.audit(9, 3); api.changePlan(9, 'PRO', ' reason '); api.changeEstado(9, 'SUSPENDIDA', ' reason ');
  assert.equal(calls[0][0], `${API_URL}/saas/clinicas`);
  assert.deepEqual(['q', 'page', 'size'].map(key => calls[0][1].params.get(key)), ['clinic', '2', '20']);
  assert.equal(calls[1][0], `${API_URL}/saas/clinicas/9/auditoria`);
  assert.deepEqual(['page', 'size'].map(key => calls[1][1].params.get(key)), ['3', '10']);
  assert.deepEqual(calls[2], [`${API_URL}/saas/clinicas/9/plan`, { plan: 'PRO', reason: 'reason' }]);
  assert.deepEqual(calls[3], [`${API_URL}/saas/clinicas/9/estado`, { estado: 'SUSPENDIDA', reason: 'reason' }]);
  injector.destroy();
});

test('new searches cancel old responses immediately and reset selection and pagination', async t => {
  const { component: c, calls } = fixture(t);
  await wait();
  assert.deepEqual(calls.list[0].args, ['', 0, 20]);
  calls.list[0].response.next(page([clinic(1)]));
  c.selectClinic(clinic(1));
  c.loadList(2);
  assert.equal(c.selected(), null);
  assert.equal(calls.audit[0].response.observed, false);
  await wait();
  assert.deepEqual(calls.list[1].args, ['', 2, 20]);
  c.search(' newer ');
  assert.equal(calls.list[1].response.observed, false);
  calls.list[1].response.next(page([clinic(99)], 2));
  assert.equal(c.clinics(), null);
  c.search(' latest ');
  await wait(330);
  assert.equal(calls.list.length, 3);
  assert.deepEqual(calls.list[2].args, ['latest', 0, 20]);
  calls.list[2].response.next(page([clinic(2)]));
  assert.equal(c.clinics().items[0].id, 2);
});

test('audit switches clinics and pages without accepting stale results', async t => {
  const { component: c, calls } = fixture(t);
  c.selectClinic(clinic(1));
  c.selectClinic(clinic(2));
  assert.equal(calls.audit[0].response.observed, false);
  calls.audit[0].response.next(page([{ id: 99 }]));
  assert.equal(c.audit(), null);
  calls.audit[1].response.next(page([{ id: 2 }]));
  c.loadAudit(2);
  assert.deepEqual(calls.audit[2].args, [2, 2, 10]);
  calls.audit[2].response.next(page([{ id: 3 }], 2));
  assert.equal(c.audit().page, 2);
  c.clearSelection();
  assert.equal(calls.audit[2].response.observed, false);
  assert.equal(c.audit(), null);
});

test('explicit mutation allows grandfathered TRIAL to PRO, preserves history, updates row and refreshes audit', async t => {
  const { component: c, calls } = fixture(t);
  await wait();
  const original = clinic(1);
  calls.list[0].response.next(page([original]));
  c.selectClinic(original);
  c.submit();
  assert.equal(calls.mutations.length, 0);
  c.form.controls.reason.setValue(' Approved migration ');
  assert.equal(calls.mutations.length, 0);
  c.submit(); c.submit(); c.search('ignored'); c.selectClinic(clinic(2));
  assert.equal(calls.mutations.length, 1);
  assert.equal(c.selected().id, 1);
  assert.equal(c.form.disabled, true);
  assert.equal(calls.mutations[0].kind, 'plan');
  const updated = { ...original, plan: { ...original.plan, plan: 'PRO', status: 'ACTIVE' } };
  calls.mutations[0].response.next(updated);
  assert.equal(c.clinics().items[0], updated);
  assert.equal(c.selected().plan.trialEndsAt, original.plan.trialEndsAt);
  assert.equal(c.selected().estado, 'ACTIVA');
  assert.equal(c.form.controls.reason.value, '');
  assert.ok(c.success());
  assert.equal(c.saving(), false);
  assert.deepEqual(calls.audit.at(-1).args, [1, 0, 10]);
});

test('409 keeps selected clinic and reason; a state change is a separate request', async t => {
  const { component: c, calls } = fixture(t);
  c.selectClinic(clinic(1));
  c.form.patchValue({ plan: 'CONSULTORIO', reason: 'Capacity review' });
  c.submit();
  calls.mutations[0].response.error(new HttpErrorResponse({ status: 409, error: { message: 'Over target' } }));
  assert.match(c.mutationError(), /409/);
  assert.match(c.mutationError(), /Over target/);
  assert.equal(c.selected().plan.plan, 'TRIAL');
  assert.equal(c.form.controls.reason.value, 'Capacity review');
  assert.equal(c.saving(), false);
  assert.equal(c.success(), '');
  c.setOperation('estado'); c.submit();
  assert.equal(calls.mutations[1].kind, 'estado');
  assert.deepEqual(calls.mutations[1].args, [1, 'SUSPENDIDA', 'Capacity review']);
});

test('list and audit failures can be retried, profile failures remain visible', async t => {
  const { component: c, calls } = fixture(t, { auth: { me: () => throwError(() => new Error('offline')) } });
  await wait();
  assert.equal(c.profileError(), true);
  calls.list[0].response.error(new Error('offline'));
  assert.equal(c.listLoading(), false);
  assert.ok(c.listError());
  c.loadList(); await wait();
  calls.list[1].response.next(page([clinic(1)]));
  assert.equal(c.listError(), '');
  c.selectClinic(clinic(1));
  calls.audit[0].response.error(new Error('offline'));
  assert.ok(c.auditError());
  c.loadAudit(); calls.audit[1].response.next(page([]));
  assert.equal(c.auditError(), '');
});

test('profile refresh routes changed roles and forced passwords to the correct home', async t => {
  const { calls } = fixture(t, { auth: { me: () => of({ id: 10, roles: [OPERATOR_ROLE], forcePasswordChange: true }) } });
  await wait();
  assert.deepEqual(calls.navigations, ['/change-password']);
});

test('destroy cancels all active requests and prevents late mutation updates', async t => {
  const { component: c, calls, destroy } = fixture(t);
  await wait();
  c.selectClinic(clinic(1));
  c.form.controls.reason.setValue('Approved operation'); c.submit();
  destroy();
  assert.equal(calls.list[0].response.observed, false);
  assert.equal(calls.audit[0].response.observed, false);
  assert.equal(calls.mutations[0].response.observed, false);
  calls.mutations[0].response.next(clinic(99));
  assert.equal(c.selected().id, 1);
});
