const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Run the actual component classes with Angular forms and injected service mocks.
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
  });
  module._compile(result.outputText, filename);
};
require('@angular/compiler');
const { Injector, runInInjectionContext, signal } = require('@angular/core');
const { FormBuilder } = require('@angular/forms');
const { Router, ActivatedRoute } = require('@angular/router');
const { Subject } = require('rxjs');
const source = relative => require(path.join(__dirname, '../src/app', relative));
const { AtencionClinicaComponent } = source('pages/atencion-clinica/atencion-clinica.component.ts');
const { CitaCreateComponent } = source('pages/citas/create/cita-create.component.ts');
const { MainLayoutComponent } = source('layouts/main-layout/main-layout.component.ts');
const { UsuariosComponent } = source('pages/usuarios/usuarios.component.ts');
const { ProfileComponent } = source('pages/profile/profile.component.ts');
const services = Object.fromEntries([
  ['AuthService', 'auth'], ['CitaService', 'cita'], ['AtencionClinicaService', 'atencion-clinica'],
  ['DuenioService', 'duenio'], ['MascotaService', 'mascota'], ['VeterinarioService', 'veterinario'],
  ['ServicioService', 'servicio'], ['NotificacionService', 'notificacion'], ['UsuarioService', 'usuario']
].map(([name, file]) => [name, source(`core/services/${file}.service.ts`)[name]]));

const appointment = (id = 1) => ({ id, mascotaId: id + 100, estado: 'PROGRAMADA' });
const finish = (call, value) => { call.response.next(value); call.response.complete(); };

function fixture(t, Component = AtencionClinicaComponent, roles = ['ROLE_ADMIN']) {
  const calls = {};
  const request = name => (...args) => {
    const response = new Subject();
    (calls[name] ??= []).push({ args, response });
    return response;
  };
  const sessionUser = signal({ id: 10, fullName: 'Pilot Admin', email: 'pilot@example.test', telefono: '+51 999999999',
    roles, active: true, forcePasswordChange: false, clinica: { id: 2, nombre: 'Pilot Clinic' } });
  const auth = {
    user: sessionUser, roles: () => sessionUser()?.roles ?? [],
    isDuenioOnly: () => auth.isDuenio() && !auth.isAdmin() && !auth.isVeterinario() && !auth.isAsistente(),
    isAdmin: () => auth.roles().includes('ROLE_ADMIN'), isDuenio: () => auth.roles().includes('ROLE_DUENIO'),
    isVeterinario: () => auth.roles().includes('ROLE_VETERINARIO'), isAsistente: () => auth.roles().includes('ROLE_ASISTENTE'),
    isSaasOperator: () => auth.roles().includes('ROLE_SAAS_OPERATOR'),
    me: request('me'), createInternalUser: request('internalCreate'),
    updateSessionUser: user => { (calls.sessionUpdates ??= []).push(user); sessionUser.set(user); }
  };
  const api = {
    AuthService: auth,
    CitaService: { findAll: request('citas'), findById: request('cita'), create: request('create') },
    AtencionClinicaService: { register: request('register'), findHistoriaClinica: request('history') },
    DuenioService: { findAll: request('duenios'), findOwn: request('own'), update: request('ownerUpdate') },
    MascotaService: { findAll: request('mascotas') },
    VeterinarioService: { findAll: request('veterinarios'), getDisponibilidad: request('slots') },
    ServicioService: { findAll: request('servicios'), calcularCosto: request('cost') },
    NotificacionService: {},
    UsuarioService: { findAll: request('users'), update: request('userUpdate'), updateRoles: request('rolesUpdate'),
      toggleActive: request('userActive'), delete: request('userDelete') }
  };
  const navigations = [];
  const router = { navigate: args => navigations.push(args) };
  const queryParams = new Subject();
  const injector = Injector.create({ providers: [
    ...Object.entries(api).map(([name, value]) => ({ provide: services[name], useValue: value })),
    { provide: FormBuilder, useValue: new FormBuilder() },
    { provide: Router, useValue: router }, { provide: ActivatedRoute, useValue: { queryParams } }
  ] });
  const c = runInInjectionContext(injector, () => Component === MainLayoutComponent
    ? new MainLayoutComponent(auth, api.NotificacionService, router) : new Component());
  const destroy = () => { if (!injector.destroyed) injector.destroy(); };
  t.after(destroy);
  return { c, calls, api, queryParams, navigations, destroy, sessionUser };
}

function clinicalReady(c) {
  c.selectCita(appointment());
  c.atencionForm.patchValue({ motivo: ' Consulta ', diagnostico: ' Hallazgos ', tratamiento: ' Plan manual ',
    observacionesClinicas: ' Observaciones manuales ', recomendaciones: ' Recomendaciones ',
    notasInternas: ' Notas ', estadoMascota: 'EN_OBSERVACION' });
}

function wizardReady(c) {
  c.selectedDuenio.set({ id: 1 }); c.selectedMascota.set({ id: 2 });
  c.selectedVeterinarioId.set(3); c.selectedFecha.set('2026-11-05'); c.selectedHora.set('10:00');
  c.motivo = 'Consulta'; c.currentStep.set(8);
  c.selectedServicios.set([{ servicioId: 4, nombre: 'Consulta', cantidad: 1 }]);
}

