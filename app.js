/*
 * Shree Setidevi Secondary School — Result Processing App starter
 * Frontend-only HTML/CSS/JS. Data stays in this browser (localStorage).
 * No grade thresholds are applied unless a school administrator configures them.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'setidevi_result_processing_v1';
  const CLASSES = [
    { id: 'ECD', label: 'ECD', markSheet: 'ECD', rosterSheet: null, code: 'ECD', group: 'Early Childhood' },
    { id: 'KGA', label: "KG'A'", markSheet: 'KGA', rosterSheet: 'KGA Students Detail', code: 'KGA', group: 'Kindergarten' },
    { id: 'KGB', label: "KG'B'", markSheet: 'KGB', rosterSheet: 'KGB Students Detail', code: 'KGB', group: 'Kindergarten' },
    { id: '1', label: 'Class 1', markSheet: 'One', rosterSheet: '1 Students Detail', code: '01', group: 'Primary' },
    { id: '2', label: 'Class 2', markSheet: 'Two', rosterSheet: '2 Students Detail', code: '02', group: 'Primary' },
    { id: '3', label: 'Class 3', markSheet: 'Three', rosterSheet: '3 Students Detail', code: '03', group: 'Primary' },
    { id: '4A', label: 'Class 4A', markSheet: '4A', rosterSheet: '4A Students Detail', code: '4A', group: 'Primary' },
    { id: '4B', label: 'Class 4B', markSheet: '4B', rosterSheet: '4B Students Detail', code: '4B', group: 'Primary' },
    { id: '5', label: 'Class 5', markSheet: 'Five', rosterSheet: '5 Studentss Detail', code: '05', group: 'Primary' },
    { id: '6', label: 'Class 6', markSheet: 'Six', rosterSheet: '6 Students Detail', code: '06', group: 'Basic' },
    { id: '7', label: 'Class 7', markSheet: 'Seven', rosterSheet: '7 Students Detail', code: '07', group: 'Basic' },
    { id: '8', label: 'Class 8', markSheet: 'Eight', rosterSheet: '8 Students Detail', code: '08', group: 'Basic' },
    { id: '9', label: 'Class 9', markSheet: 'Nine', rosterSheet: '9 Students Detail', code: '09', group: 'Secondary' },
    { id: '10', label: 'Class 10', markSheet: 'Ten', rosterSheet: '10 Students Detail', code: '10', group: 'Secondary' },
    { id: '11', label: 'Class 11', markSheet: 'Eleven', rosterSheet: '11 Students Detail', code: '11', group: 'Higher Secondary' },
    { id: '12', label: 'Class 12', markSheet: 'Twelve', rosterSheet: '12 StudentDetail', code: '12', group: 'Higher Secondary' }
  ];
  const DEFAULT_SETTINGS = {
    schoolName: 'SHREE SETIDEVI SECONDARY SCHOOL',
    address: 'Chautara Sangachokgadhi Municipality-1, Syaule, Sindhupalchok',
    established: '2010', academicYear: '2083', examName: 'First Terminal Examination 2083',
    motto: '', headteacher: 'SABIN DANGAL', examCoordinator: 'GOVINDA PAUDYAL',
    secondaryIncharge: 'RAJENDRA SAPKOTA', primaryIncharge: 'PANCHALAL SHRESTHA'
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const blankState = () => ({
    settings: clone(DEFAULT_SETTINGS), students: [], subjects: {}, marks: {}, gradeScales: {},
    importLog: [], workbookMeta: null, auditIssues: [], classTeachers: {}, lastSaved: null, appVersion: 1
  });
  let state = loadState();
  let activePage = 'dashboard';
  let selectedStudentClass = '6';
  let selectedMarksClass = '6';
  let selectedMarksSubject = '';
  let selectedMarksComponent = '';
  let selectedLedgerClass = '6';
  let selectedGradeClass = '6';
  let selectedGradesheetStudent = '';
  let studentSearch = '';
  let pendingImport = null;
  let pendingFileName = '';
  let settingsTab = 'school';
  let selectedSetupClass = '6';
  let selectedGradePolicyClass = '6';
  let importFilter = 'all';

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return blankState();
      const parsed = JSON.parse(raw);
      const initial = blankState();
      return { ...initial, ...parsed, settings: { ...initial.settings, ...(parsed.settings || {}) }, students: Array.isArray(parsed.students) ? parsed.students : [], subjects: parsed.subjects || {}, marks: parsed.marks || {}, gradeScales: parsed.gradeScales && typeof parsed.gradeScales==='object' ? parsed.gradeScales : {}, importLog: Array.isArray(parsed.importLog) ? parsed.importLog : [], auditIssues: Array.isArray(parsed.auditIssues) ? parsed.auditIssues : [] };
    } catch (err) {
      console.warn('Unable to read saved workspace:', err);
      return blankState();
    }
  }
  function saveState() {
    try {
      state.lastSaved = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const el = document.getElementById('saveStatus');
      if (el) el.textContent = 'Saved ' + new Date(state.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      updateChrome();
      return true;
    } catch (err) {
      console.error(err);
      toast('Storage limit reached', 'Export a backup and reduce stored data before continuing.', true);
      return false;
    }
  }
  function id(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function norm(value) { return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' '); }
  function numOrNull(value) {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  function fmtNum(value, digits = 2) {
    if (value === null || value === undefined || value === '') return '—';
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
  }
  function classInfo(classId) { return CLASSES.find(c => c.id === String(classId)) || CLASSES[0]; }
  function classSelectOptions(selected, includeAll = false) {
    const head = includeAll ? '<option value="all">All classes</option>' : '';
    return head + CLASSES.map(c => `<option value="${esc(c.id)}" ${String(selected) === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('');
  }
  function studentsFor(classId = 'all') {
    return state.students.filter(s => classId === 'all' || String(s.classId) === String(classId));
  }
  function subjectsFor(classId) { return Array.isArray(state.subjects[classId]) ? state.subjects[classId] : []; }
  function componentList(subject) { return Array.isArray(subject?.components) && subject.components.length ? subject.components : [{ id: 'Mark', label: 'Mark', maxMarks: null }]; }
  function markPath(studentId, subjectId, componentId) {
    return state.marks[studentId]?.[subjectId]?.[componentId];
  }
  function getMark(studentId, subjectId, componentId) {
    const v = markPath(studentId, subjectId, componentId);
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function putMark(studentId, subjectId, componentId, value) {
    if (!state.marks[studentId]) state.marks[studentId] = {};
    if (!state.marks[studentId][subjectId]) state.marks[studentId][subjectId] = {};
    state.marks[studentId][subjectId][componentId] = value === '' ? '' : Number(value);
  }
  function studentMarkSummary(student, classId) {
    const subjects = subjectsFor(classId);
    let entered = 0, possible = 0, total = 0, configured = true;
    subjects.forEach(subject => componentList(subject).forEach(comp => {
      const mark = getMark(student.id, subject.id, comp.id);
      if (mark !== null) { entered++; total += mark; }
      if (comp.maxMarks === null || comp.maxMarks === '' || !Number.isFinite(Number(comp.maxMarks))) configured = false;
      else possible += Number(comp.maxMarks);
    }));
    return { entered, possible: configured ? possible : null, total, percent: configured && possible > 0 ? (total / possible * 100) : null };
  }
  function allMarkCount() {
    let count = 0;
    Object.values(state.marks).forEach(subjects => Object.values(subjects || {}).forEach(comps => Object.values(comps || {}).forEach(v => { if (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v))) count++; })));
    return count;
  }
  function marksCompletion(classId) {
    const students = studentsFor(classId), subjects = subjectsFor(classId);
    const expected = students.reduce((sum) => sum + subjects.reduce((s, subject) => s + componentList(subject).length, 0), 0);
    const entered = students.reduce((sum, student) => sum + studentMarkSummary(student, classId).entered, 0);
    return { entered, expected, pct: expected ? Math.round(entered / expected * 100) : 0 };
  }
  function issueCount() { return (state.auditIssues || []).length; }
  function updateChrome() {
    const yr = document.getElementById('sidebarYear'); if (yr) yr.textContent = state.settings.academicYear || '—';
    const exam = document.getElementById('examPill'); if (exam) exam.textContent = state.settings.examName || 'Examination not configured';
    const fy = document.getElementById('footerYear'); if (fy) fy.textContent = state.settings.academicYear || '—';
    const ic = document.getElementById('issueNavCount'); if (ic) ic.textContent = issueCount();
    const save = document.getElementById('saveStatus'); if (save && state.lastSaved) save.textContent = 'Saved ' + new Date(state.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function pageTitle(page) {
    return ({ dashboard: 'Dashboard', students: 'Students', marks: 'Marks Entry', markledger: 'Mark Ledger', gradeledger: 'Grade Ledger', gradesheets: 'Gradesheets', analysis: 'Result Analysis', import: 'Import / Export', audit: 'Data & Formula Audit', settings: 'Settings' })[page] || 'Dashboard';
  }
  function go(page) {
    activePage = page;
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
    const crumb = document.getElementById('crumbCurrent'); if (crumb) crumb.textContent = pageTitle(page);
    document.getElementById('sidebar')?.classList.remove('open');
    renderPage();
  }
  function heading(eyebrow, title, subtitle, actions = '') {
    return `<div class="page-heading"><div><div class="page-eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="heading-actions">${actions}</div></div>`;
  }
  function iconStat(icon, label, value, foot, tone = '') {
    return `<div class="stat-card"><div class="stat-top"><span class="stat-label">${esc(label)}</span><span class="stat-icon ${tone}">${icon}</span></div><div class="stat-value mono">${esc(value)}</div><div class="stat-foot">${foot}</div></div>`;
  }
  function renderPage() {
    updateChrome();
    const root = document.getElementById('appContent');
    if (!root) return;
    const pages = { dashboard: renderDashboard, students: renderStudents, marks: renderMarks, markledger: renderMarkLedger, gradeledger: renderGradeLedger, gradesheets: renderGradesheets, analysis: renderAnalysis, import: renderImport, audit: renderAudit, settings: renderSettings };
    root.innerHTML = (pages[activePage] || renderDashboard)();
    root.focus({ preventScroll: true });
    if (activePage === 'marks') syncMarksSelection();
  }
  function renderDashboard() {
    const studentCount = state.students.length;
    const populated = CLASSES.filter(c => studentsFor(c.id).length > 0).length;
    const markCount = allMarkCount();
    const issues = issueCount();
    const classRows = CLASSES.map((c, i) => {
      const students = studentsFor(c.id).length;
      const comp = marksCompletion(c.id);
      const tone = i % 3 === 1 ? 'green' : i % 3 === 2 ? 'gold' : '';
      const status = students === 0 ? '<span class="status neutral">No roster</span>' : comp.expected === 0 ? '<span class="status pending">Setup needed</span>' : comp.pct === 100 ? '<span class="status ok">Complete</span>' : '<span class="status pending">In progress</span>';
      return `<tr><td><div class="class-cell"><div class="class-avatar ${tone}">${esc(c.code)}</div><div class="class-name"><b>${esc(c.label)}</b><small>${esc(c.group)}</small></div></div></td><td class="mono">${students}</td><td><div class="progress-wrap"><div class="progress-label"><span>Marks</span><b>${comp.pct}%</b></div><div class="progress-track"><span style="width:${comp.pct}%"></span></div></div></td><td>${status}</td><td><button class="action-link" data-action="open-class-marks" data-class="${esc(c.id)}">Open →</button></td></tr>`;
    }).join('');
    const recent = (state.importLog || []).slice(-4).reverse();
    const activity = recent.length ? recent.map(log => `<div class="activity-item"><div class="activity-symbol">⇧</div><div class="activity-copy"><b>${esc(log.fileName || 'Workbook import')}</b><p>${esc(log.summary || 'Import completed')} · ${esc(log.records || 0)} student record(s) processed.</p></div><span class="activity-time">${esc(log.date || '')}</span></div>`).join('') : `<div class="empty-state" style="padding:20px 5px"><div class="empty-icon">◷</div><b>No recent activity</b><p>Import your examination workbook or add students to start using the workspace.</p></div>`;
    return `${heading('OVERVIEW', 'Good evening, school team.', 'Your examination workspace at a glance. Import the source workbook first, then review student records and enter marks.', `<button class="btn btn-secondary" data-action="export-backup"><span class="inline-icon">⇩</span> Backup data</button><button class="btn btn-primary" data-action="go-import"><span class="inline-icon">＋</span> Import workbook</button>`)}
      <div class="stats-grid">${iconStat('♙','Total students',studentCount.toLocaleString(),'Across all imported classes')}${iconStat('▦','Classes with students',`${populated} / ${CLASSES.length}`,'Separate sections preserved','green')}${iconStat('✎','Marks entered',markCount.toLocaleString(),'Saved mark values','amber')}${iconStat('⚠','Audit issues',issues.toLocaleString(),issues ? 'Review before final results' : 'No recorded import issues',issues ? 'red' : 'green')}</div>
      <div class="content-grid"><section class="panel"><div class="panel-header"><div><h2>Class performance workspace</h2><p>Class roster and marks-entry completion. This is not a published result.</p></div><button class="panel-link" data-action="go-students">View students →</button></div><div class="table-wrap"><table><thead><tr><th>Class / section</th><th>Students</th><th>Entry progress</th><th>Workspace status</th><th></th></tr></thead><tbody>${classRows}</tbody></table></div></section>
      <section class="panel"><div class="panel-header"><div><h2>Recent activity</h2><p>Local import history</p></div><button class="panel-link" data-action="go-import">Import log →</button></div><div class="panel-body"><div class="activity-list">${activity}</div><div class="notice-box"><span class="notice-icon">ⓘ</span><div><b>Calculation safeguards</b><p>Grade, pass/fail and GPA are not inferred from broken workbook formulas. Configure and verify school-approved rules before release.</p></div></div></div></section></div>`;
  }
  function renderStudents() {
    const cls = selectedStudentClass;
    const filtered = studentsFor(cls).filter(s => !studentSearch || `${s.name} ${s.roll} ${s.symbolNo || ''} ${s.registrationNo || ''}`.toLowerCase().includes(studentSearch.toLowerCase()));
    const rows = filtered.map(s => `<tr><td class="mono">${esc(s.roll || '—')}</td><td><div class="student-name-cell"><span class="person-avatar">${esc(initials(s.name))}</span><div><b>${esc(s.name)}</b><small>${esc(s.symbolNo ? `Symbol: ${s.symbolNo}` : s.registrationNo ? `Reg: ${s.registrationNo}` : 'Student record')}</small></div></div></td><td>${esc(classInfo(s.classId).label)}</td><td>${esc(s.dob || '—')}</td><td>${esc(s.attendance || '—')}</td><td><div class="row-actions"><button class="action-link" data-action="edit-student" data-id="${esc(s.id)}">Edit</button><button class="action-link danger" data-action="delete-student" data-id="${esc(s.id)}">Remove</button></div></td></tr>`).join('');
    return `${heading('STUDENT DIRECTORY','Students','Manage the roster for all 16 learning groups. Class 4A and Class 4B remain separate. See source workbook mapping before importing.', `<button class="btn btn-secondary" data-action="export-students"><span class="inline-icon">⇩</span> Export CSV</button><button class="btn btn-primary" data-action="add-student"><span class="inline-icon">＋</span> Add student</button>`)}
      <div class="toolbar"><div class="toolbar-left"><select class="select-control" id="studentClassFilter">${classSelectOptions(cls)}</select><div class="search-wrap"><input class="search-control" id="studentSearch" value="${esc(studentSearch)}" placeholder="Search by name, roll or symbol…" /></div></div><div class="toolbar-right"><span class="subtle" style="font-size:10px">${filtered.length} student record(s)</span></div></div>
      <section class="panel table-panel"><div class="table-meta"><span><b>${esc(classInfo(cls).label)}</b> · Student roster</span><span>Local workspace records</span></div>${filtered.length ? `<div class="table-wrap"><table><thead><tr><th>Roll no.</th><th>Student</th><th>Class / section</th><th>Date of birth</th><th>Attendance</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>` : emptyState('No student records yet','Import the original examination workbook to map roster data, or add a student manually.', 'go-import', 'Import workbook')}</section>`;
  }
  function renderMarks() {
    const cls = selectedMarksClass;
    const subjects = subjectsFor(cls);
    if (!subjects.some(s => s.id === selectedMarksSubject)) selectedMarksSubject = subjects[0]?.id || '';
    const sub = subjects.find(s => s.id === selectedMarksSubject);
    if (sub && !componentList(sub).some(c => c.id === selectedMarksComponent)) selectedMarksComponent = componentList(sub)[0]?.id || '';
    const component = sub ? componentList(sub).find(c => c.id === selectedMarksComponent) : null;
    const roster = studentsFor(cls).slice().sort((a,b) => (Number(a.roll)||999999)-(Number(b.roll)||999999) || a.name.localeCompare(b.name));
    const compName = component?.label || 'Mark';
    const max = numOrNull(component?.maxMarks);
    const maxText = max === null ? 'Full marks not configured' : `Full marks: ${max}`;
    let enteredCount = 0;
    const rows = roster.map(stu => {
      const val = sub && component ? getMark(stu.id, sub.id, component.id) : null;
      if (val !== null) enteredCount++;
      const totalForSub = sub ? componentList(sub).reduce((sum,c) => sum + (getMark(stu.id,sub.id,c.id) ?? 0),0) : 0;
      const invalid = val !== null && (val < 0 || (max !== null && val > max));
      return `<tr><td class="mono">${esc(stu.roll || '—')}</td><td><div class="marks-name">${esc(stu.name)}<small>${esc(stu.symbolNo || stu.registrationNo || '')}</small></div></td><td><input class="mark-input ${invalid?'invalid':''}" type="number" min="0" ${max!==null?`max="${max}"`:''} step="any" inputmode="decimal" data-mark-student="${esc(stu.id)}" data-mark-subject="${esc(sub?.id || '')}" data-mark-component="${esc(component?.id || '')}" value="${val===null?'':esc(val)}" aria-label="${esc(stu.name)} ${esc(compName)}" ${!sub||!component?'disabled':''}></td><td><span class="total-chip mono">${sub ? fmtNum(totalForSub) : '—'}</span></td><td>${invalid?'<span class="status issue">Out of range</span>':val===null?'<span class="status neutral">Pending</span>':'<span class="status ok">Entered</span>'}</td></tr>`;
    }).join('');
    const componentOptions = sub ? componentList(sub).map(c => `<option value="${esc(c.id)}" ${c.id===selectedMarksComponent?'selected':''}>${esc(c.label)}</option>`).join('') : '';
    return `${heading('ASSESSMENT WORKSPACE','Marks Entry','Select a class, subject and component. Changes save to this browser. Full marks and grading rules must be configured from the verified school policy.', `<button class="btn btn-secondary" data-action="export-mark-grid"><span class="inline-icon">⇩</span> Export marks CSV</button>`)}
      <div class="marks-note"><span>ⓘ</span><div><strong>Source data protection:</strong> cached formula results and Excel error strings are not imported as marks. Blank entries stay blank; zero is treated as an entered score. ${subjects.length ? 'Validate the component/full-mark setup before publishing.' : 'Import the workbook or add subject setup before entering marks.'}</div></div>
      <div class="toolbar"><div class="toolbar-left"><select class="select-control" id="marksClassFilter">${classSelectOptions(cls)}</select><select class="select-control" id="marksSubjectFilter" ${subjects.length?'':'disabled'}>${subjects.length?subjects.map(s=>`<option value="${esc(s.id)}" ${s.id===selectedMarksSubject?'selected':''}>${esc(s.name)}</option>`).join(''):'<option>No subjects configured</option>'}</select><select class="select-control" id="marksComponentFilter" ${sub?'':'disabled'}>${componentOptions || '<option>No components</option>'}</select></div><div class="toolbar-right"><span class="status ${roster.length&&enteredCount===roster.length?'ok':'pending'}">${enteredCount} / ${roster.length} entered</span></div></div>
      <section class="panel table-panel"><div class="table-meta"><span><b>${esc(classInfo(cls).label)}</b>${sub?` · ${esc(sub.name)} / ${esc(compName)}`:''}</span><span>${esc(maxText)} · ${roster.length} student(s)</span></div>${!roster.length ? emptyState('No students in this class','Import student details from the source workbook before entering marks.','go-import','Import workbook') : !sub || !component ? emptyState('Subject setup required','Import the workbook to detect subject/component structure, or configure it in the source data before entry.','go-import','Import workbook') : `<div class="table-wrap"><table><thead><tr><th>Roll no.</th><th>Student</th><th>${esc(compName)}</th><th>Subject total so far</th><th>Entry status</th></tr></thead><tbody>${rows}</tbody></table></div>`}</section>
      <p class="subtle" style="font-size:10px;line-height:1.6;margin:12px 2px 0">Note: this frontend saves on this device/browser only. It does not yet synchronize marks between teachers or devices; use export/backup to safeguard your records.</p>`;
  }
  function renderMarkLedger() {
    const cls = selectedLedgerClass;
    const subjects = subjectsFor(cls);
    const roster = studentsFor(cls).slice().sort((a,b) => (Number(a.roll)||99999)-(Number(b.roll)||99999));
    const th = subjects.map(s => `<th>${esc(s.name)}</th>`).join('');
    const rows = roster.map(stu => {
      const totals = subjects.map(s => {
        const comps = componentList(s);
        const values = comps.map(c => getMark(stu.id,s.id,c.id));
        const total = values.reduce((sum,v)=>sum+(v??0),0);
        return { has: values.some(v=>v!==null), total };
      });
      const totalAll = totals.reduce((sum, item)=>sum+item.total,0);
      return `<tr><td>${esc(stu.roll||'—')}</td><td>${esc(stu.name)}</td>${totals.map(t=>`<td class="mono">${t.has?fmtNum(t.total):'—'}</td>`).join('')}<td><b class="mono">${fmtNum(totalAll)}</b></td><td>${esc(stu.attendance||'—')}</td><td>${esc(stu.remarks||'—')}</td></tr>`;
    }).join('');
    return `${heading('REPORTS','Mark Ledger','A print-friendly view of entered marks. Subject totals are shown only as a sum of saved components; this is not a final validated result.', `<button class="btn btn-secondary no-print" data-action="export-ledger-csv"><span class="inline-icon">⇩</span> Export CSV</button><button class="btn btn-primary no-print" data-action="print-page"><span class="inline-icon">⎙</span> Print</button>`)}
      <div class="toolbar no-print"><div class="toolbar-left"><select class="select-control" id="ledgerClassFilter">${classSelectOptions(cls)}</select></div><div class="toolbar-right"><span class="subtle" style="font-size:10px">${roster.length} student(s) · ${subjects.length} subject(s)</span></div></div>
      <section class="panel table-panel"><div class="panel-header"><div><h2>${esc(state.settings.schoolName)}</h2><p>${esc(state.settings.address)} · ${esc(state.settings.examName)}</p><p style="margin-top:5px"><b>${esc(classInfo(cls).label)} — Mark Ledger (Draft)</b></p></div><span class="status pending">Draft data</span></div>${roster.length && subjects.length ? `<div class="table-wrap"><table><thead><tr><th>Roll</th><th>Student's name</th>${th}<th>Total entered</th><th>Attend.</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table></div>` : emptyState('Ledger needs data','Import students and subject fields before generating this report.')}</section>`;
  }
  function gradeRulesFor(classId) {
    const rules = state.gradeScales?.[String(classId)];
    return Array.isArray(rules) ? rules : [];
  }
  function lookupGrade(percentage, classId) {
    const rules = gradeRulesFor(classId).slice().filter(r => Number.isFinite(Number(r.minPct))).sort((a,b)=>Number(b.minPct)-Number(a.minPct));
    return rules.find(r => percentage >= Number(r.minPct)) || null;
  }
  function renderGradeLedger() {
    const cls = selectedGradeClass;
    const roster = studentsFor(cls).slice().sort((a,b)=>(Number(a.roll)||99999)-(Number(b.roll)||99999));
    const subjects = subjectsFor(cls);
    const configured = subjects.length > 0 && subjects.every(s=>componentList(s).every(c=>numOrNull(c.maxMarks)!==null && numOrNull(c.maxMarks)>0)) && gradeRulesFor(cls).length > 0;
    const rows = roster.map(stu => {
      const sums = subjects.map(s=>{
        const comps = componentList(s); const marks = comps.map(c=>getMark(stu.id,s.id,c.id));
        const entered = marks.some(v=>v!==null); const total = marks.reduce((a,v)=>a+(v??0),0); const max = comps.reduce((a,c)=>a+(numOrNull(c.maxMarks)??0),0);
        const complete = marks.every(v=>v!==null);
        const pct = max>0 ? total/max*100 : null;
        return { total, max, entered, complete, pct, grade: pct===null?null:lookupGrade(pct, cls) };
      });
      const allMax=sums.reduce((a,x)=>a+x.max,0), allTotal=sums.reduce((a,x)=>a+x.total,0), allEntered=sums.every(x=>x.complete), pct=allMax>0?allTotal/allMax*100:null;
      const grade = pct===null?null:lookupGrade(pct, cls);
      return `<tr><td>${esc(stu.roll||'—')}</td><td>${esc(stu.name)}</td>${sums.map(s=>`<td class="mono">${s.entered?fmtNum(s.total):'—'} <span class="subtle">${s.grade?`(${esc(s.grade.grade||'')})`:''}</span></td>`).join('')}<td class="mono">${allEntered?fmtNum(allTotal):'Partial'}</td><td class="mono">${configured&&allEntered&&pct!==null?fmtNum(pct,1)+'%':'—'}</td><td>${configured&&allEntered?`<span class="status ${grade?'ok':'pending'}">${esc(grade?.grade||'Unmapped')}</span>`:'<span class="status neutral">Not validated</span>'}</td></tr>`;
    }).join('');
    return `${heading('REPORTS','Grade Ledger','Draft grade view using only the grading thresholds explicitly configured in Settings. The workbook’s broken formulas are not treated as authoritative grading rules.', `<button class="btn btn-secondary no-print" data-action="go-settings"><span class="inline-icon">⚙</span> Grade setup</button><button class="btn btn-primary no-print" data-action="print-page"><span class="inline-icon">⎙</span> Print</button>`)}
      ${configured?'':`<div class="grade-config-warning"><strong>Grading not configured.</strong> Subject/component full marks or a school-approved grade scale is missing. Subject grades, percentages and pass/fail outcomes are intentionally not finalized. Configure the verified rules in Settings first.</div>`}
      <div class="toolbar no-print"><div class="toolbar-left"><select class="select-control" id="gradeClassFilter">${classSelectOptions(cls)}</select></div><div class="toolbar-right"><span class="subtle" style="font-size:10px">${roster.length} student(s)</span></div></div>
      <section class="panel table-panel"><div class="panel-header"><div><h2>${esc(state.settings.schoolName)}</h2><p>${esc(state.settings.examName)} · ${esc(classInfo(cls).label)} · Grade Ledger (Draft)</p></div><span class="status ${configured?'ok':'pending'}">${configured?'Rules configured':'Needs configuration'}</span></div>${roster.length ? `<div class="table-wrap"><table><thead><tr><th>Roll</th><th>Student's name</th>${subjects.map(s=>`<th>${esc(s.name)}</th>`).join('')}<th>Total</th><th>Percent</th><th>Status / grade</th></tr></thead><tbody>${rows}</tbody></table></div>` : emptyState('No student records','Import the workbook first.')}</section>`;
  }
  function renderGradesheets() {
    const roster = studentsFor('all').slice().sort((a,b)=>classInfo(a.classId).label.localeCompare(classInfo(b.classId).label)||String(a.roll).localeCompare(String(b.roll),undefined,{numeric:true}));
    if (!roster.some(s=>s.id===selectedGradesheetStudent)) selectedGradesheetStudent = roster[0]?.id || '';
    const stu=roster.find(s=>s.id===selectedGradesheetStudent);
    const cls=stu?stu.classId:selectedGradeClass;
    const subs=stu?subjectsFor(cls):[];
    const configured=!!stu && subs.length>0 && subs.every(s=>componentList(s).every(c=>numOrNull(c.maxMarks)!==null&&numOrNull(c.maxMarks)>0)) && gradeRulesFor(cls).length>0;
    const subjectRows=stu?subs.map(subject=>{
      const comps=componentList(subject);
      const values=comps.map(comp=>getMark(stu.id,subject.id,comp.id));
      const entered=values.filter(v=>v!==null).length;
      const total=values.reduce((a,v)=>a+(v??0),0);
      const max=comps.reduce((a,comp)=>a+(numOrNull(comp.maxMarks)??0),0);
      const pct=max>0?total/max*100:null;
      const grade=pct!==null?lookupGrade(pct,cls):null;
      const componentText=comps.map((comp,i)=>`${comp.label}: ${values[i]===null?'—':fmtNum(values[i])}`).join(' · ');
      return `<tr><td>${esc(subject.name)}</td><td style="white-space:normal;min-width:175px">${esc(componentText)}</td><td class="text-right mono">${entered?fmtNum(total):'—'}</td><td class="text-right mono">${max>0?fmtNum(max):'—'}</td><td class="text-right mono">${configured&&entered===comps.length&&pct!==null?fmtNum(pct,1)+'%':'—'}</td><td>${configured&&entered===comps.length?esc(grade?.grade||'Unmapped'):'—'}</td></tr>`;
    }).join(''):'';
    const subjectTotal=stu?subs.reduce((sum,subject)=>sum+componentList(subject).reduce((a,comp)=>a+(getMark(stu.id,subject.id,comp.id)??0),0),0):0;
    const marksExist=stu?subs.some(subject=>componentList(subject).some(comp=>getMark(stu.id,subject.id,comp.id)!==null)):false;
    return `${heading('REPORTS','Gradesheets','Select one student to preview a printable result card. This is a draft until source rules, maximum marks and marks completeness have been verified.', `<button class="btn btn-secondary no-print" data-action="go-students">Student directory</button><button class="btn btn-primary no-print" data-action="print-page" ${stu?'':'disabled'}><span class="inline-icon">⎙</span> Print gradesheet</button>`)}
      <div class="toolbar no-print"><div class="toolbar-left"><select class="select-control" id="gradesheetStudentFilter" style="min-width:min(430px,80vw)">${roster.map(s=>`<option value="${esc(s.id)}" ${stu?.id===s.id?'selected':''}>${esc(classInfo(s.classId).label)} · ${esc(s.roll||'—')} · ${esc(s.name)}</option>`).join('') || '<option value="">No students imported</option>'}</select></div></div>
      ${stu?`<section class="panel" style="padding:22px 24px"><div class="print-only" style="text-align:center;margin-bottom:10px">${esc(state.settings.schoolName)}</div><div style="text-align:center;border-bottom:1px solid #e8edf4;padding-bottom:16px;margin-bottom:18px"><h2 style="font-size:18px;margin-bottom:7px">${esc(state.settings.schoolName)}</h2><p style="font-size:10px;color:#7f8b9b;margin-bottom:4px">${esc(state.settings.address)}</p><p style="font-size:12px;font-weight:700;margin-bottom:0">${esc(state.settings.examName)} · GRADE SHEET (DRAFT)</p></div><div class="two-col" style="gap:8px;margin-bottom:18px"><div><div style="font-size:10px;color:#8994a4;margin-bottom:6px">STUDENT NAME</div><div style="font-weight:700;font-size:14px">${esc(stu.name)}</div></div><div><div style="font-size:10px;color:#8994a4;margin-bottom:6px">CLASS / SECTION</div><div style="font-weight:700;font-size:14px">${esc(classInfo(stu.classId).label)}</div></div><div><div style="font-size:10px;color:#8994a4;margin-bottom:6px">ROLL NO.</div><div style="font-weight:600">${esc(stu.roll||'—')}</div></div><div><div style="font-size:10px;color:#8994a4;margin-bottom:6px">SYMBOL / REGISTRATION</div><div style="font-weight:600">${esc(stu.symbolNo||stu.registrationNo||'—')}</div></div></div>${subs.length?`<div class="table-wrap"><table><thead><tr><th>Subject</th><th>Component marks</th><th class="text-right">Total</th><th class="text-right">Full marks</th><th class="text-right">Percentage</th><th>Grade</th></tr></thead><tbody>${subjectRows}</tbody></table></div><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;margin-top:15px;border-top:1px solid #e8edf4;padding-top:14px"><div><span class="subtle" style="font-size:10px">Sum of entered marks</span><div style="font-weight:700;font-size:17px;margin-top:4px">${marksExist?fmtNum(subjectTotal):'—'}</div></div><div><span class="subtle" style="font-size:10px">Attendance</span><div style="font-weight:600;margin-top:5px">${esc(stu.attendance||'—')}</div></div><div><span class="subtle" style="font-size:10px">Remarks</span><div style="font-weight:600;margin-top:5px">${esc(stu.remarks||'—')}</div></div></div>`:emptyState('Subject setup unavailable','Import the workbook to detect the subjects for this class.')}
      <div class="grade-config-warning" style="margin-top:17px;margin-bottom:0">${configured?'Grading configuration is present. Confirm all school-approved rules and result validations before publishing.':'DRAFT — grading thresholds and/or full marks are not fully configured. Do not issue this as an official result.'}</div><div style="display:flex;justify-content:space-between;gap:20px;margin-top:45px;font-size:10px;color:#677488"><div style="border-top:1px solid #bac4d3;padding-top:7px;min-width:120px">Class Teacher</div><div style="border-top:1px solid #bac4d3;padding-top:7px;min-width:120px">Examination Coordinator</div><div style="border-top:1px solid #bac4d3;padding-top:7px;min-width:120px">Headteacher</div></div></section>`:emptyState('No students imported','Import the source workbook or add a student first.','go-import','Import workbook')}`;
  }
  function renderAnalysis() {
    const classRows = CLASSES.map(c=>{
      const students=studentsFor(c.id); const subjects=subjectsFor(c.id); const completion=marksCompletion(c.id);
      const studentsWithMarks=students.filter(s=>studentMarkSummary(s,c.id).entered>0).length;
      const maxConfigured=subjects.length>0 && subjects.every(s=>componentList(s).every(comp=>numOrNull(comp.maxMarks)!==null&&numOrNull(comp.maxMarks)>0));
      const avgPcts=students.map(s=>studentMarkSummary(s,c.id).percent).filter(p=>p!==null);
      const avg=avgPcts.length?avgPcts.reduce((a,b)=>a+b,0)/avgPcts.length:null;
      return `<tr><td><b>${esc(c.label)}</b></td><td class="mono">${students.length}</td><td class="mono">${studentsWithMarks}</td><td><div class="progress-wrap"><div class="progress-label"><span>Entry</span><b>${completion.pct}%</b></div><div class="progress-track"><span style="width:${completion.pct}%"></span></div></div></td><td class="mono">${maxConfigured&&avg!==null?fmtNum(avg,1)+'%':'—'}</td><td><span class="status ${!students.length?'neutral':subjects.length?'pending':'neutral'}">${!students.length?'No roster':!subjects.length?'No subjects':'Draft analysis'}</span></td></tr>`;
    }).join('');
    const allStudents=state.students.length; const configuredClasses=CLASSES.filter(c=>subjectsFor(c.id).length && subjectsFor(c.id).every(s=>componentList(s).every(comp=>numOrNull(comp.maxMarks)!==null&&numOrNull(comp.maxMarks)>0))).length;
    return `${heading('ANALYTICS','Result Analysis','Reconciliation and coverage view from saved draft records. No pass/fail counts are generated while grade rules remain unverified.', `<button class="btn btn-secondary" data-action="export-analysis"><span class="inline-icon">⇩</span> Export analysis CSV</button><button class="btn btn-primary" data-action="print-page"><span class="inline-icon">⎙</span> Print</button>`)}
      <div class="audit-summary-grid"><div class="mini-stat"><span>Students in workspace</span><b>${allStudents}</b></div><div class="mini-stat"><span>Classes represented</span><b>${CLASSES.filter(c=>studentsFor(c.id).length).length}/${CLASSES.length}</b></div><div class="mini-stat"><span>Classes with subject mapping</span><b>${CLASSES.filter(c=>subjectsFor(c.id).length).length}</b></div><div class="mini-stat"><span>Classes with full marks configured</span><b>${configuredClasses}</b></div></div>
      <div class="grade-config-warning"><strong>Result-release safeguard:</strong> pass/fail, number of failed subjects, final GPA and official ranking are withheld until relevant grade rules, full marks, required mark completeness and tie/absence policies are verified.</div>
      <section class="panel table-panel"><div class="panel-header"><div><h2>Class-wise coverage</h2><p>Use this to identify where source setup or mark entry is incomplete.</p></div></div><div class="table-wrap"><table><thead><tr><th>Class</th><th>Students</th><th>With marks</th><th>Marks entry</th><th>Average %*</th><th>Readiness</th></tr></thead><tbody>${classRows}</tbody></table></div></section><p class="subtle" style="font-size:9px;margin-top:10px">*Average is shown only when full marks are configured for all components. This figure is a draft coverage indicator, not an official examination result.</p>`;
  }
  function renderImport() {
    const sheets = state.workbookMeta?.sheets || [];
    const visibleSheets = sheets.filter(s => !s.hidden);
    const hiddenSheets = sheets.filter(s => s.hidden);
    const issues=state.auditIssues || [];
    const pending=pendingImport;
    return `${heading('DATA TRANSFER','Import / Export','Load the original Excel workbook read-only, preview worksheet mappings and confirm before changing the local app records.', `<button class="btn btn-secondary" data-action="export-backup"><span class="inline-icon">⇩</span> Export backup</button><button class="btn btn-secondary" data-action="import-json"><span class="inline-icon">⇧</span> Restore backup</button>`)}
      <div class="content-grid"><section class="panel"><div class="panel-header"><div><h2>Import examination workbook</h2><p>Excel .xlsx/.xlsm files are parsed locally in your browser. The source file is not edited.</p></div><span class="status ${pending?'pending':sheets.length?'ok':'neutral'}">${pending?'Preview ready':sheets.length?'Workbook scanned':'Waiting for file'}</span></div><div class="panel-body"><div class="import-drop" id="importDrop"><div class="upload-symbol">⇧</div><h3>Upload the First Terminal Examination workbook</h3><p>Choose <b>First Terminal Examination 2083.xlsx</b>. The app will list every worksheet (including hidden tabs), map the class mark-entry sheets and flag formula-based marks that should not be treated as entered scores.</p><input type="file" id="workbookFile" accept=".xlsx,.xlsm,.xls" hidden /><button class="btn btn-primary" data-action="choose-workbook"><span class="inline-icon">＋</span> Choose Excel file</button>${pendingFileName?`<div class="file-name">Selected: ${esc(pendingFileName)}</div>`:''}<div id="importWorking" class="subtle" style="font-size:10px;margin-top:10px"></div></div>
      ${pending?`<div style="margin-top:17px;border:1px solid #e5ebf5;border-radius:12px;overflow:hidden"><div class="table-meta"><span><b>Import preview</b> · ${esc(pending.fileName)}</span><span>${pending.totalStudents} student row(s) mapped</span></div><div class="table-wrap"><table><thead><tr><th>Class / section</th><th>Source worksheet</th><th>Students detected</th><th>Subjects detected</th><th>Marks loaded</th><th>Warnings</th></tr></thead><tbody>${pending.classes.map(c=>`<tr><td>${esc(classInfo(c.classId).label)}</td><td>${esc(c.sheetName)}</td><td>${c.students.length}</td><td>${c.subjects.length}</td><td>${c.markCount}</td><td>${c.issues.length?`<span class="status pending">${c.issues.length} warning(s)</span>`:'<span class="status ok">No warnings</span>'}</td></tr>`).join('')}</tbody></table></div><div style="padding:14px;display:flex;justify-content:flex-end;gap:8px"><button class="btn btn-secondary" data-action="cancel-import">Cancel</button><button class="btn btn-primary" data-action="commit-import">Confirm and import</button></div></div>`:''}
      </div></section>
      <section class="panel"><div class="panel-header"><div><h2>Workbook overview</h2><p>${sheets.length?'Last scanned file structure':'Workbook scan will appear here'}</p></div></div><div class="panel-body">${sheets.length?`<div class="audit-summary-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="mini-stat"><span>Total worksheets</span><b>${sheets.length}</b></div><div class="mini-stat"><span>Hidden worksheets</span><b>${hiddenSheets.length}</b></div><div class="mini-stat"><span>Visible worksheets</span><b>${visibleSheets.length}</b></div><div class="mini-stat"><span>Formula error caches</span><b>${state.workbookMeta.cachedErrors||0}</b></div></div><div class="notice-box"><span class="notice-icon">ⓘ</span><div><b>Formula errors require review</b><p>Cached formula errors may include unused template rows. Only active source values and the actual rule need review; formula caches must not become marks.</p></div></div>`:`<div class="empty-state"><div class="empty-icon">▤</div><b>No workbook scanned</b><p>Upload the original .xlsx workbook to inspect its complete sheet inventory.</p></div>`}</div></section></div>
      ${sheets.length?`<section class="panel table-panel" style="margin-top:18px"><div class="panel-header"><div><h2>Worksheet inventory</h2><p>All sheets are recorded; hidden worksheets are retained in the inventory.</p></div><div class="toolbar-right"><select class="select-control" id="importSheetFilter"><option value="all" ${importFilter==='all'?'selected':''}>All worksheets</option><option value="visible" ${importFilter==='visible'?'selected':''}>Visible only</option><option value="hidden" ${importFilter==='hidden'?'selected' : ''}>Hidden only</option></select></div></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Worksheet</th><th>Visibility</th><th>Used range</th><th>Rows</th><th>Columns</th><th>Formula cells</th><th>Error caches</th></tr></thead><tbody>${sheets.filter(s=>importFilter==='all'||(importFilter==='hidden'&&s.hidden)||(importFilter==='visible'&&!s.hidden)).map((s,i)=>`<tr><td>${i+1}</td><td><b>${esc(s.name)}</b></td><td>${s.hidden?'<span class="status pending">Hidden</span>':'<span class="status ok">Visible</span>'}</td><td class="mono">${esc(s.range||'—')}</td><td class="mono">${s.rows}</td><td class="mono">${s.cols}</td><td class="mono">${s.formulas}</td><td class="mono">${s.errors}</td></tr>`).join('')}</tbody></table></div></section>`:''}`;
  }
  function renderAudit() {
    const meta=state.workbookMeta;
    const issues=state.auditIssues || [];
    const issueRows=issues.slice(0,500).map((issue,i)=>`<tr><td>${i+1}</td><td>${esc(issue.classId?classInfo(issue.classId).label:'—')}</td><td>${esc(issue.sheet||'—')}</td><td>${esc(issue.cell||'—')}</td><td>${esc(issue.type||'Warning')}</td><td style="white-space:normal;min-width:230px">${esc(issue.message||'')}</td><td>${esc(issue.status||'Needs review')}</td></tr>`).join('');
    return `${heading('QUALITY CONTROL','Data & Formula Audit','Review the source-workbook inventory and import warnings. Workbook formula caches are never considered verified results.', `<button class="btn btn-secondary" data-action="export-audit"><span class="inline-icon">⇩</span> Export issue report</button><button class="btn btn-primary" data-action="go-import">Import workbook</button>`)}
      <div class="audit-summary-grid"><div class="mini-stat"><span>Worksheets scanned</span><b>${meta?.sheets?.length||0}</b></div><div class="mini-stat"><span>Formula cells</span><b>${(meta?.formulaCount||0).toLocaleString()}</b></div><div class="mini-stat"><span>Cached formula errors</span><b>${(meta?.cachedErrors||0).toLocaleString()}</b></div><div class="mini-stat"><span>Issues in app</span><b>${issues.length}</b></div></div>
      <div class="grade-config-warning"><strong>Important:</strong> structural scans can include formulas copied into unused rows. Do not interpret every cached error as a live student problem. Resolve the active-data rules and test examples before publishing results.</div>
      <section class="panel table-panel"><div class="panel-header"><div><h2>Validation issues and review notes</h2><p>${issues.length ? `${issues.length} issue(s) recorded. Showing the first 500.` : 'No current import issues have been recorded.'}</p></div><button class="panel-link" data-action="clear-audit">Clear app issue list</button></div>${issues.length?`<div class="table-wrap"><table><thead><tr><th>#</th><th>Class</th><th>Worksheet</th><th>Cell</th><th>Type</th><th>Details</th><th>Status</th></tr></thead><tbody>${issueRows}</tbody></table></div>`:emptyState('No app issues recorded','Import the source workbook to record worksheet and formula-based mark warnings.')}</section>
      ${meta?`<section class="panel" style="margin-top:18px"><div class="panel-header"><div><h2>Source workbook metadata</h2><p>Read-only structural audit summary</p></div></div><div class="panel-body"><div class="form-grid"><div><span class="subtle">File name</span><div><b>${esc(meta.fileName)}</b></div></div><div><span class="subtle">File size</span><div><b>${esc(meta.fileSizeLabel)}</b></div></div><div><span class="subtle">Visible / hidden tabs</span><div><b>${meta.visibleCount} / ${meta.hiddenCount}</b></div></div><div><span class="subtle">Scanned at</span><div><b>${esc(meta.scannedAt)}</b></div></div></div></div></section>`:''}`;
  }
  function renderSettings() {
    const s=state.settings;
    const gradeRules=gradeRulesFor(selectedGradePolicyClass).map((r,i)=>`<div class="grade-rule-grid" style="margin-bottom:9px"><div class="form-field"><label>Minimum percentage</label><input class="input-control" type="number" min="0" max="100" step="any" data-grade-field="minPct" data-grade-index="${i}" value="${esc(r.minPct)}"></div><div class="form-field"><label>Grade label</label><input class="input-control" data-grade-field="grade" data-grade-index="${i}" value="${esc(r.grade||'')}"></div><div class="form-field"><label>Grade point (optional)</label><input class="input-control" type="number" min="0" step="any" data-grade-field="gpa" data-grade-index="${i}" value="${esc(r.gpa??'')}"></div><div class="form-field"><label>Policy note</label><input class="input-control" data-grade-field="note" data-grade-index="${i}" value="${esc(r.note||'')}"></div><button class="btn btn-danger btn-small remove-rule" data-action="remove-grade-rule" data-index="${i}">Remove</button></div>`).join('');
    const setupSubs=subjectsFor(selectedSetupClass);
    const subjectConfigCards=setupSubs.map(subject=>`<section class="panel" style="margin-bottom:12px"><div class="panel-header"><div><h2>${esc(subject.name)}</h2><p>${subject.components.length} component(s) detected from source worksheet</p></div><span class="status neutral">${esc(classInfo(selectedSetupClass).label)}</span></div><div class="table-wrap"><table><thead><tr><th>Component</th><th>Full marks</th><th>Pass marks (optional)</th></tr></thead><tbody>${componentList(subject).map(comp=>`<tr><td><b>${esc(comp.label)}</b></td><td><input class="input-control" style="max-width:130px;min-height:32px" type="number" min="0" step="any" data-setup-class="${esc(selectedSetupClass)}" data-setup-subject="${esc(subject.id)}" data-setup-component="${esc(comp.id)}" data-setup-field="maxMarks" value="${esc(comp.maxMarks??'')}" placeholder="Not set"></td><td><input class="input-control" style="max-width:130px;min-height:32px" type="number" min="0" step="any" data-setup-class="${esc(selectedSetupClass)}" data-setup-subject="${esc(subject.id)}" data-setup-component="${esc(comp.id)}" data-setup-field="passMarks" value="${esc(comp.passMarks??'')}" placeholder="Optional"></td></tr>`).join('')}</tbody></table></div></section>`).join('');
    let body='';
    if(settingsTab==='school') {
      body=`<section class="panel"><div class="panel-header"><div><h2>School and examination identity</h2><p>Used in the dashboard, print views and exports.</p></div></div><div class="panel-body"><div class="form-grid"><div class="form-field full"><label>School name</label><input class="input-control" name="schoolName" value="${esc(s.schoolName)}"></div><div class="form-field full"><label>Address</label><input class="input-control" name="address" value="${esc(s.address)}"></div><div class="form-field"><label>Established</label><input class="input-control" name="established" value="${esc(s.established)}"></div><div class="form-field"><label>Academic year (BS)</label><input class="input-control" name="academicYear" value="${esc(s.academicYear)}"></div><div class="form-field full"><label>Examination title</label><input class="input-control" name="examName" value="${esc(s.examName)}"></div><div class="form-field"><label>School motto (optional)</label><input class="input-control" name="motto" value="${esc(s.motto)}"></div><div class="form-field"><label>Headteacher</label><input class="input-control" name="headteacher" value="${esc(s.headteacher)}"></div><div class="form-field"><label>Exam coordinator</label><input class="input-control" name="examCoordinator" value="${esc(s.examCoordinator)}"></div><div class="form-field"><label>Secondary incharge</label><input class="input-control" name="secondaryIncharge" value="${esc(s.secondaryIncharge)}"></div><div class="form-field"><label>Primary incharge</label><input class="input-control" name="primaryIncharge" value="${esc(s.primaryIncharge)}"></div></div><div style="margin-top:18px;display:flex;justify-content:flex-end"><button class="btn btn-primary" data-action="save-settings">Save school profile</button></div></div></section>`;
    } else if(settingsTab==='subjects') {
      body=`<div class="grade-config-warning"><strong>Subject and full-mark setup:</strong> subject names/components are detected from the workbook’s class marks sheets. Full marks and pass marks are left blank unless the app user configures them. Confirm them against the school-approved exam scheme before generating final results.</div><div class="toolbar"><div class="toolbar-left"><select class="select-control" id="setupClassFilter">${classSelectOptions(selectedSetupClass)}</select></div><div class="toolbar-right"><button class="btn btn-primary" data-action="add-subject">＋ Add subject</button></div></div>${subjectConfigCards||emptyState('No subjects found for this class','Import the original workbook or add a subject manually.','add-subject','Add subject')}`;
    } else if(settingsTab==='grading') {
      body=`<div class="toolbar"><div class="toolbar-left"><label for="gradingClassFilter" class="subtle" style="font-size:10px">Configure grade scale for:</label><select class="select-control" id="gradingClassFilter">${classSelectOptions(selectedGradePolicyClass)}</select></div></div><section class="panel"><div class="panel-header"><div><h2>School-approved grade scale</h2><p>Add thresholds only after verifying the policy for this class/exam. A scale is never automatically shared across classes.</p></div><button class="btn btn-secondary btn-small" data-action="add-grade-rule">＋ Add threshold</button></div><div class="panel-body"><div class="grade-config-warning">No grade scale is pre-filled because the source workbook contains broken named ranges and formula references. Configure a separate policy for each applicable class. GPA, theory/practical rules, absent handling, optional subjects and pass criteria may require additional class-specific logic.</div>${gradeRules||'<div class="empty-state" style="padding:25px 10px"><div class="empty-icon">⌁</div><b>No grade thresholds configured</b><p>Add the school-approved minimum percentage, grade label and optional grade point.</p></div>'}<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:17px"><button class="btn btn-secondary" data-action="reset-grade-scale">Clear all rules</button><button class="btn btn-primary" data-action="save-grade-scale">Save grading policy</button></div></div></section>`;
    } else {
      body=`<div class="two-col"><section class="panel"><div class="panel-header"><div><h2>Backup and restore</h2><p>Export all app records into a JSON backup file.</p></div></div><div class="panel-body"><p class="subtle" style="font-size:10px;line-height:1.6">This app stores records inside the current browser profile. Clearing browser data may delete this workspace. Keep a backup file in a safe place.</p><button class="btn btn-primary" data-action="export-backup">⇩ Download complete backup</button><div style="height:10px"></div><button class="btn btn-secondary" data-action="import-json">⇧ Restore backup JSON</button><input type="file" id="backupFile" accept="application/json,.json" hidden></div></section><section class="panel"><div class="panel-header"><div><h2>Reset this workspace</h2><p>Destructive action; export a backup first.</p></div></div><div class="panel-body"><p class="subtle" style="font-size:10px;line-height:1.6">This clears student records, subjects, marks, imports and local issue records in this browser. It does not change your original Excel file.</p><button class="btn btn-danger" data-action="reset-app">Reset all local app data</button></div></section></div>`;
    }
    const settingsHeadingAction = settingsTab==='school' ? `<button class="btn btn-primary" data-action="save-settings"><span class="inline-icon">✓</span> Save settings</button>` : '';
    return `${heading('CONFIGURATION','Settings','Keep school identity, subject structure and grading policy in one place. Grading rules are not assumed from unresolved workbook formulas.', settingsHeadingAction)}
      <div class="settings-tabs"><button class="settings-tab ${settingsTab==='school'?'active':''}" data-action="settings-tab" data-tab="school">School profile</button><button class="settings-tab ${settingsTab==='subjects'?'active':''}" data-action="settings-tab" data-tab="subjects">Subjects & full marks</button><button class="settings-tab ${settingsTab==='grading'?'active':''}" data-action="settings-tab" data-tab="grading">Grading policy</button><button class="settings-tab ${settingsTab==='data'?'active':''}" data-action="settings-tab" data-tab="data">Local data</button></div>${body}`;
  }
  function initials(name) { return String(name || '?').trim().split(/\s+/).slice(0,2).map(x=>x.charAt(0).toUpperCase()).join('') || '?'; }
  function emptyState(title, message, action = '', actionLabel = '') {
    return `<div class="empty-state"><div class="empty-icon">▧</div><b>${esc(title)}</b><p>${esc(message)}</p>${action?`<button class="btn btn-primary btn-small" data-action="${esc(action)}">${esc(actionLabel)}</button>`:''}</div>`;
  }
  function toast(title, message, error = false) {
    const root=document.getElementById('toastRegion'); if (!root) return;
    const item=document.createElement('div'); item.className='toast'+(error?' error':'');
    item.innerHTML=`<span class="toast-icon">${error?'!':'✓'}</span><div class="toast-copy"><b>${esc(title)}</b><span>${esc(message)}</span></div>`;
    root.appendChild(item); window.setTimeout(()=>item.remove(),4500);
  }
  function openModal(title, subtitle, body, footer, idName='genericModal') {
    document.getElementById('modalRoot').innerHTML=`<div class="modal-backdrop" data-action="backdrop-close"><section class="modal" id="${esc(idName)}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="close-button" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body">${body}</div><div class="modal-footer">${footer}</div></section></div>`;
  }
  function closeModal() { document.getElementById('modalRoot').innerHTML=''; }
  function openStudentModal(studentId = '') {
    const existing=state.students.find(s=>s.id===studentId);
    const s=existing||{ classId:selectedStudentClass, roll:'', name:'', symbolNo:'', registrationNo:'', dob:'', gender:'', address:'', fatherName:'', motherName:'', attendance:'', remarks:'', guardian:'', contact:'' };
    const body=`<form id="studentForm" class="form-grid"><input type="hidden" name="id" value="${esc(existing?.id||'')}"><div class="form-field"><label>Class / section *</label><select class="select-control" name="classId" required>${classSelectOptions(s.classId)}</select></div><div class="form-field"><label>Roll number</label><input class="input-control" name="roll" value="${esc(s.roll)}"></div><div class="form-field full"><label>Student name *</label><input class="input-control" name="name" required value="${esc(s.name)}"></div><div class="form-field"><label>Symbol number</label><input class="input-control" name="symbolNo" value="${esc(s.symbolNo)}"></div><div class="form-field"><label>Registration number</label><input class="input-control" name="registrationNo" value="${esc(s.registrationNo)}"></div><div class="form-field"><label>Date of birth</label><input class="input-control" name="dob" value="${esc(s.dob)}" placeholder="As recorded in source"></div><div class="form-field"><label>Gender (optional)</label><input class="input-control" name="gender" value="${esc(s.gender)}"></div><div class="form-field"><label>Father's name (optional)</label><input class="input-control" name="fatherName" value="${esc(s.fatherName)}"></div><div class="form-field"><label>Mother's name (optional)</label><input class="input-control" name="motherName" value="${esc(s.motherName)}"></div><div class="form-field full"><label>Address (optional)</label><input class="input-control" name="address" value="${esc(s.address)}"></div><div class="form-field"><label>Guardian name (optional)</label><input class="input-control" name="guardian" value="${esc(s.guardian)}"></div><div class="form-field"><label>Contact (optional)</label><input class="input-control" name="contact" value="${esc(s.contact)}"></div><div class="form-field"><label>Attendance note</label><input class="input-control" name="attendance" value="${esc(s.attendance)}"></div><div class="form-field"><label>Remarks</label><input class="input-control" name="remarks" value="${esc(s.remarks)}"></div></form>`;
    openModal(existing?'Edit student':'Add student', 'Student details are saved locally in this browser.', body, `<button class="btn btn-secondary" data-action="close-modal">Cancel</button><button class="btn btn-primary" data-action="save-student">Save student</button>`, 'studentModal');
  }

  // Excel workbook helpers: collect metadata, map known class tabs, and quarantine formula-based marks.
  const ERROR_VALUES = new Set(['#REF!','#N/A','#VALUE!','#NAME?','#DIV/0!','#NUM!','#NULL!']);
  function cellAt(ws, r, c) { return ws[XLSX.utils.encode_cell({r,c})] || null; }
  function valAt(ws, r, c) { const cell=cellAt(ws,r,c); return cell ? cell.v : null; }
  function isErrorValue(v) { return typeof v === 'string' && ERROR_VALUES.has(v.trim().toUpperCase()); }
  function worksheetMeta(wb, fileName, fileSize) {
    let formulaCount=0, cachedErrors=0;
    const sheets = wb.SheetNames.map((name, i) => {
      const ws=wb.Sheets[name]; const ref=ws['!ref']||'A1'; const range=XLSX.utils.decode_range(ref);
      let formulas=0, errors=0;
      for (const address of Object.keys(ws)) {
        if (address[0]==='!') continue;
        const cell=ws[address];
        if (cell && cell.f) formulas++;
        if (cell && (cell.t === 'e' || isErrorValue(cell.v) || isErrorValue(cell.w))) errors++;
      }
      formulaCount+=formulas; cachedErrors+=errors;
      const bookSheet=wb.Workbook?.Sheets?.find(sh=>sh.name===name);
      const hidden=!!(bookSheet && Number(bookSheet.Hidden)>0);
      return { name, hidden, range: ref, rows: range.e.r-range.s.r+1, cols: range.e.c-range.s.c+1, formulas, errors, role: classifySheet(name) };
    });
    const fileSizeLabel = fileSize > 1024*1024 ? (fileSize/1024/1024).toFixed(2)+' MB' : Math.max(1,Math.round(fileSize/1024))+' KB';
    return { fileName, fileSize, fileSizeLabel, scannedAt: new Date().toLocaleString(), sheets, visibleCount:sheets.filter(s=>!s.hidden).length, hiddenCount:sheets.filter(s=>s.hidden).length, formulaCount, cachedErrors };
  }
  function classifySheet(name) {
    const n=norm(name);
    if (['home','marks entry','students detail','gradesheet','gradeledger','markledger'].includes(n)) return 'Navigation / report menu';
    if (n==='evaluation') return 'Evaluation summary';
    if (n==='average') return 'Subject average';
    if (n.includes('gradesheet')) return 'Gradesheet report';
    if (n.includes('gradeledger')) return 'Grade ledger';
    if (n.includes('markledger')) return 'Mark ledger';
    if (n.includes('student') || n.includes('subject detail') || n.includes('subject')) return 'Roster / subject configuration';
    if (n.includes('home')) return 'Class configuration';
    if (n==='result analysis') return 'Result analysis';
    if (['ecd','kga','kgb','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','4a','4b'].includes(n)) return 'Mark entry';
    return 'Supporting / lookup / unknown';
  }
  function rowText(row) { return (row||[]).map(v=>String(v??'').trim()).filter(Boolean).join(' ').toLowerCase(); }
  function detectHeaderAndRows(ws, classId) {
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
    let headerRow=0;
    for(let r=0;r<Math.min(10,rows.length);r++) {
      const t=rowText(rows[r]);
      if(t.includes('name') && (t.includes('roll') || t.includes('grade') || t.includes('student'))) { headerRow=r; break; }
    }
    const headers=rows[headerRow]||[];
    let nameCol=headers.findIndex(v=>/name/i.test(String(v??'')));
    let rollCol=headers.findIndex(v=>/roll/i.test(String(v??'')));
    let symbolCol=headers.findIndex(v=>/symbol/i.test(String(v??'')));
    let registrationCol=headers.findIndex(v=>/registration/i.test(String(v??'')));
    if(nameCol<0) nameCol=3;
    if(rollCol<0) rollCol=2;
    const componentRow=rows[headerRow+1]||[];
    const hasComponents=componentRow.some(v=>['TH','IN','PR','THEORY','INTERNAL','PRACTICAL'].includes(String(v??'').trim().toUpperCase()));
    const dataStart=headerRow+(hasComponents?2:1);
    const subjectStarts=[];
    for(let c=nameCol+1;c<headers.length;c++) {
      const h=String(headers[c]??'').trim();
      if(!h) continue;
      const lower=h.toLowerCase();
      if(/attend|remarks?|total|percentage|percent|gpa|rank|status|grade|student.?s? name|roll no|symbol|registration|^sn$/.test(lower)) break;
      if (c <= nameCol) continue;
      subjectStarts.push({col:c,name:h});
    }
    // Some sheets have labels like grade/roll/name before subject columns; the loop above starts after Name.
    const subjects=[];
    subjectStarts.forEach((start,i)=>{
      const next=subjectStarts[i+1]?.col ?? headers.findIndex((h,c)=>c>start.col && /attend|remarks?/i.test(String(h??'')));
      const stop=next>start.col?next:Math.min(headers.length,start.col+1+(hasComponents?1:0));
      let cols=[];
      for(let c=start.col;c<stop;c++) {
        const raw=hasComponents?String(componentRow[c]??'').trim():'';
        let label=raw;
        if(!label) label=(stop-start.col>1?`Component ${cols.length+1}`:'Mark');
        if(!['TH','IN','PR','THEORY','INTERNAL','PRACTICAL','READING','WRITING','MARK'].includes(label.toUpperCase()) && label.length>18) label=label.slice(0,18);
        if (label.toLowerCase().includes('attend') || label.toLowerCase().includes('remark')) break;
        cols.push({col:c,label:label.toUpperCase()==='THEORY'?'TH':label.toUpperCase()==='INTERNAL'?'IN':label.toUpperCase()==='PRACTICAL'?'PR':label});
      }
      if(!cols.length) cols=[{col:start.col,label:'Mark'}];
      const sid=`${classId}_${slug(start.name)}`;
      subjects.push({id:sid,name:start.name,components:cols.map(c=>({id:slug(c.label),label:c.label,maxMarks:null,passMarks:null,sourceCol:c.col+1}))});
    });
    const students=[], issues=[];
    for(let r=dataStart;r<rows.length;r++) {
      const row=rows[r]||[]; const rawName=row[nameCol]; const nameCell=cellAt(ws,r,nameCol);
      if(rawName===null||rawName===undefined||String(rawName).trim()===''||isErrorValue(rawName)||nameCell?.t==='e'||isErrorValue(nameCell?.w)) continue;
      // Skip obvious repeated heading rows and formula error artifacts.
      const name=String(rawName).trim();
      if (/^name of student/i.test(name) || /^student.?s? name/i.test(name)) continue;
      const rollVal=row[rollCol];
      const symbolVal=symbolCol>=0?row[symbolCol]:null;
      const registrationVal=registrationCol>=0?row[registrationCol]:null;
      const student={ tempKey:`${classId}:${String(rollVal??'').trim()}:${norm(name)}`, classId, roll:rollVal===null||rollVal===undefined?'':String(rollVal), name, symbolNo:symbolVal===null||symbolVal===undefined?'':String(symbolVal), registrationNo:registrationVal===null||registrationVal===undefined?'':String(registrationVal), attendance:'', remarks:'', sourceRow:r+1, marks:{} };
      let validMarkCount=0;
      subjects.forEach(subject=>subject.components.forEach(comp=>{
        const c=comp.sourceCol-1; const cell=cellAt(ws,r,c); const raw=cell?cell.v:row[c];
        if(cell?.f) {
          if(raw!==null&&raw!==undefined&&raw!==''&& !isErrorValue(raw)) issues.push({classId,sheet:classInfo(classId).markSheet,cell:XLSX.utils.encode_cell({r,c}),type:'Formula-based score skipped',message:`${subject.name} / ${comp.label}: this cell contains a formula. Its cached value was not imported as a mark.`,status:'Needs review'});
          return;
        }
        if(raw===null||raw===undefined||raw==='') return;
        if(cell?.t==='e' || isErrorValue(raw) || isErrorValue(cell?.w)) { issues.push({classId,sheet:classInfo(classId).markSheet,cell:XLSX.utils.encode_cell({r,c}),type:'Excel error in input range',message:`${subject.name} / ${comp.label}: ${String(cell?.w || raw)} was skipped.`,status:'Needs review'}); return; }
        const value=typeof raw==='number'?raw:(String(raw).trim()!=='' && Number.isFinite(Number(raw))?Number(raw):null);
        if(value===null) return;
        student.marks[subject.id] ||= {};
        student.marks[subject.id][comp.id]=value; validMarkCount++;
      }));
      const attendIndex=headers.findIndex(v=>/attend/i.test(String(v??'')));
      const remarksIndex=headers.findIndex(v=>/remarks?/i.test(String(v??'')));
      if(attendIndex>=0) student.attendance=row[attendIndex]??'';
      if(remarksIndex>=0) student.remarks=row[remarksIndex]??'';
      student.marksLoaded=validMarkCount;
      students.push(student);
    }
    return {classId,sheetName:classInfo(classId).markSheet,students,subjects,issues,markCount:students.reduce((a,s)=>a+s.marksLoaded,0),headerRow,dataStart};
  }
  function cellText(value) {
    if(value===null||value===undefined)return '';
    if(value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0,10);
    return String(value).trim();
  }
  function parseStudentDetailSheet(ws, classId) {
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
    let hr=0;
    for(let r=0;r<Math.min(8,rows.length);r++) {
      const t=rowText(rows[r]);
      if(t.includes('name') && (t.includes('sn')||t.includes('roll')||t.includes('student'))) {hr=r;break;}
    }
    const headers=rows[hr]||[];
    const col=(pattern)=>headers.findIndex(v=>pattern.test(String(v??'')));
    const nameCol=col(/name of students|student.?s? name|^name$/i)>=0?col(/name of students|student.?s? name|^name$/i):col(/name/i);
    if(nameCol<0)return {records:[],issues:[{classId,sheet:classInfo(classId).rosterSheet||'',cell:'',type:'Roster header not mapped',message:'Could not confidently locate the student-name column in the class student-detail sheet.',status:'Needs review'}]};
    const snCol=col(/^sn$|serial/i); const rollCol=col(/roll/i); const symbolCol=col(/symbol/i); const regCol=col(/registration/i); const dobCol=col(/\bdob\b|date of birth/i); const genderCol=col(/gender/i); const addressCol=col(/^address$/i); const fatherCol=col(/father.?s? name/i); const motherCol=col(/mother.?s? name/i); const contactCol=col(/contact/i);
    const nextRow=rowText(rows[hr+1]||[]);
    const secondHeader=/\b(code|subject|fm|ch|theory|practical|internal)\b/.test(nextRow) && /\b(subject|fm|ch|code)\b/.test(nextRow);
    const start=hr+(secondHeader?2:1), records=[];
    for(let r=start;r<rows.length;r++) {
      const row=rows[r]||[], rawName=row[nameCol], nameCell=cellAt(ws,r,nameCol);
      if(rawName===null||rawName===undefined||String(rawName).trim()===''||isErrorValue(rawName)||nameCell?.t==='e'||isErrorValue(nameCell?.w))continue;
      const name=cellText(rawName); if(!name||/^name of students/i.test(name))continue;
      const get=(idx)=>idx>=0?cellText(row[idx]):'';
      records.push({classId,name,roll:get(rollCol>=0?rollCol:snCol),symbolNo:get(symbolCol),registrationNo:get(regCol),dob:get(dobCol),gender:get(genderCol),address:get(addressCol),fatherName:get(fatherCol),motherName:get(motherCol),contact:get(contactCol),sourceRow:r+1});
    }
    return {records,issues:[]};
  }
  function slug(value) { return String(value||'field').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'field'; }
  async function readWorkbook(file) {
    if (!window.XLSX) { toast('Excel parser not loaded','Connect to the internet and reload the page, or bundle SheetJS locally.',true); return; }
    const status=document.getElementById('importWorking'); if(status) status.textContent='Reading workbook and checking worksheet structure…';
    pendingFileName=file.name;
    try {
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf,{type:'array',cellFormula:true,cellDates:true,cellStyles:false});
      const meta=worksheetMeta(wb,file.name,file.size);
      const importedClasses=[]; const importIssues=[]; const mappedNames=[];
      CLASSES.forEach(c=>{
        const sheetName=wb.SheetNames.find(n=>n===c.markSheet);
        if(!sheetName) { importIssues.push({classId:c.id,sheet:c.markSheet,cell:'',type:'Missing class sheet',message:`Expected marks worksheet "${c.markSheet}" was not present.`,status:'Needs review'}); return; }
        const parsed=detectHeaderAndRows(wb.Sheets[sheetName],c.id);
        parsed.sheetName=sheetName;
        if(c.rosterSheet && wb.Sheets[c.rosterSheet]) {
          const details=parseStudentDetailSheet(wb.Sheets[c.rosterSheet],c.id);
          parsed.detailCount=details.records.length;
          parsed.issues.push(...details.issues);
          const detailByName=new Map(details.records.map(d=>[norm(d.name),d]));
          const detailByRoll=new Map(details.records.filter(d=>d.roll!=='').map(d=>[String(d.roll),d]));
          parsed.students.forEach(stu=>{
            const detail=detailByName.get(norm(stu.name)) || detailByRoll.get(String(stu.roll));
            if(!detail) return;
            ['symbolNo','registrationNo','dob','gender','address','fatherName','motherName','contact'].forEach(field=>{if(detail[field]!=='' && detail[field]!==undefined)stu[field]=detail[field];});
          });
          const unmatched=parsed.students.filter(stu=>!detailByName.has(norm(stu.name)) && !detailByRoll.has(String(stu.roll))).length;
          if(unmatched)parsed.issues.push({classId:c.id,sheet:c.rosterSheet,cell:'',type:'Roster enrichment mismatch',message:`${unmatched} name(s) from the mark sheet could not be matched to the student-detail sheet. Review student identities after import.`,status:'Needs review'});
        }
        if(parsed.students.length===0) parsed.issues.push({classId:c.id,sheet:sheetName,cell:'',type:'No roster detected',message:'No student names were detected using the current header mapping. Check this sheet manually before importing.',status:'Needs review'});
        if(parsed.subjects.length===0) parsed.issues.push({classId:c.id,sheet:sheetName,cell:'',type:'No subject mapping detected',message:'No subject columns were confidently detected. Student rows may still be imported, but subjects need review.',status:'Needs review'});
        importedClasses.push(parsed); importIssues.push(...parsed.issues); mappedNames.push(sheetName);
      });
      // Formula/cached-error counts are workbook-wide structural figures; surface them as one audit context note.
      if(meta.cachedErrors) importIssues.unshift({classId:'',sheet:'Workbook',cell:'',type:'Cached formula errors',message:`Structural scan found ${meta.cachedErrors.toLocaleString()} cached formula error values across ${meta.sheets.length} sheets. These may include unused template rows; they are not imported as marks. Review relevant active ranges before result publication.`,status:'Needs review'});
      pendingImport={fileName:file.name,meta,classes:importedClasses,totalStudents:importedClasses.reduce((a,c)=>a+c.students.length,0),totalMarks:importedClasses.reduce((a,c)=>a+c.markCount,0),issues:importIssues,unmappedSheets:meta.sheets.filter(s=>!mappedNames.includes(s.name)).length};
      state.workbookMeta=meta;
      state.auditIssues=importIssues;
      saveState();
      if(status) status.textContent=`Scanned ${meta.sheets.length} worksheets; ${pendingImport.totalStudents} student rows detected. Review preview before committing.`;
      toast('Workbook scanned',`${meta.sheets.length} worksheets found, including ${meta.hiddenCount} hidden sheet(s).`);
      renderPage();
    } catch(err) {
      console.error(err); if(status) status.textContent='Could not read this workbook. Check that it is a valid Excel file.';
      toast('Workbook could not be read',err?.message||'Unknown parsing error',true);
    }
  }
  function commitImport() {
    if(!pendingImport) { toast('No import preview','Choose a workbook before confirming.',true); return; }
    let added=0, updated=0, marksImported=0, subjectsImported=0;
    const classSummaries=[];
    pendingImport.classes.forEach(group=>{
      const currentSubjects=subjectsFor(group.classId);
      const subjectMap=new Map(currentSubjects.map(s=>[norm(s.name),s]));
      const committedSubjects=[];
      group.subjects.forEach(s=>{
        let target=subjectMap.get(norm(s.name));
        if(!target) {
          target={id:s.id,name:s.name,components:s.components.map(c=>({id:c.id,label:c.label,maxMarks:null,passMarks:null,sourceCol:c.sourceCol}))};
          currentSubjects.push(target); subjectMap.set(norm(target.name),target); subjectsImported++;
        } else {
          // Keep any configured full/pass marks; add newly detected components without overwriting an existing setup.
          s.components.forEach(sc=>{ if(!target.components.some(tc=>norm(tc.label)===norm(sc.label))) target.components.push({id:sc.id,label:sc.label,maxMarks:null,passMarks:null,sourceCol:sc.sourceCol}); });
        }
        committedSubjects.push({source:s,target});
      });
      state.subjects[group.classId]=currentSubjects;
      group.students.forEach(incoming=>{
        let existing=state.students.find(s=>s.classId===group.classId && ((incoming.roll!==''&&String(s.roll)===String(incoming.roll)) || (norm(s.name)===norm(incoming.name))));
        if(!existing) { existing={id:id('stu'),classId:group.classId}; state.students.push(existing); added++; }
        else updated++;
        Object.assign(existing,{roll:incoming.roll,name:incoming.name,classId:group.classId,symbolNo:incoming.symbolNo||existing.symbolNo||'',registrationNo:incoming.registrationNo||existing.registrationNo||'',dob:incoming.dob||existing.dob||'',gender:incoming.gender||existing.gender||'',address:incoming.address||existing.address||'',fatherName:incoming.fatherName||existing.fatherName||'',motherName:incoming.motherName||existing.motherName||'',contact:incoming.contact||existing.contact||'',attendance:incoming.attendance,remarks:incoming.remarks,sourceSheet:group.sheetName,sourceRow:incoming.sourceRow});
        committedSubjects.forEach(pair=>{
          const rawSubMarks=incoming.marks[pair.source.id]; if(!rawSubMarks) return;
          pair.source.components.forEach(comp=>{
            const v=rawSubMarks[comp.id]; if(v===undefined) return;
            const targetComp=pair.target.components.find(tc=>tc.id===comp.id)||pair.target.components.find(tc=>norm(tc.label)===norm(comp.label));
            if(!targetComp) return;
            putMark(existing.id,pair.target.id,targetComp.id,v); marksImported++;
          });
        });
      });
      classSummaries.push({classId:group.classId,students:group.students.length,subjects:group.subjects.length,marks:group.markCount});
    });
    const log={id:id('import'),fileName:pendingImport.fileName,date:new Date().toLocaleString(),records:pendingImport.totalStudents,marks:marksImported,summary:`${added} added, ${updated} updated, ${marksImported} marks loaded`,classCount:pendingImport.classes.length};
    state.importLog.push(log); state.importLog=state.importLog.slice(-30);
    // Keep audit warnings; unresolved workbook rules cannot be auto-cleared.
    saveState(); pendingImport=null; pendingFileName='';
    toast('Import complete',`${added} students added, ${updated} updated, ${marksImported} literal mark values loaded. Original workbook unchanged.`);
    activePage='dashboard'; document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page==='dashboard'));
    const crumb=document.getElementById('crumbCurrent'); if(crumb)crumb.textContent='Dashboard'; renderPage();
  }
  function exportBlob(blob, filename) {
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function downloadJSON() {
    const payload={format:'setidevi-school-result-backup',version:1,exportedAt:new Date().toISOString(),state};
    exportBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`setidevi-backup-${state.settings.academicYear||'data'}.json`);
    toast('Backup exported','The JSON backup contains the app data currently saved in this browser.');
  }
  function exportCSV(headers, rows, name) {
    const csv=[headers,...rows].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    exportBlob(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),name);
  }
  function exportStudents() {
    exportCSV(['Class','Roll','Student Name','Symbol No','Registration No','DOB','Gender','Address','Father Name','Mother Name','Attendance','Remarks','Guardian','Contact'], state.students.map(s=>[classInfo(s.classId).label,s.roll,s.name,s.symbolNo,s.registrationNo,s.dob,s.gender,s.address,s.fatherName,s.motherName,s.attendance,s.remarks,s.guardian,s.contact]), `students-${state.settings.academicYear}.csv`);
  }
  function currentLedgerCSV(classId) {
    const sub=subjectsFor(classId); const headers=['Class','Roll','Student Name',...sub.flatMap(s=>componentList(s).map(c=>`${s.name} - ${c.label}`)),...sub.map(s=>`${s.name} - total`),'Total entered','Attendance','Remarks'];
    const rows=studentsFor(classId).map(stu=>{
      const values=sub.flatMap(s=>componentList(s).map(c=>getMark(stu.id,s.id,c.id)??''));
      const subjectTotals=sub.map(s=>{const vals=componentList(s).map(c=>getMark(stu.id,s.id,c.id));return vals.some(v=>v!==null)?vals.reduce((a,v)=>a+(v??0),0):'';});
      const total=values.reduce((a,v)=>a+(v!==''?Number(v):0),0);
      return [classInfo(classId).label,stu.roll,stu.name,...values,...subjectTotals,total,stu.attendance,stu.remarks];
    });
    return {headers,rows};
  }
  function exportCurrentLedger() {const {headers,rows}=currentLedgerCSV(selectedLedgerClass);exportCSV(headers,rows,`mark-ledger-${selectedLedgerClass}-${state.settings.academicYear}.csv`);}
  function exportMarksCSV() {const {headers,rows}=currentLedgerCSV(selectedMarksClass);exportCSV(headers,rows,`marks-${selectedMarksClass}-${state.settings.academicYear}.csv`);}
  function exportAnalysis() {
    const headers=['Class','Students','With marks','Mark entry percent','Classes with subject mapping','Full marks configured'];
    const rows=CLASSES.map(c=>{const comp=marksCompletion(c.id);const st=studentsFor(c.id);const n=st.filter(s=>studentMarkSummary(s,c.id).entered>0).length;const su=subjectsFor(c.id);return [c.label,st.length,n,comp.pct,su.length,su.length>0&&su.every(s=>componentList(s).every(x=>numOrNull(x.maxMarks)!==null&&numOrNull(x.maxMarks)>0))?'Yes':'No'];});
    exportCSV(headers,rows,`result-analysis-${state.settings.academicYear}.csv`);
  }
  function exportAudit() {
    const headers=['Class','Worksheet','Cell','Type','Message','Status'];
    exportCSV(headers,(state.auditIssues||[]).map(i=>[i.classId?classInfo(i.classId).label:'',i.sheet,i.cell,i.type,i.message,i.status]),`formula-audit-${state.settings.academicYear}.csv`);
  }
  function syncMarksSelection() {
    // Rendered selectors already reflect the current selection; this hook keeps defaults aligned after page changes.
    const sub=subjectsFor(selectedMarksClass).find(s=>s.id===selectedMarksSubject);
    if(sub && !componentList(sub).some(c=>c.id===selectedMarksComponent)) selectedMarksComponent=componentList(sub)[0]?.id||'';
  }
  function captureSettings() {
    document.querySelectorAll('[name]').forEach(el=>{
      if (Object.prototype.hasOwnProperty.call(state.settings,el.name)) state.settings[el.name]=el.value.trim();
    });
    saveState(); toast('Settings saved','School profile and examination details have been saved.'); renderPage();
  }
  function saveGradeInputs() {
    const rules=gradeRulesFor(selectedGradePolicyClass);
    document.querySelectorAll('[data-grade-field]').forEach(el=>{
      const index=Number(el.dataset.gradeIndex), field=el.dataset.gradeField;
      if(!rules[index]) return;
      rules[index][field]=field==='minPct'||field==='gpa'?(el.value===''?'':Number(el.value)):el.value.trim();
    });
    state.gradeScales[selectedGradePolicyClass]=rules.filter(r=>r.grade!=='' && r.minPct!=='' && Number.isFinite(Number(r.minPct)) && Number(r.minPct)>=0 && Number(r.minPct)<=100);
    saveState(); toast('Grading policy saved',`The grade scale for ${classInfo(selectedGradePolicyClass).label} was saved. Verify all class-specific rules before official use.`); renderPage();
  }
  function saveStudentFromForm() {
    const form=document.getElementById('studentForm'); if(!form) return;
    const formData=new FormData(form); const raw=Object.fromEntries(formData.entries());
    const name=String(raw.name||'').trim(); if(!name) { toast('Student name required','Enter a student name before saving.',true); return; }
    let stu=state.students.find(s=>s.id===raw.id); const isNew=!stu;
    if(!stu) { stu={id:id('stu')}; state.students.push(stu); }
    Object.assign(stu,{classId:raw.classId,roll:raw.roll.trim(),name,symbolNo:raw.symbolNo.trim(),registrationNo:raw.registrationNo.trim(),dob:raw.dob.trim(),gender:raw.gender.trim(),address:raw.address.trim(),fatherName:raw.fatherName.trim(),motherName:raw.motherName.trim(),attendance:raw.attendance.trim(),remarks:raw.remarks.trim(),guardian:raw.guardian.trim(),contact:raw.contact.trim()});
    selectedStudentClass=stu.classId; saveState(); closeModal(); toast(isNew?'Student added':'Student updated',`${name} has been saved in ${classInfo(stu.classId).label}.`); renderPage();
  }
  function deleteStudent(studentId) {
    const stu=state.students.find(s=>s.id===studentId); if(!stu) return;
    if(!window.confirm(`Remove ${stu.name} from this browser workspace? Marks for this student will also be removed.`)) return;
    state.students=state.students.filter(s=>s.id!==studentId); delete state.marks[studentId]; saveState(); toast('Student removed',`${stu.name} and the student's saved marks were removed.`); renderPage();
  }
  function setMarkFromInput(input) {
    const studentId=input.dataset.markStudent, subjectId=input.dataset.markSubject, componentId=input.dataset.markComponent;
    if(!studentId||!subjectId||!componentId) return;
    if(input.value==='') { putMark(studentId,subjectId,componentId,''); saveState(); input.classList.remove('invalid'); const row=input.closest('tr'); const status=row?.querySelector('.status'); if(status) {status.className='status neutral';status.textContent='Pending';} return; }
    const val=Number(input.value); const sub=subjectsFor(selectedMarksClass).find(s=>s.id===subjectId); const comp=sub&&componentList(sub).find(c=>c.id===componentId); const max=numOrNull(comp?.maxMarks);
    if(!Number.isFinite(val)||val<0||(max!==null&&val>max)) {
      input.classList.add('invalid'); toast('Invalid mark',max!==null?`Enter a value from 0 to ${max}.`:'Enter a non-negative numeric mark.',true); return;
    }
    input.classList.remove('invalid'); putMark(studentId,subjectId,componentId,val); saveState();
    const row=input.closest('tr'); if(row) {
      const status=row.querySelector('.status'); if(status) {status.className='status ok';status.textContent='Entered';}
      const chip=row.querySelector('.total-chip'); if(chip&&sub) {const total=componentList(sub).reduce((a,c)=>a+(getMark(studentId,sub.id,c.id)??0),0);chip.textContent=fmtNum(total);}
    }
  }
  function chooseWorkbook() { document.getElementById('workbookFile')?.click(); }
  function restoreJSON() { document.getElementById('backupFile')?.click(); }
  function importBackupFile(file) {
    const reader=new FileReader();
    reader.onload=()=>{
      try {
        const obj=JSON.parse(String(reader.result)); const imported=obj.state || obj;
        if(!imported || !Array.isArray(imported.students) || !imported.settings) throw new Error('This file is not a recognized Setidevi app backup.');
        if(!window.confirm('Restore this backup into the current browser workspace? Current local records will be replaced.')) return;
        state=imported; pendingImport=null; saveState(); toast('Backup restored','The local workspace has been restored from JSON.'); renderPage();
      } catch(err) { toast('Backup could not be restored',err.message||'Invalid JSON backup.',true); }
    };
    reader.readAsText(file);
  }
  function openSubjectModal() {
    const body=`<form id="subjectForm" class="form-grid"><div class="form-field"><label>Class / section *</label><select class="select-control" name="classId" required>${classSelectOptions(selectedSetupClass)}</select></div><div class="form-field"><label>Subject name *</label><input class="input-control" name="subjectName" required placeholder="Exact subject name"></div><div class="form-field full"><label>Component labels *</label><input class="input-control" name="components" required placeholder="Example: TH, IN or Reading, Writing"><span class="help-text">Enter only the components applicable to this subject, separated by commas. Full marks are configured on the next screen.</span></div></form>`;
    openModal('Add subject','Use the workbook’s actual subject structure or enter a school-approved subject manually.',body,`<button class="btn btn-secondary" data-action="close-modal">Cancel</button><button class="btn btn-primary" data-action="save-subject">Add subject</button>`,'subjectModal');
  }
  function saveSubjectFromForm() {
    const form=document.getElementById('subjectForm'); if(!form)return;
    const fd=new FormData(form); const classId=String(fd.get('classId')||''); const name=String(fd.get('subjectName')||'').trim();
    const labels=String(fd.get('components')||'').split(',').map(x=>x.trim()).filter(Boolean);
    if(!name||!labels.length){toast('Subject details required','Enter a subject name and at least one component label.',true);return;}
    const subjects=subjectsFor(classId);
    if(subjects.some(s=>norm(s.name)===norm(name))){toast('Subject already exists',`A subject named “${name}” is already configured for ${classInfo(classId).label}.`,true);return;}
    const baseId=`${classId}_${slug(name)}`;
    subjects.push({id:baseId,name,components:labels.map(label=>({id:slug(label),label,maxMarks:null,passMarks:null}))});
    state.subjects[classId]=subjects; selectedSetupClass=classId; selectedMarksClass=classId; selectedMarksSubject=baseId; selectedMarksComponent=slug(labels[0]); saveState();closeModal();settingsTab='subjects';renderPage();toast('Subject added',`${name} was added. Configure full marks and pass marks before result validation.`);
  }
  function saveSubjectComponentSetup(input) {
    const classId=input.dataset.setupClass, subjectId=input.dataset.setupSubject, componentId=input.dataset.setupComponent, field=input.dataset.setupField;
    const subject=subjectsFor(classId).find(s=>s.id===subjectId); const comp=subject&&componentList(subject).find(c=>c.id===componentId);
    if(!comp||!['maxMarks','passMarks'].includes(field))return;
    const raw=input.value.trim(); const num=raw===''?null:Number(raw);
    if(raw!==''&&(!Number.isFinite(num)||num<0)){toast('Invalid configuration','Marks must be blank or a non-negative number.',true);input.value=comp[field]??'';return;}
    if(field==='passMarks' && num!==null && numOrNull(comp.maxMarks)!==null && num>Number(comp.maxMarks)){toast('Pass marks exceed full marks','Pass marks cannot be greater than full marks.',true);input.value=comp[field]??'';return;}
    if(field==='maxMarks' && num!==null && numOrNull(comp.passMarks)!==null && Number(comp.passMarks)>num){toast('Full marks too low','Full marks cannot be below the configured pass marks.',true);input.value=comp[field]??'';return;}
    comp[field]=num; saveState();
    toast('Component setup saved',`${subject.name} — ${comp.label} configuration updated.`);
  }
  function addGradeRule() {
    state.gradeScales ||= {}; if(!Array.isArray(state.gradeScales[selectedGradePolicyClass]))state.gradeScales[selectedGradePolicyClass]=[]; state.gradeScales[selectedGradePolicyClass].push({minPct:'',grade:'',gpa:'',note:''}); renderPage();
  }
  function removeGradeRule(index) { const rules=gradeRulesFor(selectedGradePolicyClass); rules.splice(index,1); state.gradeScales[selectedGradePolicyClass]=rules; saveState(); renderPage(); }
  function renderProfileModal() {
    openModal('Workspace information','Local browser-based prototype',`<p style="font-size:11px;line-height:1.7;color:#6f7c8f">This version is a client-side starting point for Shree Setidevi Secondary School. Records are stored in the current browser profile; there is no central database, login, multi-device synchronization or server-side permission system yet.</p><div class="notice-box"><span class="notice-icon">ⓘ</span><div><b>Before production</b><p>Move records to a secure database/backend, add authentication and role permissions, verify school-approved grading rules, then test result reports against reviewed workbook examples.</p></div></div>`,`<button class="btn btn-primary" data-action="close-modal">Close</button>`);
  }
  function clearAudit() { if(!window.confirm('Clear the app issue list? The original workbook is not affected.'))return; state.auditIssues=[];saveState();renderPage();toast('Issue list cleared','Only the local app issue list was cleared.'); }
  function resetApp() { if(!window.confirm('Reset all local records, subjects, marks, import history and settings in this browser? Export a backup first.'))return; state=blankState(); pendingImport=null;pendingFileName='';saveState();renderPage();toast('Workspace reset','Local app data was reset. The source Excel file is unchanged.'); }

  document.addEventListener('click', (event) => {
    const nav=event.target.closest('[data-page]');
    if(nav) { go(nav.dataset.page); return; }
    const el=event.target.closest('[data-action]'); if(!el) return;
    const action=el.dataset.action;
    switch(action) {
      case 'go-import': go('import'); break;
      case 'go-students': go('students'); break;
      case 'go-settings': settingsTab='grading';go('settings');break;
      case 'open-class-marks': selectedMarksClass=el.dataset.class; selectedMarksSubject=subjectsFor(selectedMarksClass)[0]?.id||''; selectedMarksComponent=subjectsFor(selectedMarksClass)[0]?.components?.[0]?.id||'';go('marks');break;
      case 'add-student': openStudentModal();break;
      case 'edit-student': openStudentModal(el.dataset.id);break;
      case 'delete-student': deleteStudent(el.dataset.id);break;
      case 'save-student': saveStudentFromForm();break;
      case 'choose-workbook': chooseWorkbook();break;
      case 'commit-import': commitImport();break;
      case 'cancel-import': pendingImport=null;pendingFileName='';renderPage();break;
      case 'export-backup': downloadJSON();break;
      case 'import-json': restoreJSON();break;
      case 'export-students': exportStudents();break;
      case 'export-ledger-csv': exportCurrentLedger();break;
      case 'export-mark-grid': exportMarksCSV();break;
      case 'export-analysis': exportAnalysis();break;
      case 'export-audit': exportAudit();break;
      case 'print-page': window.print();break;
      case 'settings-tab': settingsTab=el.dataset.tab;renderPage();break;
      case 'save-settings': captureSettings();break;
      case 'add-grade-rule': addGradeRule();break;
      case 'add-subject': openSubjectModal();break;
      case 'save-subject': saveSubjectFromForm();break;
      case 'save-grade-scale': saveGradeInputs();break;
      case 'remove-grade-rule': removeGradeRule(Number(el.dataset.index));break;
      case 'reset-grade-scale': if(window.confirm(`Clear all grade thresholds for ${classInfo(selectedGradePolicyClass).label}?`)) {state.gradeScales[selectedGradePolicyClass]=[];saveState();renderPage();} break;
      case 'clear-audit': clearAudit();break;
      case 'reset-app': resetApp();break;
      case 'close-modal': closeModal();break;
      case 'backdrop-close': if(event.target===el) closeModal();break;
    }
  });
  document.addEventListener('change', (event) => {
    const t=event.target;
    if(t.id==='studentClassFilter'){selectedStudentClass=t.value;studentSearch='';renderPage();}
    else if(t.id==='marksClassFilter'){selectedMarksClass=t.value;selectedMarksSubject=subjectsFor(selectedMarksClass)[0]?.id||'';selectedMarksComponent=subjectsFor(selectedMarksClass)[0]?.components?.[0]?.id||'';renderPage();}
    else if(t.id==='marksSubjectFilter'){selectedMarksSubject=t.value;selectedMarksComponent=subjectsFor(selectedMarksClass).find(s=>s.id===t.value)?.components?.[0]?.id||'';renderPage();}
    else if(t.id==='marksComponentFilter'){selectedMarksComponent=t.value;renderPage();}
    else if(t.id==='ledgerClassFilter'){selectedLedgerClass=t.value;renderPage();}
    else if(t.id==='gradeClassFilter'){selectedGradeClass=t.value;renderPage();}
    else if(t.id==='setupClassFilter'){selectedSetupClass=t.value;renderPage();}
    else if(t.id==='gradingClassFilter'){selectedGradePolicyClass=t.value;renderPage();}
    else if(t.id==='gradesheetStudentFilter'){selectedGradesheetStudent=t.value;renderPage();}
    else if(t.id==='importSheetFilter'){importFilter=t.value;renderPage();}
    else if(t.id==='workbookFile' && t.files?.[0]) readWorkbook(t.files[0]);
    else if(t.id==='backupFile' && t.files?.[0]) importBackupFile(t.files[0]);
    else if(t.dataset.markStudent) setMarkFromInput(t);
    else if(t.dataset.setupField) saveSubjectComponentSetup(t);
  });
  document.addEventListener('input', (event) => {
    const t=event.target;
    if(t.id==='studentSearch') {
      const start=t.selectionStart; studentSearch=t.value;
      const root=document.getElementById('appContent'); const position=t.value;
      renderPage(); const next=document.getElementById('studentSearch'); if(next){next.focus(); next.setSelectionRange(start,start);}
    } else if(t.dataset.markStudent) {
      // Save on change/blur rather than every keystroke, so decimal values can be completed naturally.
    }
  });
  document.addEventListener('keydown', (event) => {
    if(event.key==='Escape') closeModal();
    if(event.key==='Enter' && event.target.matches('.mark-input')) {
      event.preventDefault(); const inputs=[...document.querySelectorAll('.mark-input:not(:disabled)')]; const i=inputs.indexOf(event.target); if(i>=0&&inputs[i+1])inputs[i+1].focus();
    }
  });
  const sidebar=document.getElementById('sidebar');
  document.getElementById('menuToggle')?.addEventListener('click',()=>sidebar?.classList.toggle('open'));
  document.getElementById('sidebarClose')?.addEventListener('click',()=>sidebar?.classList.remove('open'));
  document.getElementById('profileButton')?.addEventListener('click',renderProfileModal);
  // Drop zone supports drag-and-drop Excel loading.
  document.addEventListener('dragover', e=>{if(e.target.closest('#importDrop')){e.preventDefault();e.target.closest('#importDrop').classList.add('drag-over');}});
  document.addEventListener('dragleave', e=>{if(e.target.closest('#importDrop'))e.target.closest('#importDrop').classList.remove('drag-over');});
  document.addEventListener('drop', e=>{const drop=e.target.closest('#importDrop');if(!drop)return;e.preventDefault();drop.classList.remove('drag-over');const file=e.dataTransfer?.files?.[0];if(file)readWorkbook(file);});

  updateChrome();
  renderPage();
})();
