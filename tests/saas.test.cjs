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
const { SaasClinicasComponent, auditReasonValidator, paymentReferenceValidator } = source('pages/saas/saas-clinicas.component.ts');
const { routes } = source('app.routes.ts');
const wait = (ms = 10) => new Promise(resolve => setTimeout(resolve, ms));
const page = (items, current = 0, totalPages = 3) => ({ items, page: current, totalPages, totalElements: 43 });
const clinic = id => ({
  id, nombre: `Clinica ${id}`, slug: `clinica-${id}`, estado: 'ACTIVA', createdAt: '2026-11-01T00:00:00Z',
  plan: { plan: 'TRIAL', tier: 'PRO', status: 'TRIAL', readOnly: false, trialStartedAt: '2026-11-01T00:00:00Z',
    trialEndsAt: '2026-11-15T00:00:00Z', daysRemaining: 12, staffUsed: 7, staffLimit: 5, petsUsed: 2600, petsLimit: 2500,
    monthlyPrice: 129, currency: 'PEN', billingCycle: 'MONTHLY', subscriptionStartedAt: null, subscriptionEndsAt: null,
    subscriptionDaysRemaining: 0, lastPaymentId: null, canActivate: true, canRenew: false }
});
const paidClinic = id => {
  const result = clinic(id);
  return { ...result, plan: { ...result.plan, plan: 'PRO', status: 'ACTIVE', canActivate: false, canRenew: true,
    subscriptionStartedAt: '2026-11-01T05:00:00Z', subscriptionEndsAt: '2026-12-01T05:00:00Z',
    subscriptionDaysRemaining: 22, lastPaymentId: 71 } };
};
const billingValues = { reason: ' Manual payment verified ', paymentReference: ' bcp-2026-11-12345 ', paymentConfirmed: true };