test('clinical request appends all medications and labeled vitals, preserving manual text and request shape', t => {
  const { c, calls } = fixture(t); clinicalReady(c);
  c.medications.set([{ medicamento: ' Med A ', dosis: ' 2 mg ', frecuencia: ' cada 8 h ' },
    { medicamento: 'Med B', dosis: '1 ml', frecuencia: 'cada 12 h' },
    { medicamento: ' ', dosis: '', frecuencia: ' ' }]);
  c.atencionForm.patchValue({ pesoKg: 0.01, temperatura: 0.1, frecuenciaCardiaca: 1 });
  c.onSubmit();
  const [id, req] = calls.register[0].args;
  assert.equal(id, 1);
  assert.equal(req.tratamiento, ' Plan manual \n\nMedicamentos:\n- Med A; Dosis: 2 mg; Frecuencia: cada 8 h\n- Med B; Dosis: 1 ml; Frecuencia: cada 12 h');
  assert.equal(req.observacionesClinicas, ' Observaciones manuales \n\nConstantes vitales:\nPeso: 0.01 kg\nTemperatura: 0.1 \u00b0C\nFrecuencia cardiaca: 1 lpm');
  assert.equal(req.motivo, ' Consulta '); assert.equal(req.diagnostico, ' Hallazgos ');
  assert.equal(req.recomendaciones, ' Recomendaciones '); assert.equal(req.notasInternas, ' Notas ');
  assert.deepEqual(Object.keys(req).sort(), ['motivo', 'diagnostico', 'tratamiento', 'recomendaciones', 'observacionesClinicas', 'notasInternas', 'estadoMascota'].sort());
  assert.equal(c.atencionForm.controls.tratamiento.value, ' Plan manual ');
  assert.ok(req.tratamiento.length <= 1000 && req.observacionesClinicas.length <= 1000);
});

test('empty medication rows and absent vitals add no headings or invented measurements', t => {
  const { c, calls } = fixture(t); clinicalReady(c); c.addMedication();
  c.onSubmit();
  assert.equal(calls.register[0].args[1].tratamiento, ' Plan manual ');
  assert.equal(calls.register[0].args[1].observacionesClinicas, ' Observaciones manuales ');
});

test('each partially filled medication combination is rejected before HTTP without clearing the row', t => {
  const { c, calls } = fixture(t); clinicalReady(c);
  for (const row of [
    { medicamento: 'A', dosis: '', frecuencia: '' }, { medicamento: '', dosis: '1 mg', frecuencia: '' },
    { medicamento: '', dosis: '', frecuencia: 'cada 8 h' }, { medicamento: 'A', dosis: '1 mg', frecuencia: ' ' },
    { medicamento: '', dosis: '1 mg', frecuencia: 'cada 8 h' }, { medicamento: 'A', dosis: '', frecuencia: 'cada 8 h' }
  ]) {
    c.medications.set([row]); c.onSubmit();
    assert.match(c.submitError(), /nombre, dosis y frecuencia/);
    assert.equal(c.medications()[0], row); assert.equal(c.saving(), false);
  }
  assert.equal(calls.register, undefined);
});

test('all clinical text controls enforce backend limits and required text rejects whitespace', t => {
  const { c, calls } = fixture(t); clinicalReady(c);
  for (const [field, limit] of Object.entries({ motivo: 250, diagnostico: 1000, tratamiento: 1000,
    recomendaciones: 1000, observacionesClinicas: 1000, notasInternas: 1000 })) {
    const control = c.atencionForm.controls[field]; const original = control.value;
    control.setValue('x'.repeat(limit)); assert.equal(control.valid, true, field);
    control.setValue('x'.repeat(limit + 1)); assert.equal(control.hasError('maxlength'), true, field);
    c.onSubmit(); assert.ok(c.invalidFields().length); assert.equal(calls.register, undefined);
    control.setValue(original);
  }
  for (const field of ['motivo', 'diagnostico', 'tratamiento']) {
    c.atencionForm.controls[field].setValue('   '); assert.equal(c.atencionForm.controls[field].invalid, true);
  }
});

test('optional vitals reject non-finite, non-positive, too-small weights and fractional heart rates', t => {
  const { c, calls } = fixture(t); clinicalReady(c);
  for (const [field, invalid] of Object.entries({ pesoKg: [0, -1, 0.009, NaN, Infinity, -Infinity],
    temperatura: [0, -1, NaN, Infinity], frecuenciaCardiaca: [0, -1, 1.5, NaN, Infinity] })) {
    const control = c.atencionForm.controls[field];
    for (const value of invalid) {
      control.setValue(value); assert.equal(control.invalid, true, `${field}: ${value}`);
      c.onSubmit(); assert.equal(calls.register, undefined);
    }
    control.setValue(null); assert.equal(control.valid, true);
  }
});

test('composed treatment accepts exactly 1000 characters but rejects 1001 without truncation', t => {
  const { c, calls } = fixture(t); clinicalReady(c);
  c.medications.set([{ medicamento: 'A', dosis: '1 mg', frecuencia: 'cada 8 h' }]);
  const suffix = '\n\nMedicamentos:\n- A; Dosis: 1 mg; Frecuencia: cada 8 h';
  const base = 'x'.repeat(1000 - suffix.length);
  c.atencionForm.controls.tratamiento.setValue(base + 'x'); c.onSubmit();
  assert.equal(calls.register, undefined); assert.match(c.submitError(), /1000/);
  assert.equal(c.atencionForm.controls.tratamiento.value, base + 'x');
  c.atencionForm.controls.tratamiento.setValue(base); c.onSubmit();
  assert.equal(calls.register[0].args[1].tratamiento, base + suffix);
});

test('composed observations accept exactly 1000 characters and reject overflow without losing notes', t => {
  const { c, calls } = fixture(t); clinicalReady(c);
  c.atencionForm.controls.pesoKg.setValue(12);
  const suffix = '\n\nConstantes vitales:\nPeso: 12 kg';
  const base = 'x'.repeat(1000 - suffix.length);
  c.atencionForm.controls.observacionesClinicas.setValue(base + 'x'); c.onSubmit();
  assert.equal(calls.register, undefined); assert.match(c.submitError(), /1000/);
  assert.equal(c.atencionForm.controls.observacionesClinicas.value, base + 'x');
  c.atencionForm.controls.observacionesClinicas.setValue(base); c.onSubmit();
  assert.equal(calls.register[0].args[1].observacionesClinicas, base + suffix);
});

for (const status of [400, 403, 0]) {
  test(`clinical save ${status} is visible, releases saving, retains all values and allows a clean retry`, t => {
    const { c, calls, navigations } = fixture(t); clinicalReady(c);
    const row = { medicamento: 'A', dosis: '1 mg', frecuencia: 'cada 8 h' };
    c.medications.set([row]); c.atencionForm.controls.pesoKg.setValue(12);
    const original = c.atencionForm.getRawValue();
    c.onSubmit(); c.onSubmit(); c.selectCita(appointment(2)); c.clearSelection();
    assert.equal(calls.register.length, 1); assert.equal(c.selectedCita().id, 1);
    calls.register[0].response.error({ status });
    assert.equal(c.saving(), false); assert.ok(c.submitError());
    assert.deepEqual(c.atencionForm.getRawValue(), original); assert.equal(c.medications()[0], row);
    assert.deepEqual(navigations, []);
    c.onSubmit(); assert.equal(calls.register.length, 2);
    assert.deepEqual(calls.register[1].args, calls.register[0].args);
  });
}

test('successful clinical save clears the selection, releases saving and refreshes both pending states', t => {
  const { c, calls } = fixture(t); clinicalReady(c); c.onSubmit();
  calls.register[0].response.next({ id: 1 });
  assert.equal(c.saving(), false); assert.equal(c.selectedCita(), null);
  assert.equal(calls.history[0].response.observed, false);
  assert.deepEqual(calls.citas.map(call => call.args), [[{ estado: 'PROGRAMADA' }], [{ estado: 'CONFIRMADA' }]]);
  finish(calls.citas[0], []); finish(calls.citas[1], []); assert.equal(c.loading(), false);
});

test('clinical appointment load failures release loaders, show errors and can be retried', t => {
  const { c, calls, queryParams } = fixture(t); c.ngOnInit(); queryParams.next({ citaId: '2' });
  assert.equal(calls.cita, undefined);
  finish(calls.citas[0], [appointment(1)]); calls.citas[1].response.error({ status: 0 });
  assert.equal(c.loading(), false); assert.ok(c.loadError());
  c.loadCitas(2); finish(calls.citas[2], []); finish(calls.citas[3], [{ ...appointment(2), estado: 'CONFIRMADA' }]);
  assert.equal(c.loadError(), ''); assert.equal(c.loading(), false); assert.equal(c.selectedCita().id, 2);
});

test('switching and clearing pets cancel history, erase old notes immediately and expose retryable failures', t => {
  const { c, calls } = fixture(t); c.selectCita(appointment(1));
  calls.history[0].response.next({ atenciones: [{ motivo: 'Pet 1 notes' }] });
  c.selectCita(appointment(2));
  assert.equal(c.historiaClinica(), null); assert.equal(calls.history[0].response.observed, false);
  calls.history[0].response.next({ atenciones: [{ motivo: 'Stale notes' }] });
  assert.equal(c.historiaClinica(), null);
  calls.history[1].response.error({ status: 403 });
  assert.equal(c.historyLoading(), false); assert.ok(c.historyError());
  c.loadHistoriaClinica(); assert.deepEqual(calls.history[2].args, [102]);
  c.clearSelection(); assert.equal(calls.history[2].response.observed, false);
  assert.equal(c.historiaClinica(), null); assert.equal(c.historyLoading(), false);
});