function fixture(t, overrides = {}) {
  const calls = { list: [], audit: [], payments: [], mutations: [], navigations: [] };
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
    payments: (...args) => { const response = new Subject(); calls.payments.push({ args, response }); return response; },
    monthlyPayment: (...args) => { const response = new Subject(); calls.mutations.push({ kind: 'monthly', args, response }); return response; },
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
  const http = { get: (...args) => { calls.push(args); return of(null); }, patch: (...args) => { calls.push(args); return of(null); },
    post: (...args) => { calls.push(args); return of(null); } };
  const injector = Injector.create({ providers: [{ provide: HttpClient, useValue: http }] });
  const api = runInInjectionContext(injector, () => new SaasService());
  api.list(' clinic ', 2); api.audit(9, 3);
  api.monthlyPayment(9, { plan: 'PRO', operation: 'RENEW', ...billingValues, expectedPaymentId: 71 });
  api.changeEstado(9, 'SUSPENDIDA', ' reason '); api.payments(9, 4);
  assert.equal(calls[0][0], `${API_URL}/saas/clinicas`);
  assert.deepEqual(['q', 'page', 'size'].map(key => calls[0][1].params.get(key)), ['clinic', '2', '20']);
  assert.equal(calls[1][0], `${API_URL}/saas/clinicas/9/auditoria`);
  assert.deepEqual(['page', 'size'].map(key => calls[1][1].params.get(key)), ['3', '10']);
  assert.deepEqual(calls[2], [`${API_URL}/saas/clinicas/9/mensualidades`, { plan: 'PRO', operation: 'RENEW',
    reason: 'Manual payment verified', paymentReference: 'BCP-2026-11-12345', paymentConfirmed: true, expectedPaymentId: 71 }]);
  assert.deepEqual(calls[3], [`${API_URL}/saas/clinicas/9/estado`, { estado: 'SUSPENDIDA', reason: 'reason' }]);
  assert.equal(calls[4][0], `${API_URL}/saas/clinicas/9/mensualidades`);
  assert.deepEqual(['page', 'size'].map(key => calls[4][1].params.get(key)), ['4', '10']);
  assert.equal(api.changePlan, undefined);
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

test('explicit activation allows grandfathered TRIAL to PRO, preserves trial history, updates row and refreshes histories', async t => {
  const { component: c, calls } = fixture(t);
  await wait();
  const original = clinic(1);
  calls.list[0].response.next(page([original]));
  c.selectClinic(original);
  c.submit();
  assert.equal(calls.mutations.length, 0);
  c.form.patchValue(billingValues);
  assert.equal(calls.mutations.length, 0);
  c.submit(); c.submit(); c.search('ignored'); c.selectClinic(clinic(2));
  assert.equal(calls.mutations.length, 1);
  assert.equal(c.selected().id, 1);
  assert.equal(c.form.disabled, true);
  assert.equal(calls.mutations[0].kind, 'monthly');
  assert.deepEqual(calls.mutations[0].args, [1, { plan: 'PRO', operation: 'ACTIVATE', reason: 'Manual payment verified',
    paymentReference: 'BCP-2026-11-12345', paymentConfirmed: true, expectedPaymentId: null }]);
  const updated = paidClinic(1);
  calls.mutations[0].response.next(updated);
  assert.equal(c.clinics().items[0], updated);
  assert.equal(c.selected().plan.trialEndsAt, original.plan.trialEndsAt);
  assert.equal(c.selected().estado, 'ACTIVA');
  assert.equal(c.form.controls.reason.value, '');
  assert.ok(c.success());
  assert.equal(c.saving(), false);
  assert.deepEqual(calls.audit.at(-1).args, [1, 0, 10]);
  assert.deepEqual(calls.payments.at(-1).args, [1, 0, 10]);
  assert.equal(c.form.controls.paymentReference.value, '');
  assert.equal(c.form.controls.paymentConfirmed.value, false);
  assert.equal(c.operation(), 'RENEW');
});

test('409 keeps the plan reason; a state change requires a new reason and explicit submission', async t => {
  const { component: c, calls } = fixture(t);
  c.selectClinic(clinic(1));
  c.form.patchValue({ ...billingValues, plan: 'CONSULTORIO', reason: 'Capacity review' });
  c.submit();
  calls.mutations[0].response.error(new HttpErrorResponse({ status: 409, error: { message: 'Over target' } }));
  assert.match(c.mutationError(), /409/);
  assert.match(c.mutationError(), /Over target/);
  assert.equal(c.selected().plan.plan, 'TRIAL');
  assert.equal(c.form.controls.reason.value, 'Capacity review');
  assert.equal(c.saving(), false);
  assert.equal(c.success(), '');
  c.selectEstado('SUSPENDIDA');
  assert.equal(c.form.controls.reason.value, '');
  assert.equal(c.form.controls.paymentReference.value, '');
  assert.equal(c.form.controls.paymentConfirmed.value, false);
  c.submit();
  assert.equal(calls.mutations.length, 1);
  c.form.controls.reason.setValue('Operational suspension'); c.submit();
  assert.equal(calls.mutations[1].kind, 'estado');
  assert.deepEqual(calls.mutations[1].args, [1, 'SUSPENDIDA', 'Operational suspension']);
});

test('state cards only select valid changes and never execute them immediately', t => {
  const { component: c, calls } = fixture(t);
  c.selectClinic(clinic(1));
  c.form.controls.reason.setValue('Plan-only reason');
  c.selectEstado('ACTIVA');
  assert.equal(c.operation(), 'ACTIVATE');
  assert.equal(c.form.controls.reason.value, 'Plan-only reason');
  c.selectEstado('SUSPENDIDA');
  assert.equal(c.operation(), 'estado');
  assert.equal(c.form.controls.estado.value, 'SUSPENDIDA');
  assert.equal(c.form.controls.reason.value, '');
  assert.equal(calls.mutations.length, 0);
  c.form.controls.reason.setValue('State-only reason');
  c.setOperation('ACTIVATE');
  assert.equal(c.form.controls.reason.value, '');
  c.form.controls.reason.setValue('Keep while submitting');
  c.saving.set(true);
  c.selectEstado('SUSPENDIDA');
  c.setOperation('estado');
  assert.equal(c.operation(), 'ACTIVATE');
  assert.equal(c.form.controls.reason.value, 'Keep while submitting');
});

test('display helpers use real identity and translate audit actions without inventing data', t => {
  const { component: c } = fixture(t);
  assert.equal(c.initials('  Operador   PetCare  '), 'OP');
  assert.equal(c.initials('Veterinaria Los Andes'), 'VL');
  assert.equal(c.initials(null), 'PC');
  assert.equal(c.initials('   '), 'PC');
  assert.equal(c.auditLabel({ action: 'PLAN_CHANGED' }), 'Cambio de plan');
  assert.equal(c.auditLabel({ action: 'ESTADO_CHANGED', newEstado: 'SUSPENDIDA' }), 'Suspensi\u00f3n');
  assert.equal(c.auditLabel({ action: 'ESTADO_CHANGED', newEstado: 'ACTIVA' }), 'Reactivaci\u00f3n');
  assert.equal(c.auditLabel({ action: 'ESTADO_CHANGED', newEstado: null }), 'Cambio de estado');
  assert.equal(c.auditLabel({ action: 'FUTURE_ACTION' }), 'FUTURE_ACTION');
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
  c.form.patchValue(billingValues); c.submit();
  destroy();
  assert.equal(calls.list[0].response.observed, false);
  assert.equal(calls.audit[0].response.observed, false);
  assert.equal(calls.payments[0].response.observed, false);
  assert.equal(calls.mutations[0].response.observed, false);
  calls.mutations[0].response.next(clinic(99));
  assert.equal(c.selected().id, 1);
});

test('payment references require 5..120 normalized characters and reject controls even at trimmed edges', () => {
  for (const value of ['', '    ', 'abcd', 'X'.repeat(121), 'BCP@123', '\nBCP-123', 'BCP-123\t', 'BCP\x7f123']) {
    assert.ok(paymentReferenceValidator({ value }), JSON.stringify(value));
  }
  for (const value of [' abcde ', 'bcp-2026-11-12345', 'BCP 2026.11_123/45', 'X'.repeat(120)]) {
    assert.equal(paymentReferenceValidator({ value }), null, value);
  }
});

test('billing requires reference, explicit checkbox and a valid reason; invalid submissions never call API', t => {
  const { component: c, calls } = fixture(t);
  c.selectClinic(clinic(1));
  c.form.patchValue({ reason: 'Valid reason' }); c.submit();
  assert.equal(c.form.controls.paymentReference.touched, true);
  assert.equal(c.form.controls.paymentConfirmed.touched, true);
  c.form.controls.paymentReference.setValue('BCP-12345'); c.submit();
  assert.equal(calls.mutations.length, 0);
  c.form.controls.paymentConfirmed.setValue(true);
  for (const reason of ['    ', 'four', 'x'.repeat(501)]) {
    c.form.controls.reason.setValue(reason); c.submit();
  }
  assert.equal(calls.mutations.length, 0);
  c.form.controls.reason.setValue(' abcde '); c.submit();
  assert.equal(calls.mutations.length, 1);
});

test('active paid coverage only renews the same plan, never restarts or changes it', t => {
  const { component: c, calls } = fixture(t);
  c.selectClinic(paidClinic(1));
  assert.equal(c.operation(), 'RENEW');
  c.setOperation('ACTIVATE'); c.selectPlan('CONSULTORIO');
  assert.equal(c.operation(), 'RENEW');
  assert.equal(c.form.controls.plan.value, 'PRO');
  c.form.patchValue({ ...billingValues, plan: 'CONSULTORIO' }); c.submit();
  assert.equal(calls.mutations.length, 0);
  c.form.controls.plan.setValue('PRO');
  assert.equal(c.hasChange(), true);
  c.submit(); c.submit(); c.clearSelection(); c.loadList(1); c.loadPayments(1); c.loadAudit(1);
  assert.equal(calls.mutations.length, 1);
  assert.equal(c.selected().id, 1);
  assert.deepEqual(calls.mutations[0].args[1], { plan: 'PRO', operation: 'RENEW', reason: 'Manual payment verified',
    paymentReference: 'BCP-2026-11-12345', paymentConfirmed: true, expectedPaymentId: 71 });
  assert.equal(calls.audit.length, 1);
  assert.equal(calls.payments.length, 1);
});

test('expired coverage can renew or activate only as permitted by the server', t => {
  const { component: c, calls } = fixture(t);
  const expired = paidClinic(1);
  expired.plan = { ...expired.plan, status: 'SUBSCRIPTION_EXPIRED', readOnly: true, canActivate: true, subscriptionDaysRemaining: 0 };
  c.selectClinic(expired);
  c.setOperation('RENEW');
  c.form.patchValue(billingValues); c.submit();
  assert.equal(calls.mutations[0].args[1].operation, 'RENEW');
  const updated = { ...expired, plan: { ...expired.plan, status: 'ACTIVE', readOnly: false,
    subscriptionStartedAt: '2027-01-31T05:00:00Z', subscriptionEndsAt: '2027-02-28T05:00:00Z',
    lastPaymentId: 72, subscriptionDaysRemaining: 28, canActivate: false } };
  calls.mutations[0].response.next(updated);
  assert.equal(c.selected().plan.subscriptionEndsAt, '2027-02-28T05:00:00Z');
  assert.equal(c.selected().plan.daysRemaining, expired.plan.daysRemaining);
  assert.equal(c.selected().plan.trialStartedAt, expired.plan.trialStartedAt);
  assert.equal(c.selected().plan.trialEndsAt, expired.plan.trialEndsAt);
});

test('uncertain retries preserve reference, payload and captured expectedPaymentId instead of reading the latest selection', t => {
  const { component: c, calls } = fixture(t);
  c.selectClinic(paidClinic(1));
  c.form.patchValue(billingValues); c.submit();
  const original = calls.mutations[0].args;
  calls.mutations[0].response.error(new HttpErrorResponse({ status: 0 }));
  assert.match(c.mutationError(), /incierto/);
  assert.match(c.mutationError(), /pagos y auditor/);
  assert.match(c.mutationError(), /misma referencia/);
  assert.equal(c.form.controls.paymentConfirmed.value, true);
  c.loadPayments(0); c.loadAudit(0);
  c.selected.update(value => ({ ...value, plan: { ...value.plan, lastPaymentId: 99 } }));
  c.submit();
  assert.deepEqual(calls.mutations[1].args, original);
  assert.equal(calls.mutations[1].args[1].expectedPaymentId, 71);
  assert.equal(c.success(), '');
});

test('410 retirement stays visible, preserves input and never falls back to the retired endpoint', t => {
  const { component: c, calls } = fixture(t);
  c.selectClinic(clinic(1)); c.form.patchValue(billingValues); c.submit();
  calls.mutations[0].response.error(new HttpErrorResponse({ status: 410, error: { code: 'MONTHLY_PAYMENT_REQUIRED' } }));
  assert.match(c.mutationError(), /410 MONTHLY_PAYMENT_REQUIRED/);
  assert.equal(c.saving(), false);
  assert.equal(c.form.enabled, true);
  assert.equal(c.form.controls.paymentReference.value, billingValues.paymentReference);
  assert.equal(calls.mutations.length, 1);
  assert.equal(c.selected().plan.plan, 'TRIAL');
});

test('server failures are uncertain and reference conflicts do not optimistically grant coverage', t => {
  const { component: c, calls } = fixture(t);
  const original = clinic(1);
  c.selectClinic(original); c.form.patchValue(billingValues); c.submit();
  calls.mutations[0].response.error(new HttpErrorResponse({ status: 503 }));
  assert.match(c.mutationError(), /incierto/);
  c.submit();
  calls.mutations[1].response.error(new HttpErrorResponse({ status: 409, error: { message: 'Reference already used' } }));
  assert.match(c.mutationError(), /409/);
  assert.match(c.mutationError(), /Reference already used/);
  assert.equal(c.selected(), original);
  assert.equal(c.form.controls.paymentConfirmed.value, true);
  assert.equal(c.success(), '');
});

test('switching billing operation, target or administrative state clears attestations and reasons', t => {
  const { component: c, calls } = fixture(t);
  const expired = paidClinic(1); expired.plan.canActivate = true;
  c.selectClinic(expired); c.form.patchValue(billingValues);
  c.setOperation('RENEW');
  assert.equal(c.form.controls.reason.value, '');
  assert.equal(c.form.controls.paymentReference.value, '');
  assert.equal(c.form.controls.paymentConfirmed.value, false);
  c.form.patchValue(billingValues); c.selectPlan('CONSULTORIO');
  assert.equal(c.operation(), 'ACTIVATE');
  assert.equal(c.form.controls.reason.value, '');
  assert.equal(c.form.controls.paymentConfirmed.value, false);
  c.form.patchValue(billingValues); c.selectEstado('SUSPENDIDA');
  assert.equal(c.form.controls.paymentReference.value, '');
  assert.equal(c.form.controls.paymentConfirmed.value, false);
  assert.equal(c.form.controls.reason.value, '');
  c.form.controls.reason.setValue('Administrative reason'); c.submit();
  assert.deepEqual(calls.mutations[0].args, [1, 'SUSPENDIDA', 'Administrative reason']);
  assert.equal(calls.mutations[0].kind, 'estado');
  calls.mutations[0].response.error(new HttpErrorResponse({ status: 0 }));
  assert.match(c.mutationError(), /incierto/);
  assert.match(c.mutationError(), /auditor/);
  assert.doesNotMatch(c.mutationError(), /referencia|idempotente/);
});

test('recording a monthly payment does not unsuspend a clinic or discard trial history', t => {
  const { component: c, calls } = fixture(t);
  const suspended = { ...clinic(1), estado: 'SUSPENDIDA' };
  suspended.plan = { ...suspended.plan, status: 'SUSPENDED', readOnly: true };
  c.selectClinic(suspended); c.form.patchValue(billingValues); c.submit();
  const updated = { ...paidClinic(1), estado: 'SUSPENDIDA' };
  updated.plan = { ...updated.plan, status: 'SUSPENDED', readOnly: true };
  calls.mutations[0].response.next(updated);
  assert.equal(c.selected().estado, 'SUSPENDIDA');
  assert.equal(c.selected().plan.readOnly, true);
  assert.equal(c.selected().plan.trialEndsAt, suspended.plan.trialEndsAt);
});

test('payment history is paginated, retryable, scoped to selection and canceled on navigation', t => {
  const { component: c, calls } = fixture(t);
  c.selectClinic(clinic(1)); c.selectClinic(clinic(2));
  assert.equal(calls.payments[0].response.observed, false);
  calls.payments[0].response.next(page([{ id: 999 }]));
  assert.equal(c.payments(), null);
  calls.payments[1].response.error(new Error('offline'));
  assert.ok(c.paymentsError());
  assert.equal(c.paymentsLoading(), false);
  c.loadPayments(); calls.payments[2].response.next(page([], 0));
  assert.equal(c.paymentsError(), '');
  c.loadPayments(2);
  assert.deepEqual(calls.payments[3].args, [2, 2, 10]);
  const payment = { id: 72, amount: 59, currency: 'PEN', billingCycle: 'MONTHLY', paymentReference: 'BCP-12345',
    periodStartedAt: '2027-02-28T05:00:00Z', periodEndsAt: '2027-03-31T05:00:00Z', anchorDay: 31 };
  calls.payments[3].response.next(page([payment], 2));
  assert.equal(c.payments().items[0], payment);
  assert.equal(c.payments().page, 2);
  c.clearSelection();
  assert.equal(calls.payments[3].response.observed, false);
  assert.equal(c.payments(), null);
});

test('audit supports monthly snapshots and preserves old plan/state actions', t => {
  const { component: c, calls } = fixture(t);
  assert.equal(c.auditLabel({ action: 'MONTHLY_ACTIVATED' }), 'Activaci\u00f3n mensual');
  assert.equal(c.auditLabel({ action: 'MONTHLY_RENEWED' }), 'Renovaci\u00f3n mensual');
  assert.equal(c.auditLabel({ action: 'PLAN_CHANGED' }), 'Cambio de plan');
  c.selectClinic(clinic(1));
  const entry = { id: 9, action: 'MONTHLY_RENEWED', monthlyPayment: { id: 72, amount: 129, currency: 'PEN' } };
  calls.audit[0].response.next(page([entry]));
  assert.equal(c.audit().items[0], entry);
  const html = fs.readFileSync(path.join(__dirname, '../src/app/pages/saas/saas-clinicas.component.html'), 'utf8');
  assert.match(html, /entry\.monthlyPayment/);
  for (const field of ['amount', 'currency', 'paymentReference', 'periodStartedAt', 'periodEndsAt', 'anchorDay', 'confirmedAt',
    'actorId', 'actorEmail', 'previousPaymentId', 'auditId', 'reason']) assert.ok(html.includes(`payment.${field}`), field);
  assert.equal(fs.statSync(path.join(__dirname, '../src/app/pages/saas/saas-clinicas.component.css')).size < 4096, true);
});

test('status copy distinguishes trial expiry, monthly expiry, missing payment and suspension, retaining read access', () => {
  const { planStatusLabel, planStatusMessage } = source('pages/mi-plan/plan-status.ts');
  const statuses = ['TRIAL', 'EXPIRED', 'ACTIVE', 'READ_ONLY', 'SUSPENDED', 'PAYMENT_PENDING', 'SUBSCRIPTION_EXPIRED'];
  assert.equal(new Set(statuses.map(planStatusLabel)).size, 7);
  assert.match(planStatusMessage('EXPIRED'), /prueba de 14/);
  assert.match(planStatusMessage('SUBSCRIPTION_EXPIRED'), /cobertura mensual/);
  assert.match(planStatusMessage('PAYMENT_PENDING'), /No hay un registro de pago/);
  assert.match(planStatusMessage('SUSPENDED'), /pago no la reactiva/);
  const plan = fs.readFileSync(path.join(__dirname, '../src/app/pages/mi-plan/mi-plan.component.ts'), 'utf8');
  const layout = fs.readFileSync(path.join(__dirname, '../src/app/layouts/main-layout/main-layout.component.ts'), 'utf8');
  for (const text of [plan, layout]) {
    assert.match(text, /subscriptionStartedAt/); assert.match(text, /subscriptionEndsAt/);
    assert.match(text, /trialEndsAt/); assert.match(text, /conserva/);
  }
});

test('ISO Z coverage dates display in Lima without computing a monthly expiry in the browser', () => {
  const { formatPlanDate } = source('pages/mi-plan/plan-date.ts');
  assert.match(formatPlanDate('2027-02-01T02:00:00Z'), /31 de enero de 2027/);
  assert.equal(formatPlanDate('2027-02-01T02:00:00Z'), formatPlanDate('2027-02-01T02:00:00'));
  assert.equal(formatPlanDate(null), 'No disponible');
  assert.equal(formatPlanDate('invalid'), 'No disponible');
  for (const relative of ['pages/saas/saas-clinicas.component.ts', 'pages/mi-plan/mi-plan.component.ts']) {
    assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../src/app', relative), 'utf8'), /setMonth|setDate|Date\.now|new Date/);
  }
});

test('public monthly-only contract preserves exact prices, capacities and 14-day trial with manual activation', () => {
  const { PlansComponent } = source('pages/public/plans/plans.component.ts');
  const c = new PlansComponent();
  assert.deepEqual(c.plans.map(p => [p.name, p.monthly, p.staff, p.pets]), [['Consultorio', 59, 2, 500], ['PRO', 129, 5, 2500]]);
  const html = fs.readFileSync(path.join(__dirname, '../src/app/pages/public/plans/plans.component.html'), 'utf8');
  const copy = html + JSON.stringify(c.faqs);
  assert.doesNotMatch(copy, /\bannual\b|\banual\b|annualPrice|590|1,290|1290|IGV/i);
  assert.match(copy, /14/);
  assert.match(copy, /operador/);
  assert.match(copy, /manualmente/);
  assert.match(copy, /No hay checkout/);
  assert.match(copy, /no emite comprobantes fiscales ni calcula impuestos o recargos/i);
  assert.doesNotMatch(html, /billing-switch/);
});

test('font-failure containment bounds only decorative icon boxes, not the page or its controls', () => {
  for (const [relative, scope] of [
    ['pages/public/plans/plans.component.css', 'plans-page'],
    ['pages/auth/login/login.component.css', 'login-page'],
    ['pages/saas/saas-clinicas.component.css', 'operator-shell']
  ]) {
    const css = fs.readFileSync(path.join(__dirname, '../src/app', relative), 'utf8');
    // These are Angular component stylesheets, not global icon rules.
    const iconRule = css.match(new RegExp(`(?:\\.${scope} )?\\.material-symbols-outlined\\s*\\{([^}]+)\\}`));
    assert.ok(iconRule, relative);
    for (const declaration of [/width:\s*1em\s*;/, /flex-shrink:\s*0\s*;/,
      /overflow:\s*hidden\s*;/, /white-space:\s*nowrap\s*;/]) assert.match(iconRule[1], declaration);
    if (scope === 'operator-shell') assert.match(iconRule[1], /box-sizing:\s*content-box\s*;/);
    const pageRule = css.match(new RegExp(`\\.${scope}\\s*\\{([^}]+)\\}`));
    if (pageRule) assert.doesNotMatch(pageRule[1], /overflow(?:-x)?:\s*(?:hidden|clip)/);
  }
});