test('wizard initial data failures are visible and independently retryable; owner loader always releases', t => {
  const { c, calls } = fixture(t, CitaCreateComponent); c.ngOnInit();
  for (const key of ['duenios', 'veterinarios', 'servicios']) calls[key][0].response.error({ status: 0 });
  assert.equal(c.loadingDuenios(), false); assert.equal(c.loadErrorEntries().length, 3);
  for (const key of ['duenios', 'veterinarios', 'servicios']) {
    c.retryLoad(key); finish(calls[key][1], []);
  }
  assert.equal(c.loadErrorEntries().length, 0); assert.equal(c.loadingDuenios(), false);
});

test('owner-only wizard loads only the own profile and reports its failure', t => {
  const { c, calls } = fixture(t, CitaCreateComponent, ['ROLE_DUENIO']); c.ngOnInit();
  assert.equal(calls.duenios, undefined); calls.own[0].response.error({ status: 403 });
  assert.equal(c.loadingDuenios(), false); assert.ok(c.loadErrors().duenios);
  c.retryLoad('duenios'); finish(calls.own[1], { id: 7 });
  assert.equal(c.selectedDuenio().id, 7); assert.deepEqual(calls.mascotas[0].args, [undefined, 7, true]);
});

test('wizard pet and slot loads cancel stale selections and release failed loaders with retry', t => {
  const { c, calls } = fixture(t, CitaCreateComponent);
  c.selectDuenio({ id: 1 }); c.selectDuenio({ id: 2 });
  assert.equal(calls.mascotas[0].response.observed, false);
  calls.mascotas[0].response.next([{ id: 99 }]); assert.deepEqual(c.mascotasDelDuenio(), []);
  calls.mascotas[1].response.error({ status: 0 }); assert.equal(c.loadingMascotas(), false);
  assert.ok(c.loadErrors().mascotas); c.retryLoad('mascotas'); finish(calls.mascotas[2], [{ id: 2 }]);
  c.selectedVeterinarioId.set(1); c.selectedFecha.set('2026-11-05'); c.onFechaChange();
  c.selectedFecha.set('2026-11-06'); c.onFechaChange(); assert.equal(calls.slots[0].response.observed, false);
  calls.slots[0].response.next({ horariosDisponibles: ['09:00'] }); assert.deepEqual(c.availableSlots(), []);
  calls.slots[1].response.error({ status: 400 }); assert.equal(c.loadingSlots(), false); assert.ok(c.loadErrors().horarios);
  c.retryLoad('horarios'); finish(calls.slots[2], { horariosDisponibles: ['11:00'] });
  assert.deepEqual(c.availableSlots(), ['11:00']); assert.equal(c.loadErrors().horarios, '');
});

test('wizard cost failures clear the previous estimate, surface an error and permit retry', t => {
  const { c, calls } = fixture(t, CitaCreateComponent); wizardReady(c);
  c.costoCalculado.set({ total: 20 }); c.calcularCosto();
  assert.equal(c.costoCalculado(), null); calls.cost[0].response.error({ status: 400 });
  assert.ok(c.loadErrors().costo); c.retryLoad('costo'); finish(calls.cost[1], { total: 30 });
  assert.equal(c.costoCalculado().total, 30); assert.equal(c.loadErrors().costo, '');
});

for (const status of [400, 403, 0]) {
  test(`wizard save ${status} stays on the confirmation step, preserves values and prevents duplicates`, t => {
    const { c, calls, navigations } = fixture(t, CitaCreateComponent); wizardReady(c);
    c.submitCita(); c.submitCita(); c.prevStep(); c.cancel();
    assert.equal(calls.create.length, 1); assert.equal(c.currentStep(), 8); assert.deepEqual(navigations, []);
    calls.create[0].response.error({ status }); assert.equal(c.saving(), false); assert.ok(c.submitError);
    assert.equal(c.motivo, 'Consulta'); assert.equal(c.selectedMascota().id, 2); assert.equal(c.selectedHora(), '10:00');
    c.submitCita(); assert.deepEqual(calls.create[1].args, calls.create[0].args);
  });
}

test('wizard validates motivo length before advancing or sending HTTP and releases saving on success', t => {
  const { c, calls, navigations } = fixture(t, CitaCreateComponent); wizardReady(c);
  c.currentStep.set(5); c.motivo = 'x'.repeat(251); c.nextStep(); assert.equal(c.currentStep(), 5);
  c.submitCita(); assert.equal(calls.create, undefined); assert.equal(c.saving(), false);
  c.motivo = 'x'.repeat(250); c.submitCita(); calls.create[0].response.next({ id: 1 });
  assert.equal(c.saving(), false); assert.deepEqual(navigations, [['/citas']]);
});

test('destroy cleans up clinical route/list/history/save and wizard requests, releasing active loaders', t => {
  const clinical = fixture(t); clinical.c.ngOnInit(); clinical.queryParams.next({});
  clinicalReady(clinical.c); clinical.c.onSubmit(); clinical.destroy();
  assert.equal(clinical.queryParams.observed, false);
  for (const key of ['citas', 'history', 'register']) for (const call of clinical.calls[key]) assert.equal(call.response.observed, false);
  assert.equal(clinical.c.saving(), false); assert.equal(clinical.c.loading(), false); assert.equal(clinical.c.historyLoading(), false);
  const wizard = fixture(t, CitaCreateComponent); wizard.c.ngOnInit(); wizardReady(wizard.c);
  wizard.c.selectDuenio({ id: 1 }); wizard.c.selectedMascota.set({ id: 2 });
  wizard.c.onFechaChange(); wizard.c.calcularCosto(); wizard.c.submitCita(); wizard.destroy();
  for (const group of Object.values(wizard.calls)) for (const call of group) assert.equal(call.response.observed, false);
  assert.equal(wizard.c.saving(), false); assert.equal(wizard.c.loadingDuenios(), false);
  assert.equal(wizard.c.loadingMascotas(), false); assert.equal(wizard.c.loadingSlots(), false);
});

test('admin navigation exposes the operational routes without operator links or broader clinical roles', t => {
  const { c } = fixture(t, MainLayoutComponent);
  const routes = c.filteredNavItems().map(item => item.route);
  for (const route of ['/duenios', '/mascotas', '/citas', '/atencion-clinica', '/vacunas', '/controles-mensuales', '/inasistencias', '/reportes']) assert.ok(routes.includes(route), route);
  assert.ok(!c.navItems.some(item => item.route.startsWith('/saas')));
  assert.deepEqual(c.navItems.find(item => item.route === '/atencion-clinica').roles, ['ROLE_ADMIN', 'ROLE_VETERINARIO']);
  const assistant = fixture(t, MainLayoutComponent, ['ROLE_ASISTENTE']).c;
  assert.ok(!assistant.filteredNavItems().some(item => item.route === '/atencion-clinica'));
  for (const role of ['ROLE_ADMIN', 'ROLE_ASISTENTE', 'ROLE_VETERINARIO']) {
    const staff = fixture(t, MainLayoutComponent, [role]).c;
    for (const route of ['/inasistencias', '/reportes']) assert.ok(staff.filteredNavItems().some(item => item.route === route));
  }
  const owner = fixture(t, MainLayoutComponent, ['ROLE_DUENIO']).c;
  assert.ok(!owner.filteredNavItems().some(item => ['/inasistencias', '/reportes'].includes(item.route)));
  const operator = fixture(t, MainLayoutComponent, ['ROLE_SAAS_OPERATOR']).c;
  assert.deepEqual(operator.filteredNavItems(), []);
});

const editableUser = () => ({ id: 21, fullName: 'Ana Maria Perez', email: 'ana@example.test',
  telefono: '+51 987654321', roles: ['ROLE_VETERINARIO', 'ROLE_DUENIO'], active: true, forcePasswordChange: false });
const ownProfile = () => ({ id: 31, usuarioId: 10, nombres: 'Pilot', apellidos: 'Admin',
  tipoDocumento: 'DNI', numeroDocumento: '12345678', telefono: '+51 999999999',
  email: 'pilot@example.test', direccion: 'Direccion original', active: true });

function profileReady(t, roles = ['ROLE_ADMIN']) {
  const f = fixture(t, ProfileComponent, roles);
  f.c.ngOnInit();
  if (f.calls.own) finish(f.calls.own[0], ownProfile());
  f.c.startEditing();
  f.c.profileForm.patchValue({ fullName: 'Nombre Actualizado', email: 'changed@example.test', telefono: '+51 912345678' });
  return f;
}

test('user edit populates names, email, phone and current roles, and saves without a create-role selection', t => {
  const { c, calls } = fixture(t, UsuariosComponent); const user = editableUser();
  c.openEdit(user);
  assert.deepEqual(c.userForm.getRawValue(), { nombres: 'Ana', apellidos: 'Maria Perez', email: user.email, telefono: user.telefono });
  assert.deepEqual(c.selectedRoles(), user.roles); assert.equal(c.formRole(), '');
  c.onSubmit(); c.onSubmit(); c.closeForm(); c.openCreate();
  assert.equal(calls.userUpdate.length, 1); assert.equal(c.editingUser().id, 21); assert.equal(c.showForm(), true);
  assert.deepEqual(calls.userUpdate[0].args, [21, { fullName: user.fullName, email: user.email, telefono: user.telefono }]);
  finish(calls.userUpdate[0], user);
  assert.equal(calls.rolesUpdate, undefined); assert.equal(c.saving(), false); assert.equal(c.showForm(), false);
  finish(calls.users[0], [user]); assert.equal(c.loading(), false);
});

test('user phone is required and backend-validated only when editing; create retains its exact contract', t => {
  const { c, calls } = fixture(t, UsuariosComponent); c.openEdit(editableUser());
  for (const value of ['', '1234567', '1'.repeat(21), '1234abcd', '        ']) {
    c.userForm.controls.telefono.setValue(value); c.onSubmit();
    assert.equal(c.userForm.controls.telefono.invalid, true, value); assert.equal(calls.userUpdate, undefined);
  }
  for (const value of ['12345678', '+51 999-999-999', '1'.repeat(20)]) {
    c.userForm.controls.telefono.setValue(value); assert.equal(c.userForm.controls.telefono.valid, true);
  }
  c.openCreate();
  c.userForm.patchValue({ nombres: 'Nuevo', apellidos: 'Usuario', email: 'new@example.test' });
  assert.equal(c.userForm.controls.telefono.valid, true); assert.equal(c.userForm.controls.telefono.value, '');
  c.onSubmit(); assert.equal(calls.internalCreate, undefined);
  c.formRole.set('ROLE_ASISTENTE'); c.onSubmit(); c.onSubmit();
  assert.equal(calls.internalCreate.length, 1);
  assert.deepEqual(calls.internalCreate[0].args, [{ nombres: 'Nuevo', apellidos: 'Usuario', email: 'new@example.test', rol: 'ASISTENTE' }]);
  finish(calls.internalCreate[0], { temporaryPassword: 'temporary-test-only' });
  assert.equal(c.saving(), false); assert.equal(c.temporaryPassword(), 'temporary-test-only');
});

test('single-name user editing preserves the name and rejects a combined name over the backend limit', t => {
  const { c, calls } = fixture(t, UsuariosComponent); c.openEdit({ ...editableUser(), fullName: 'Ana' });
  assert.equal(c.userForm.valid, true); c.onSubmit(); assert.equal(calls.userUpdate[0].args[1].fullName, 'Ana');
  calls.userUpdate[0].response.error({ status: 400 });
  c.userForm.patchValue({ nombres: 'x'.repeat(60), apellidos: 'y'.repeat(60) }); c.onSubmit();
  assert.match(c.submitError(), /120/); assert.equal(calls.userUpdate.length, 1);
});

test('editing validates a nonempty role selection and chains only explicit role changes after the data update', t => {
  const { c, calls } = fixture(t, UsuariosComponent); const user = editableUser(); c.openEdit(user);
  c.selectedRoles.set([]); c.onSubmit(); assert.equal(calls.userUpdate, undefined); assert.equal(c.saving(), false);
  c.selectedRoles.set(['ROLE_ASISTENTE']); c.onSubmit();
  assert.equal(calls.rolesUpdate, undefined); finish(calls.userUpdate[0], user);
  assert.equal(c.saving(), true); assert.deepEqual(calls.rolesUpdate[0].args, [21, { roles: ['ROLE_ASISTENTE'] }]);
  c.onSubmit(); assert.equal(calls.userUpdate.length, 1);
  finish(calls.rolesUpdate[0], { ...user, roles: ['ROLE_ASISTENTE'] });
  assert.equal(c.saving(), false); assert.equal(c.showForm(), false);
});

for (const status of [400, 403, 409, 0]) {
  test(`user edit ${status} retains form and roles, surfaces failure, releases saving and supports retry`, t => {
    const { c, calls } = fixture(t, UsuariosComponent); c.openEdit(editableUser());
    c.userForm.controls.nombres.setValue('Modificado'); const values = c.userForm.getRawValue();
    c.onSubmit(); calls.userUpdate[0].response.error({ status });
    assert.equal(c.saving(), false); assert.ok(c.submitError()); assert.equal(c.showForm(), true);
    assert.deepEqual(c.userForm.getRawValue(), values); assert.deepEqual(c.selectedRoles(), editableUser().roles);
    c.onSubmit(); assert.deepEqual(calls.userUpdate[1].args, calls.userUpdate[0].args);
  });
  test(`user role-stage ${status} reports partial persistence honestly and keeps edits available`, t => {
    const { c, calls } = fixture(t, UsuariosComponent); const user = editableUser(); c.openEdit(user);
    c.selectedRoles.set(['ROLE_ASISTENTE']); const values = c.userForm.getRawValue(); c.onSubmit();
    finish(calls.userUpdate[0], user); calls.rolesUpdate[0].response.error({ status });
    assert.equal(c.saving(), false); assert.equal(c.showForm(), true);
    assert.match(c.submitError(), /datos se guardaron, pero no los roles/);
    assert.deepEqual(c.userForm.getRawValue(), values); assert.deepEqual(c.selectedRoles(), ['ROLE_ASISTENTE']);
  });
}

test('user list and separate role editor failures are visible, retryable and release their loaders', t => {
  const { c, calls } = fixture(t, UsuariosComponent); c.ngOnInit(); calls.users[0].response.error({ status: 0 });
  assert.equal(c.loading(), false); assert.ok(c.pageError());
  c.loadUsuarios(); finish(calls.users[1], [editableUser()]); assert.equal(c.pageError(), '');
  c.openRolesEditor(editableUser()); c.editRolesSelected.set([]); c.saveRoles();
  assert.equal(calls.rolesUpdate, undefined); assert.ok(c.rolesError());
  c.editRolesSelected.set(['ROLE_VETERINARIO']); c.saveRoles(); c.saveRoles(); c.closeRolesEditor();
  assert.equal(calls.rolesUpdate.length, 1); assert.equal(c.showRolesEditor(), true);
  calls.rolesUpdate[0].response.error({ status: 409 });
  assert.equal(c.savingRoles(), false); assert.ok(c.rolesError()); assert.deepEqual(c.editRolesSelected(), ['ROLE_VETERINARIO']);
});

test('profile edit visibility is role-bound and the template exposes honest read-only and failure messages', t => {
  const template = ProfileComponent.__annotations__[0].template;
  assert.match(template, /canEditProfile\(\) && !editing\(\)/);
  assert.match(template, /Perfil de solo lectura[\s\S]*contacta al administrador/);
  assert.match(template, /role="alert"[\s\S]*submitError\(\)/);
  for (const roles of [['ROLE_VETERINARIO'], ['ROLE_ASISTENTE'], ['ROLE_VETERINARIO', 'ROLE_DUENIO'],
    ['ROLE_ASISTENTE', 'ROLE_DUENIO'], ['ROLE_SAAS_OPERATOR'], ['ROLE_SAAS_OPERATOR', 'ROLE_ADMIN']]) {
    const { c, calls } = fixture(t, ProfileComponent, roles); c.ngOnInit();
    assert.equal(c.canEditProfile(), false, roles.join(','));
    c.startEditing(); c.onSubmit();
    assert.equal(c.editing(), false); assert.equal(c.saving(), false); assert.equal(c.success(), false);
    assert.deepEqual(calls, {});
  }
});

test('admin own-profile writes the real user endpoint, never roles, and adopts only the actual response', t => {
  const { c, calls, sessionUser } = profileReady(t); const current = sessionUser();
  c.onSubmit(); c.onSubmit(); c.cancelEditing();
  assert.equal(calls.userUpdate.length, 1); assert.equal(c.editing(), true); assert.equal(c.success(), false);
  assert.deepEqual(calls.userUpdate[0].args, [10, { fullName: 'Nombre Actualizado', email: 'changed@example.test', telefono: '+51 912345678' }]);
  const updated = { id: 10, fullName: 'Server Normalized', email: 'server@example.test', telefono: '+51 900000000',
    roles: current.roles, active: true, forcePasswordChange: false };
  finish(calls.userUpdate[0], updated);
  assert.equal(c.saving(), false); assert.equal(c.editing(), false); assert.equal(c.success(), true);
  assert.equal(sessionUser().fullName, updated.fullName); assert.equal(sessionUser().telefono, updated.telefono);
  assert.deepEqual(sessionUser().clinica, current.clinica);
  assert.equal(calls.rolesUpdate, undefined); assert.equal(calls.ownerUpdate, undefined); assert.equal(calls.me, undefined);
});

test('mixed admin and owner profile uses only the staff endpoint', t => {
  const { c, calls } = profileReady(t, ['ROLE_ADMIN', 'ROLE_DUENIO']);
  assert.equal(calls.own, undefined); c.onSubmit();
  assert.equal(calls.userUpdate.length, 1); assert.equal(calls.ownerUpdate, undefined);
});

test('owner-only profile persists its actual owner record then refreshes the authenticated session', t => {
  const { c, calls, sessionUser } = profileReady(t, ['ROLE_DUENIO']);
  c.profileForm.controls.duenioDireccion.setValue('Nueva direccion'); c.onSubmit(); c.onSubmit();
  assert.deepEqual(calls.ownerUpdate[0].args, [31, { nombres: 'Nombre', apellidos: 'Actualizado', tipoDocumento: 'DNI',
    numeroDocumento: '12345678', telefono: '+51 912345678', email: 'changed@example.test', direccion: 'Nueva direccion' }]);
  assert.equal(calls.ownerUpdate.length, 1); assert.equal(calls.me, undefined); assert.equal(c.success(), false);
  finish(calls.ownerUpdate[0], { ...ownProfile(), ...calls.ownerUpdate[0].args[1] });
  assert.equal(calls.me.length, 1); assert.equal(c.editing(), true); assert.equal(c.saving(), true); assert.equal(c.success(), false);
  const updated = { ...sessionUser(), fullName: 'Nombre Actualizado', email: 'changed@example.test', telefono: '+51 912345678' };
  finish(calls.me[0], updated);
  assert.equal(c.editing(), false); assert.equal(c.saving(), false); assert.equal(c.success(), true);
  assert.equal(sessionUser().fullName, updated.fullName); assert.equal(calls.userUpdate, undefined); assert.equal(calls.rolesUpdate, undefined);
});

test('owner loading failures release the spinner and expose retry without allowing a fake edit', t => {
  const { c, calls } = fixture(t, ProfileComponent, ['ROLE_DUENIO']); c.ngOnInit();
  calls.own[0].response.error({ status: 0 }); assert.equal(c.loading(), false); assert.ok(c.loadError());
  c.startEditing(); c.onSubmit(); assert.equal(c.editing(), false); assert.equal(calls.ownerUpdate, undefined);
  c.loadProfile(); finish(calls.own[1], ownProfile()); assert.equal(c.loadError(), '');
  c.startEditing(); assert.equal(c.editing(), true);
});

for (const roles of [['ROLE_ADMIN'], ['ROLE_DUENIO']]) {
  for (const status of [400, 403, 409, 0]) {
    test(`${roles[0]} profile ${status} retains values and edit mode, releases saving and never reports fake success`, t => {
      const { c, calls, sessionUser } = profileReady(t, roles); const originalUser = sessionUser();
      const values = c.profileForm.getRawValue(); c.onSubmit();
      const key = roles[0] === 'ROLE_ADMIN' ? 'userUpdate' : 'ownerUpdate';
      calls[key][0].response.error({ status });
      assert.equal(c.saving(), false); assert.equal(c.editing(), true); assert.equal(c.success(), false); assert.ok(c.submitError());
      assert.deepEqual(c.profileForm.getRawValue(), values); assert.equal(sessionUser(), originalUser); assert.equal(calls.sessionUpdates, undefined);
      c.onSubmit(); assert.deepEqual(calls[key][1].args, calls[key][0].args);
    });
  }
}

test('owner session-refresh failure reports saved data honestly, retains editing and releases saving', t => {
  const { c, calls, sessionUser } = profileReady(t, ['ROLE_DUENIO']); const original = sessionUser();
  const values = c.profileForm.getRawValue(); c.onSubmit(); finish(calls.ownerUpdate[0], ownProfile());
  calls.me[0].response.error({ status: 0 });
  assert.equal(c.saving(), false); assert.equal(c.editing(), true); assert.equal(c.success(), false);
  assert.match(c.submitError(), /datos se guardaron, pero no se pudo actualizar la sesion/);
  assert.deepEqual(c.profileForm.getRawValue(), values); assert.equal(sessionUser(), original);
});

test('profile validation rejects invalid phone, email and name before sending updates', t => {
  const { c, calls } = profileReady(t);
  for (const patch of [{ telefono: '' }, { telefono: '1234567' }, { telefono: 'x'.repeat(8) }, { telefono: '1'.repeat(21) },
    { telefono: '        ' }, { fullName: '   ' }, { fullName: 'n'.repeat(121) }, { email: 'not-an-email' }]) {
    const original = c.profileForm.getRawValue(); c.profileForm.patchValue(patch); c.onSubmit();
    assert.equal(c.profileForm.invalid, true); assert.equal(calls.userUpdate, undefined); assert.equal(c.saving(), false);
    c.profileForm.patchValue(original);
  }
});

test('owner profile preserves existing multi-part names when unchanged and validates split name limits', t => {
  const { c, calls } = fixture(t, ProfileComponent, ['ROLE_DUENIO']); c.ngOnInit();
  const owner = { ...ownProfile(), nombres: 'Ana Maria', apellidos: 'Perez Lopez' }; finish(calls.own[0], owner);
  c.startEditing(); c.onSubmit();
  assert.equal(calls.ownerUpdate[0].args[1].nombres, 'Ana Maria'); assert.equal(calls.ownerUpdate[0].args[1].apellidos, 'Perez Lopez');
  calls.ownerUpdate[0].response.error({ status: 400 });
  c.profileForm.controls.fullName.setValue('n'.repeat(81) + ' Perez'); c.onSubmit();
  assert.match(c.submitError(), /80/); assert.equal(calls.ownerUpdate.length, 1);
});

test('profile response and current-session ID guards reject stale updates for both admin and owner paths', t => {
  for (const roles of [['ROLE_ADMIN'], ['ROLE_DUENIO']]) {
    for (const changedSession of [false, true]) {
      const { c, calls, sessionUser } = profileReady(t, roles); c.onSubmit();
      if (roles[0] === 'ROLE_DUENIO') finish(calls.ownerUpdate[0], ownProfile());
      if (changedSession) sessionUser.set({ ...sessionUser(), id: 99 });
      const call = roles[0] === 'ROLE_ADMIN' ? calls.userUpdate[0] : calls.me[0];
      finish(call, { ...sessionUser(), id: changedSession ? 10 : 99 });
      assert.equal(calls.sessionUpdates, undefined); assert.equal(c.saving(), false); assert.equal(c.success(), false);
      assert.equal(c.editing(), true); assert.match(c.submitError(), /sesion cambio/);
    }
  }
});

test('destroy cancels pending user and profile requests and releases save/loading flags', t => {
  const users = fixture(t, UsuariosComponent); users.c.ngOnInit(); users.c.openEdit(editableUser()); users.c.onSubmit();
  users.destroy(); assert.equal(users.calls.users[0].response.observed, false); assert.equal(users.calls.userUpdate[0].response.observed, false);
  assert.equal(users.c.saving(), false); assert.equal(users.c.loading(), false);
  const admin = profileReady(t); admin.c.onSubmit(); admin.destroy();
  assert.equal(admin.calls.userUpdate[0].response.observed, false); assert.equal(admin.c.saving(), false);
  const owner = profileReady(t, ['ROLE_DUENIO']); owner.c.onSubmit(); finish(owner.calls.ownerUpdate[0], ownProfile()); owner.destroy();
  assert.equal(owner.calls.me[0].response.observed, false); assert.equal(owner.c.saving(), false); assert.equal(owner.calls.sessionUpdates, undefined);
});
