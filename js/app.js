/* 夜航 app.js — 主逻辑：路由 / 起航仪式 / 五段航线工作流 / 各舱室 */
(function () {
  'use strict';

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const store = window.NSStore;
  const MD = window.NSMD;
  const Demo = window.NSDemo;
  const LLM = window.NSLLM;

  /* ═══ 图标补充（内联 SVG：罗盘） ═══ */
  const ICONS = {
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 13.6 13.6 8.5 15.5 10.4 10.4Z" fill="currentColor" stroke="none"/></svg>'
  };
  $$('[data-icon]').forEach(el => { el.innerHTML = ICONS[el.dataset.icon] || ''; });

  /* ═══ 航线定义 ═══ */
  const STAGES = [
    { id: 'brief',  no: '01', name: '立意', ic: 'auto_awesome',   owner: '军师·鹄',   ownerIc: 'auto_awesome', desc: '把点子磨成定位、口号与两周验证计划', artifact: '航前会策划书' },
    { id: 'scout',  no: '02', name: '侦察', ic: 'device_hub',     owner: '侦察官·隼', ownerIc: 'device_hub',   desc: '海况、对手的船与一周验证实验', artifact: '侦察报告' },
    { id: 'build',  no: '03', name: '造船', ic: 'terminal',       owner: '船匠·鲁',   ownerIc: 'terminal',     desc: 'MVP 清单、技术选型与冲刺排期', artifact: '造船清单' },
    { id: 'launch', no: '04', name: '亮灯', ic: 'rocket_launch',  owner: '信号兵·鸢', ownerIc: 'forum',        desc: '发布节奏、公告定稿与 FAQ 预案', artifact: '亮灯发布包' },
    { id: 'growth', no: '05', name: '顺风', ic: 'forum',          owner: '军师·鹄',   ownerIc: 'auto_awesome', desc: '内容日历、留存策略与周复盘模板', artifact: '增长信风' }
  ];
  const DEMO_FN = { brief: 'brief', scout: 'scout', build: 'build', launch: 'launch', growth: 'growth' };
  // 互审船员：起草者之外的另一名船员负责质检与评审
  const REVIEWER = { brief: '侦察官', scout: '军师', build: '军师', launch: '舵手', growth: '侦察官' };
  const STAGE_PROMPT = {
    brief: '请以军师身份起草「航前会策划书」，包含：一句话定位、目标用户与核心痛点、价值主张、MVP 边界（第一航段只做什么）、命名与口号（3 个候选）、两周验证计划（Markdown 表格：时间/动作/通过标准）、风险与对策。',
    scout: '请以侦察官身份起草「侦察报告」，包含：需求海况（真实度与时机）、竞品对照表（Markdown 表格：对手/打法/弱点/我们的差异化）、增长风向、一周验证实验设计（先人肉跑通再写代码）、侦察结论。引用规则：凡市场/用户数据与结论，句末必须标注来源编号（如 [资料1]，编号见下方资料列表）；资料未覆盖的推断必须标注 [待验证]。',
    build: '请以船匠身份起草「造船清单」，包含：MVP 功能表（P0/P1/P2，Markdown 表格含验收标准）、技术选型（一人可维护为最高原则，能白嫖不买）、两周冲刺排期（按天）、OPC 成本表（月预算 ≤ 一杯奶茶）、上线验收绿灯标准。',
    launch: '请以信号兵身份起草「亮灯发布包」，包含：发布节奏（预热/首发/接力）、发布文案定稿（引用块，带表情符号）、FAQ 客服预案（收费/隐私/售后三问）、亮灯自检清单。要求发布日选周日晚 21:00。',
    growth: '请以军师身份起草「增长信风」，包含：两周内容日历（Markdown 表格：日期/渠道/内容钩子）、渠道优先级及理由、留存与回流策略、每周日 15 分钟周复盘模板、增长红线。强调每周运营 ≤ 5 小时。'
  };

  const IDEAS = [
    ['课本漂流', '让毕业生的高价教材漂到学弟学妹手里：三折正版、扫码自取、48 小时送达宿舍。'],
    ['课程评价望远镜', '聚合本校真实选课评价：按专业、老师、给分方式检索，选课不再开盲盒。'],
    ['社团出海港', '给社团做的活动策划 AI：输入活动主题，10 分钟产出策划案、海报文案与招募推文。']
  ];

  let busy = false;          // 全局生成互斥
  let curChannel = 'xiaohongshu';
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SCROLL = REDUCED ? 'auto' : 'smooth';

  /* ═══ 工具 ═══ */
  let toastTimer = 0;
  function toast(msg, isErr) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('is-err', !!isErr);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  }
  function download(filename, text, mime) {
    const safe = filename.replace(/[\\/:*?"<>|]/g, '_');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime || 'text/plain;charset=utf-8' }));
    a.download = safe;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function escHtml(s) { return MD.esc(s); }

  // 流式渲染节流：高频 delta 下最多 ~16 次/秒，避免每 token 全量重排。
  // cancel() 丢弃未 flush 的尾帧——错误路径必须先调它，否则半篇残文会覆盖错误提示
  function makeStreamer(render) {
    let last = 0, timer = 0, latest = '';
    const flush = () => { timer = 0; last = performance.now(); render(latest); };
    const push = (text) => {
      latest = text;
      const now = performance.now();
      if (now - last >= 60) { if (timer) { clearTimeout(timer); timer = 0; } flush(); }
      else if (!timer) timer = setTimeout(flush, 70);
    };
    push.cancel = () => { if (timer) { clearTimeout(timer); timer = 0; } };
    return push;
  }

  // 图标字形对读屏器是噪音（如 "rocket_launch"），统一屏蔽；动态模板里的已内联 aria-hidden
  function a11ySweep(root) {
    $$('.sym, .sym-svg', root).forEach(el => el.setAttribute('aria-hidden', 'true'));
  }

  /* 证据引用弹层：点击 [资料N] 徽章展示来源段落 */
  const citePop = document.createElement('div');
  citePop.className = 'cite-pop';
  citePop.hidden = true;
  document.body.appendChild(citePop);
  document.addEventListener('click', (e) => {
    const badge = e.target.closest('.cite');
    if (badge) {
      const holder = badge.closest('[data-stage]');
      const cites = holder && store.proj ? (store.proj.cites[holder.dataset.stage] || []) : [];
      const ct = cites.find(c => c.i === +badge.dataset.i);
      if (ct) {
        citePop.innerHTML = `<div class="cite-meta mono"><b>资料${ct.i}</b> · ${escHtml(ct.doc)} · 相关度 ${ct.score.toFixed(2)}</div>` +
          `<div class="cite-chunk">${escHtml(ct.chunk.length > 320 ? ct.chunk.slice(0, 320) + '…' : ct.chunk)}</div>` +
          `<div class="cite-foot mono">来自藏书舱 · 生成时注入上下文</div>`;
        const r = badge.getBoundingClientRect();
        citePop.hidden = false;
        const pw = Math.min(380, innerWidth * 0.9);
        citePop.style.left = Math.max(10, Math.min(r.left, innerWidth - pw - 10)) + 'px';
        citePop.style.top = Math.min(r.bottom + 8, innerHeight - 160) + 'px';
        e.stopPropagation();
        return;
      }
    }
    if (!e.target.closest('.cite-pop')) citePop.hidden = true;
  });

  // 卡片鼠标追光
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  /* ═══ 路由 ═══ */
  function go(view) {
    $$('.view').forEach(v => v.classList.toggle('is-on', v.id === 'view-' + view));
    $$('.rail-item').forEach(b => b.classList.toggle('is-on', b.dataset.nav === view));
    window.scrollTo({ top: 0, behavior: SCROLL });
    refreshDock();
    if (view === 'signal') requestAnimationFrame(moveGlider);
    if (view === 'logbook') { renderLog(); renderDash(); }
  }
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); go(nav.dataset.nav); }
  });
  window.addEventListener('scroll', () => {
    $('#topbar').classList.toggle('is-stuck', window.scrollY > 8);
  }, { passive: true });

  /* ═══ 舰桥 ═══ */
  const CREW = [
    { name: '军师·鹄', ic: 'auto_awesome', role: '策划与定位', key: '军师' },
    { name: '侦察官·隼', ic: 'device_hub', role: '市场观测', key: '侦察官' },
    { name: '船匠·鲁', ic: 'terminal', role: '造船与工单', key: '船匠' },
    { name: '信号兵·鸢', ic: 'forum', role: '文案与发布', key: '信号兵' },
    { name: '舵手·AI', ic: 'smart_toy', role: '流程编排', key: '舵手' }
  ];
  const crewState = {};  // name -> 'idle' | 'run' | 'done'
  const crewName = (key) => (CREW.find(c => c.key === key) || { name: key }).name;

  function renderCrew() {
    $('#crew-roster').innerHTML = CREW.map(c => {
      const st = crewState[c.name] || 'idle';
      const pill = st === 'run' ? '<span class="pill pill-run"><i></i>工作中</span>'
        : st === 'done' ? '<span class="pill pill-done"><i></i>已交付</span>'
          : '<span class="pill pill-wait"><i></i>在岗</span>';
      return `<div class="agent"><span class="agent-ic"><span class="sym" aria-hidden="true">${c.ic}</span></span><div><b>${c.name}</b><small>${c.role}</small></div>${pill}</div>`;
    }).join('');
    a11ySweep($('#crew-roster'));
  }
  function setCrew(ownerKey, state) {
    CREW.forEach(c => {
      if (c.key === ownerKey) crewState[c.name] = state;
      else if (state === 'run' && crewState[c.name] === 'run') crewState[c.name] = 'idle';
    });
    renderCrew();
  }

  function consoleStep(html, cls) {
    const box = $('#console-steps');
    const div = document.createElement('div');
    div.className = 'step ' + (cls || 'done');
    div.innerHTML = html;
    box.appendChild(div);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    return div;
  }

  function refreshStats() {
    const proj = store.proj;
    const done = proj ? STAGES.filter(s => proj.stages[s.id]).length : 0;
    $('#stat-stage').innerHTML = done + '<i>/5</i>';
    let arts = done;
    if (proj && proj.landing) arts++;
    if (proj) arts += Object.keys(proj.signals).length;
    $('#stat-artifacts').textContent = arts;
    $('#stat-days').textContent = proj ? Math.max(1, Math.ceil((Date.now() - proj.createdAt) / 86400000)) : 0;
    // OPC 成本仪表：累计实测
    const bk = proj ? proj.usage.byKey : {};
    const tot = Object.values(bk).reduce((a, e) => ({ cost: a.cost + e.cost, calls: a.calls + e.calls }), { cost: 0, calls: 0 });
    $('#stat-cost').textContent = fmtCost(tot.cost);
    $('#stat-cost-label').textContent = `实测 AI 成本 · ${tot.calls} 次调用`;
    $('#kb-count').textContent = store.kb.length;
    $('#kb-count-2').textContent = store.kb.length;
    $('#console-model').textContent = store.isDemo() ? 'demo mode' : (store.cfg.model || 'connected');
    $('#rail-foot').textContent = proj ? ('· ' + proj.name + ' ·') : 'v1.0';
    // 连接指示
    const pill = $('#conn-pill');
    pill.classList.toggle('is-live', !store.isDemo());
    $('#conn-text').textContent = store.isDemo() ? '演示模式' : (store.cfg.model || '已连接');
  }

  function refreshBridge() {
    const proj = store.proj;
    refreshStats();
    $('#watch-task').textContent = busy ? '船员正在工作…' : (proj ? `当前项目：${proj.name}` : '等待掌舵指令…');
  }

  /* ═══ 起航仪式 ═══ */
  let lastFocus = null;
  function openOnboard(prefill) {
    if (busy) { toast('船员正在工作，稍候再起航新项目', true); return; }
    lastFocus = document.activeElement;
    $('#on-name').value = prefill && prefill.name || '';
    $('#on-pitch').value = prefill && prefill.pitch || '';
    $('#onboard-scrim').hidden = false;
    document.body.classList.add('modal-open');
    setTimeout(() => $('#on-name').focus(), 60);
  }
  function closeOnboard() {
    $('#onboard-scrim').hidden = true;
    document.body.classList.remove('modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  // Esc 关闭 + Tab 焦点圈定在弹窗内
  $('#onboard-scrim').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeOnboard(); return; }
    if (e.key !== 'Tab') return;
    const items = $$('#onboard-scrim button, #onboard-scrim input, #onboard-scrim textarea, #onboard-scrim select').filter(el => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });

  $$('.onboard-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const [name, pitch] = IDEAS[+chip.dataset.idea];
      $('#on-name').value = name;
      $('#on-pitch').value = pitch;
    });
  });
  $('#btn-onboard-cancel').addEventListener('click', closeOnboard);
  $('#onboard-scrim').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeOnboard(); });

  $('#btn-onboard-go').addEventListener('click', () => {
    if (busy) { toast('船员正在工作，稍候再起航新项目', true); return; }
    const name = $('#on-name').value.trim() || '未命名的船';
    const pitch = $('#on-pitch').value.trim();
    if (!pitch) { toast('给船一个航向：一句话说明她为谁解决什么问题', true); $('#on-pitch').focus(); return; }
    store.newProject(name, pitch);
    // 重置跨项目残留状态
    Object.keys(crewState).forEach(k => { crewState[k] = 'idle'; });
    openId = null;
    store.logAdd('user', `为 <b>${escHtml(name)}</b> 举行起航仪式，航向：${escHtml(pitch)}`);
    store.logAdd('sys', `船员就位（军师·侦察官·船匠·信号兵·舵手）。建议首航先生成 <b>01 立意 · 航前会</b>。`);
    closeOnboard();
    renderCrew();
    renderStages();
    refreshDock();
    refreshBridge();
    go('voyage');
    toast('启航！军师开始起草航前会…');
    genStage('brief');
  });
  $('#btn-new-voyage').addEventListener('click', () => openOnboard());
  $('#btn-new-voyage-2').addEventListener('click', () => openOnboard());

  // 舰桥快速指令
  $('#bridge-cmd').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const text = e.target.value.trim();
    if (!text) return;
    e.target.value = '';
    if (!store.proj) { openOnboard({ name: text.slice(0, 12), pitch: text }); return; }
    const next = STAGES.find(s => !store.proj.stages[s.id]);
    if (!next) { toast('五段航线已全部完成，去「船坞」造落地页吧'); go('dock'); return; }
    go('voyage');
    genStage(next.id);
  });

  /* ═══ 生成引擎 ═══ */
  // 记账：key = 航段id | landing | signal；u = {ms,tin,tout,est,demo}
  function addUsage(key, u) {
    const proj = store.proj;
    if (!proj || !u) return;
    const cost = (u.tin / 1e6) * (store.cfg.pin || 0) + (u.tout / 1e6) * (store.cfg.pout || 0);
    const bk = proj.usage.byKey;
    const e = bk[key] || (bk[key] = { calls: 0, ms: 0, tin: 0, tout: 0, cost: 0, demo: 0 });
    e.calls++; e.ms += u.ms || 0; e.tin += u.tin || 0; e.tout += u.tout || 0;
    e.cost += cost; e.demo += u.demo ? 1 : 0;
    store.saveProj();
    refreshStats();
    renderDash();
  }
  function fmtTok(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
  function fmtCost(c) { return c > 0 ? '¥' + (c >= 0.5 ? c.toFixed(2) : c.toFixed(4)) : '¥0'; }
  function usageChip(key) {
    const e = store.proj?.usage?.byKey?.[key];
    if (!e) return '';
    const bits = [(e.ms / 1000).toFixed(1) + 's'];
    if (!e.demo) bits.push(fmtTok(e.tin + e.tout) + ' tok', fmtCost(e.cost));
    else bits.push('演示');
    return `<span class="usage-chip mono" aria-label="本次生成实测用量">${bits.join(' · ')}</span>`;
  }

  function buildUserPrompt(stageId) {
    const proj = store.proj;
    const { text: kbctx, cites } = store.kbContextDetailed(`${proj.name} ${proj.pitch} ${STAGE_PROMPT[stageId]}`);
    const prompt = `项目名：${proj.name}\n一句话定位：${proj.pitch}\n\n${STAGE_PROMPT[stageId]}${kbctx}`;
    return { prompt, cites };
  }

  // 解析评审员输出（===分段协议）
  function section(raw, key) {
    const i = raw.indexOf(`===${key}===`);
    if (i < 0) return '';
    let rest = raw.slice(i + key.length + 6);
    const m = rest.match(/\n===[A-Z]+===/);
    if (m) rest = rest.slice(0, m.index);
    return rest.trim();
  }
  function parseReview(raw) {
    const scores = {};
    for (const [key, label] of [['exec', '可执行性'], ['detail', '具体性'], ['align', '定位一致性']]) {
      const m = raw.match(new RegExp(label + '[::]\\s*(\\d)\\s*/\\s*5\\s*\\|?\\s*([^\\n]*)'));
      if (m) scores[key] = { v: +m[1], note: m[2].trim() };
    }
    const issues = section(raw, 'ISSUES').split('\n').map(l => l.trim()).filter(l => /^[-*•]/.test(l)).map(l => l.replace(/^[-*•]\s*/, ''));
    let revised = section(raw, 'REVISED').replace(/^```(?:markdown)?\n?/, '').replace(/\n?```$/, '').trim();
    if (revised && !/^\s*（?仅当|无/.test(revised)) revised = '';
    const hasHigh = issues.some(s => s.includes('[高]') || s.includes('高]'));
    return { scores, issues, revised: hasHigh && revised ? revised : '', hasHigh };
  }
  function reviewMdOf(id, qc) {
    const labels = [['exec', '可执行性'], ['detail', '具体性'], ['align', '定位一致性']];
    const total = qc.scores.exec.v + qc.scores.detail.v + qc.scores.align.v;
    let md = '### 质检评分\n' + labels.map(([k, l]) => {
      const s = qc.scores[k];
      return `- **${l} ${s.v}/5** — ${s.note || ''}`;
    }).join('\n') + `\n- **总分 ${total}/15**\n\n### 评审意见\n` +
      (qc.issues.length ? qc.issues.map(s => `- ${s}`).join('\n') : '- 无') +
      (qc.revised ? '\n\n> ⚡ 检出高优问题，修订版已采纳并替换上方产出物。' : '\n\n> 未触发修订（无高优问题）。');
    return md;
  }

  // 打字机：按时间预算推进（而非按拍数），后台标签页被节流时也能按时完成
  function typewriter(full, onTick, onDone, budgetMs = 3200) {
    const t0 = performance.now();
    (function step() {
      const p = Math.min(1, (performance.now() - t0) / budgetMs);
      const i = Math.min(full.length, Math.ceil(full.length * p));
      onTick(full.slice(0, i));
      if (i < full.length) setTimeout(step, 25);
      else onDone && onDone();
    })();
  }

  async function genStage(stageId) {
    const proj = store.proj;
    const stage = proj ? STAGES.find(s => s.id === stageId) : null;
    if (!proj || !stage || busy) return;
    busy = true;
    const owner = stage.ownerIc === 'forum' ? '信号兵' : stage.owner.split('·')[0];
    const reviewer = REVIEWER[stageId];
    setCrew(owner, 'run');
    refreshBridge();

    // 展开对应卡片并准备工作区
    openStage(stageId);
    const body = $('#stage-body-' + stageId);
    body.innerHTML = `
      <div class="gen-steps" id="gen-steps-${stageId}"></div>
      <div class="md-body streaming" id="gen-out-${stageId}" data-stage="${stageId}"></div>`;
    const stepsBox = $('#gen-steps-' + stageId);
    const out = $('#gen-out-' + stageId);

    const stepDefs = [
      ['舵手·AI', '接收工单，注入项目上下文与知识库资料'],
      [stage.owner, `起草${stage.artifact}`],
      [crewName(reviewer), '互审与质检（rubric 评分 + 修订）'],
      ['舵手·AI', '签收归档，记录用量']
    ];
    stepsBox.innerHTML = stepDefs.map((s, i) =>
      `<div class="step ${i === 0 ? 'run' : 'wait'}"><span class="${i === 0 ? 'spinner' : 'sym'}" aria-hidden="true">${i === 0 ? '' : 'check_circle'}</span><span><b>${escHtml(s[0])}</b> · ${escHtml(s[1])}</span><span class="bar"><i></i></span><em>${i === 0 ? '…' : ''}</em></div>`
    ).join('');
    a11ySweep(stepsBox);
    const stepEls = stepsBox.children;

    function setStep(idx, note) {
      Array.from(stepEls).forEach((el, i) => {
        el.className = 'step ' + (i < idx ? 'done' : i === idx ? 'run' : 'wait');
        const ic = el.querySelector('span');
        if (i < idx) ic.outerHTML = '<span class="sym" aria-hidden="true">check_circle</span>';
        else if (i === idx && !el.querySelector('.spinner')) ic.outerHTML = '<span class="spinner"></span>';
        const em = el.querySelector('em');
        if (em) em.textContent = i < idx ? '✓' : i === idx ? (note || '…') : '';
        const bar = el.querySelector('.bar i');
        if (bar) bar.style.width = i < idx ? '100%' : i === idx ? '45%' : '0%';
      });
    }
    setStep(0, 'ctx');

    const t0 = Date.now();
    const meta = { cites: [], qc: null, review: '', usage: null };
    const finish = (text) => {
      proj.stages[stageId] = text;
      if (meta.cites.length) proj.cites[stageId] = meta.cites;
      if (meta.qc) {
        proj.qc[stageId] = meta.qc;
        proj.reviews[stageId] = meta.review;
      }
      addUsage(stageId, meta.usage);
      store.saveProj();
      store.logAdd('gen', `${stage.owner} 交付 <b>${stage.artifact}</b>（${stage.no} ${stage.name}）`);
      if (meta.qc) {
        const sc = meta.qc.scores;
        const total = sc.exec.v + sc.detail.v + sc.align.v;
        store.logAdd('gen', `${crewName(meta.qc.reviewer)} 互审质检 <b>总分 ${total}/15</b>${meta.qc.revised ? '，高优问题已修订并采纳' : '，无高优问题'}`);
      }
      setCrew(owner, 'done');
      if (meta.qc) setCrew(meta.qc.reviewer, 'done');
      busy = false;
      renderStages();
      refreshBridge();
      toast(meta.qc?.revised ? `${stage.artifact} 已归档（评审后采纳修订版）✓` : `${stage.artifact} 已归档 ✓`);
    };

    if (store.isDemo()) {
      setStep(1, 'draft');
      let full = Demo[DEMO_FN[stageId]](proj.name, proj.pitch);
      const stream = makeStreamer((t) => { out.innerHTML = MD.render(t); });
      const afterDraft = () => {
        setStep(2, '审');
        // 证据装饰（侦察段）：知识库有料时把 canned 结论挂到真实藏书上
        if (stageId === 'scout' && store.kb.length) {
          const hits = store.kbSearch(`${proj.name} ${proj.pitch}`, 2);
          if (hits[0]) full = full.replace('适合学生侧轻启动。', '适合学生侧轻启动 [资料1]。');
          if (hits[1]) full = full.replace('一次触达 = 一整个班级。', '一次触达 = 一整个班级 [资料2]。');
          meta.cites = hits.map((h, i) => ({ i: i + 1, doc: h.doc, chunk: h.chunk, score: h.score }));
          stream(full);
        }
        const q = Demo.qc(stageId);
        const toS = (v) => ({ v, note: '' });
        meta.qc = {
          reviewer, scores: { exec: toS(q.scores.exec), detail: toS(q.scores.detail), align: toS(q.scores.align) },
          issues: q.issues, revised: false
        };
        meta.review = reviewMdOf(stageId, meta.qc);
        setTimeout(() => {
          setStep(3, '✓');
          meta.usage = { ms: Date.now() - t0, tin: 0, tout: 0, est: false, demo: true };
          setTimeout(() => finish(full), 250);
        }, REDUCED ? 30 : 900);
      };
      if (REDUCED) { stream(full); afterDraft(); }
      else typewriter(full, stream, afterDraft);
    } else {
      const tick = setTimeout(() => setStep(1, 'draft'), 900);
      const stream = makeStreamer((t) => { out.innerHTML = MD.render(t); });
      try {
        const sys = '你是「夜航 NightSail」的船员 AI，服务一位大学生的一人公司（OPC）项目。用中文输出 Markdown，务实、具体、可执行，杜绝空话套话，正文控制在 1000 字内。不要用代码围栏包裹全文。';
        const { prompt, cites } = buildUserPrompt(stageId);
        meta.cites = cites;
        const t1 = Date.now();
        const r1 = await LLM.chat({
          system: sys,
          user: prompt,
          onDelta: (d, fullText) => stream(fullText),
          temperature: store.cfg.temp
        });
        clearTimeout(tick);
        setStep(2, '审');

        // 互审与质检：另一名船员按 rubric 评审，高优问题自动修订
        const t2 = Date.now();
        const r2 = await LLM.chat({
          system: '你是严格的创业项目评审。只按用户给定的 ===分段=== 格式输出，不输出任何额外内容。',
          user: `你是「夜航」的${crewName(reviewer)}（质检与互审角色），评审另一位船员起草的《${stage.artifact}》。
项目：${proj.name} — ${proj.pitch}
评分维度：可执行性（拿到就能干）、具体性（有数字/名单/验收标准，无空话）、与定位一致性。
资料（评审事实依据）：${store.kbContext(proj.pitch) || '（舱内暂无资料）'}

待评审初稿：
${r1.text}

严格按以下格式输出：
===SCORES===
可执行性: X/5 | 一句话理由
具体性: Y/5 | 一句话理由
定位一致性: Z/5 | 一句话理由
===ISSUES===
- [高/中/低] 具体问题（引用原文短语）；若无问题写「- 无」
===REVISED===
仅当存在[高]级问题时输出修订后全文（Markdown），否则本节整段省略。`,
          temperature: Math.min(0.5, store.cfg.temp ?? 0.7)
        });
        const pr = parseReview(r2.text);
        const scores = {};
        ['exec', 'detail', 'align'].forEach(k => { scores[k] = pr.scores[k] || { v: 3, note: '' }; });
        meta.qc = { reviewer, scores, issues: pr.issues, revised: !!pr.revised };
        meta.review = reviewMdOf(stageId, meta.qc);
        meta.usage = {
          ms: t2 - t1 + (Date.now() - t2),
          tin: r1.usage.tin + r2.usage.tin,
          tout: r1.usage.tout + r2.usage.tout,
          est: r1.usage.est && r2.usage.est
        };
        setStep(3, '✓');
        const finalText = pr.revised || r1.text;
        setTimeout(() => finish(finalText), 250);
      } catch (err) {
        clearTimeout(tick);
        stream.cancel();
        busy = false;
        setCrew(owner, 'idle');
        stepsBox.innerHTML = `<div class="step"><span class="sym" aria-hidden="true">merge_type</span><span>航段遇到风浪：<b>${escHtml(err.message)}</b></span></div>`;
        out.classList.remove('streaming');
        out.innerHTML = '<p class="placeholder">本次未能生成。可重试，或到「罗盘」检查接口配置；也可以切换演示模式先看完整流程。</p>';
        store.logAdd('sys', `生成 ${stage.artifact} 失败：${escHtml(err.message)}`);
        toast('生成失败：' + err.message, true);
        renderStages();
      }
    }
  }

  // 定向修订：只针对质检发现的薄弱项重写（真实引擎）
  async function reviseStage(stageId) {
    const proj = store.proj;
    const stage = STAGES.find(s => s.id === stageId);
    const qcRec = proj?.qc?.[stageId];
    if (!proj || !stage || !qcRec || busy || store.isDemo()) return;
    busy = true;
    setCrew(qcRec.reviewer, 'run');
    refreshBridge();
    const t0 = Date.now();
    try {
      const { prompt } = buildUserPrompt(stageId);
      const r = await LLM.chat({
        system: `你是「夜航」的${crewName(qcRec.reviewer)}。只输出修订后全文的 Markdown 正文，不要围栏、不要解释。`,
        user: `项目：${proj.name} — ${proj.pitch}

${prompt}

【初稿】
${proj.stages[stageId]}

【质检发现的问题】
${qcRec.issues.join('\n')}

请只针对以上问题修订初稿（其余内容保持），输出修订后全文。`,
        temperature: store.cfg.temp
      });
      if (r.text && r.text.length > 80) {
        proj.stages[stageId] = r.text;
        qcRec.revised = true;
        addUsage(stageId, { ms: Date.now() - t0, tin: r.usage.tin, tout: r.usage.tout, est: r.usage.est });
        store.logAdd('gen', `定向修订 <b>${stage.artifact}</b>：薄弱项已按评审意见重写`);
        toast('定向修订完成 ✓');
      }
    } catch (err) {
      toast('修订失败：' + err.message, true);
    } finally {
      busy = false;
      setCrew(qcRec.reviewer, 'done');
      renderStages();
      refreshBridge();
    }
  }

  /* ═══ 航线视图 ═══ */
  function renderRouteMap() {
    const proj = store.proj;
    const map = $('#route-map');
    if (!proj) { map.innerHTML = ''; return; }
    const doneIdx = STAGES.reduce((acc, s, i) => proj.stages[s.id] ? i : acc, -1);
    // 当前 = 第一个未完成
    let curIdx = STAGES.findIndex(s => !proj.stages[s.id]);
    if (curIdx === -1) curIdx = 4;
    map.innerHTML = STAGES.map((s, i) => {
      const state = i < curIdx ? 'is-done' : i === curIdx ? 'is-cur' : '';
      const icon = i < curIdx ? '<span class="sym" aria-hidden="true">check_circle</span>' : s.no;
      const link = i < STAGES.length - 1
        ? `<div class="route-link" style="--p:${i < curIdx ? 100 : 0}%"></div>` : '';
      return `<div class="route-node ${state}"><div class="route-dot">${icon}</div><div class="route-label">${s.name}</div></div>${link}`;
    }).join('');
    a11ySweep(map);
  }

  let openId = null;   // 当前展开的航段

  function openStage(stageId) {
    openId = stageId;
    $$('.stage').forEach(el => el.classList.toggle('is-open', el.dataset.stage === stageId));
    syncStageAria();
  }

  function artifactBody(stageId, text) {
    return `<div class="md-body" id="stage-body-${stageId}" data-stage="${stageId}">${MD.render(text)}</div>`;
  }

  function qcChips(id) {
    const q = store.proj.qc[id];
    if (!q) return '';
    const chip = (label, s) =>
      `<span class="qc-chip${s.v <= 3 ? ' warn' : ''}" title="${escHtml(label)}评分 ${s.v}/5${s.note ? '：' + escHtml(s.note) : ''}">${label} <b>${s.v}/5</b></span>`;
    return chip('执行', q.scores.exec) + chip('具体', q.scores.detail) + chip('定位', q.scores.align);
  }

  function reviewBox(id) {
    const q = store.proj.qc[id];
    if (!q) return '';
    const total = q.scores.exec.v + q.scores.detail.v + q.scores.align.v;
    const weak = [q.scores.exec, q.scores.detail, q.scores.align].some(s => s.v <= 3);
    const reviseBtn = !store.isDemo() && weak
      ? `<div class="revise-row"><button class="btn btn-ghost btn-sm" data-revise="${id}"><span class="sym" aria-hidden="true">auto_awesome</span>定向修订薄弱项</button></div>` : '';
    return `<details class="review-box"><summary><span class="sym" aria-hidden="true">shield</span>互审与质检 · ${escHtml(crewName(q.reviewer))} · 总分 <b>${total}/15</b>${q.revised ? ' · 已采纳修订' : ''}</summary><div class="review-body md-body" data-stage="${id}">${MD.render(store.proj.reviews[id] || '')}</div>${reviseBtn}</details>`;
  }

  function renderStages() {
    const proj = store.proj;
    renderRouteMap();
    $('#no-project').classList.toggle('is-on', !proj);
    const wrap = $('#stages');
    if (!proj) { wrap.innerHTML = ''; return; }

    const curIdx = Math.max(0, STAGES.findIndex(s => !proj.stages[s.id]));
    wrap.innerHTML = STAGES.map((s, i) => {
      const text = proj.stages[s.id];
      let state = text ? 'is-done' : i === curIdx ? 'is-cur' : '';
      if (openId === s.id) state += ' is-open';
      const pill = text ? '<span class="pill pill-done"><i></i>已归档</span>'
        : i === curIdx ? '<span class="pill pill-run"><i></i>当前航段</span>'
          : '<span class="pill pill-wait"><i></i>待启程</span>';
      const genBtn = text
        ? `<button class="btn btn-ghost btn-sm" data-regen="${s.id}"><span class="sym" aria-hidden="true">auto_awesome</span>重新起草</button>
           <button class="btn btn-ghost btn-sm" data-dl="${s.id}"><span class="sym" aria-hidden="true">description</span>下载 .md</button>`
        : `<button class="btn btn-primary btn-sm" data-gen="${s.id}"><span class="sym" aria-hidden="true">auto_awesome</span>起草${s.artifact}</button>`;
      return `<div class="stage ${state}" data-stage="${s.id}">
        <div class="stage-head" data-open="${s.id}" tabindex="0" role="button" aria-expanded="${openId === s.id}" aria-label="${s.no} ${s.name} · ${s.artifact}">
          <span class="stage-no mono" aria-hidden="true">${s.no}</span>
          <span class="stage-ic"><span class="sym" aria-hidden="true">${s.ic}</span></span>
          <div class="stage-tt"><b>${s.name} · ${s.artifact}</b><small>${s.desc}</small></div>
          <div class="stage-act">${qcChips(s.id)}${pill}</div>
        </div>
        <div class="stage-body" id="stage-wrap-${s.id}">
          ${text ? artifactBody(s.id, text) : `<div class="md-body" id="stage-body-${s.id}" data-stage="${s.id}"><p class="placeholder">点击上方「起草${s.artifact}」，${s.owner}将开始工作。</p></div>`}
          ${text && proj.qc[s.id] ? reviewBox(s.id) : ''}
          <div class="stage-tools">
            <span class="stage-owner"><span class="sym" aria-hidden="true">${s.ownerIc}</span>负责船员 · ${s.owner}</span>
            ${text ? usageChip(s.id) : ''}
            <span class="spacer"></span>
            ${genBtn}
          </div>
        </div>
      </div>`;
    }).join('');
    a11ySweep(wrap);
  }

  function syncStageAria() {
    $$('.stage').forEach(el => {
      const head = el.querySelector('[data-open]');
      if (head) head.setAttribute('aria-expanded', String(el.classList.contains('is-open')));
    });
  }

  $('#stages').addEventListener('click', (e) => {
    const head = e.target.closest('[data-open]');
    if (head && !e.target.closest('button')) {
      toggleStage(head.dataset.open);
      return;
    }
    const gen = e.target.closest('[data-gen],[data-regen]');
    if (gen) { genStage(gen.dataset.gen || gen.dataset.regen); return; }
    const rev = e.target.closest('[data-revise]');
    if (rev) { reviseStage(rev.dataset.revise); return; }
    const dl = e.target.closest('[data-dl]');
    if (dl) {
      const s = STAGES.find(x => x.id === dl.dataset.dl);
      download(`夜航-${s.artifact}-${store.proj.name}.md`, store.proj.stages[s.id], 'text/markdown;charset=utf-8');
      store.logAdd('sys', `导出 <b>${s.artifact}</b> 为 Markdown`);
      toast('已下载 .md');
    }
  });
  $('#stages').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const head = e.target.closest('[data-open]');
    if (head && !e.target.closest('button')) { e.preventDefault(); toggleStage(head.dataset.open); }
  });

  function toggleStage(id) {
    const el = $(`.stage[data-stage="${id}"]`);
    if (!el) return;
    const was = el.classList.contains('is-open');
    $$('.stage').forEach(x => x.classList.remove('is-open'));
    if (!was) { el.classList.add('is-open'); openId = id; }
    else openId = null;
    syncStageAria();
  }

  /* ═══ 船坞 ═══ */
  function extractHtml(text) {
    const m = text.match(/```html\n([\s\S]*?)```/i) || text.match(/```\n(<!DOCTYPE[\s\S]*?)```/i);
    if (m) return m[1].trim();
    if (/^\s*<!DOCTYPE/i.test(text)) return text.trim();
    const start = text.indexOf('<!DOCTYPE');
    if (start >= 0) return text.slice(start).replace(/```[\s\S]*?$/, '').trim();
    return null;
  }

  function refreshDock() {
    const proj = store.proj;
    const brief = $('#dock-brief');
    if (!proj) brief.textContent = '完成「起航仪式」后，船匠就能开工。';
    else brief.innerHTML = `当前在航：<b>${escHtml(proj.name)}</b> — ${escHtml(proj.pitch)}`;
    const has = proj && proj.landing;
    $('#btn-download-landing').disabled = !has;
    $('#btn-open-landing').disabled = !has;
    $('#btn-gen-landing').disabled = !proj;
    if (has) {
      $('#dock-frame').srcdoc = proj.landing.html;
      $('#dock-frame').classList.add('is-on');
      $('#dock-placeholder').style.display = 'none';
      $('#dock-preview-title').textContent = `landing preview — ${proj.name}`;
      $('#dock-preview-ver').textContent = new Date(proj.landing.at).toLocaleDateString('zh-CN');
    }
  }

  $('#btn-gen-landing').addEventListener('click', async () => {
    const proj = store.proj;
    if (!proj || busy) return;
    busy = true;
    const btn = $('#btn-gen-landing');
    btn.classList.add('is-busy');
    $('#dock-preview-ver').textContent = 'crafting…';
    setCrew('船匠', 'run');
    refreshBridge();
    const kbctx = store.kbContext(`${proj.name} ${proj.pitch} 落地页 卖点`);
    const t0 = Date.now();
    try {
      let html;
      if (store.isDemo()) {
        await new Promise(r => setTimeout(r, 900));
        html = Demo.landing(proj.name, proj.pitch);
        addUsage('landing', { ms: Date.now() - t0, tin: 0, tout: 0, est: false, demo: true });
      } else {
        const r = await LLM.chat({
          system: '你是资深落地页设计师。只输出一个完整 HTML 文档，用 ```html 围栏包裹。要求：单文件、内联全部 CSS、不引外部资源、中文文案、深色优雅风格、移动端适配。结构含：导航、Hero（标题带渐变强调词 + 一句话副标 + 双 CTA）、三个数据卡、三个功能卡、底部 CTA 横幅与页脚。文案要具体、有说服力。',
          user: `项目名：${proj.name}\n一句话定位：${proj.pitch}\n请为它生成落地页。${kbctx}`,
          temperature: store.cfg.temp
        });
        html = extractHtml(r.text);
        if (!html) throw new Error('未能从回复中提取 HTML，请重试');
        addUsage('landing', { ms: Date.now() - t0, tin: r.usage.tin, tout: r.usage.tout, est: r.usage.est });
      }
      proj.landing = { html, at: Date.now() };
      store.saveProj();
      store.logAdd('gen', `船匠·鲁 交付 <b>落地页</b>（单文件 HTML，${Math.round(html.length / 1024)} KB）`);
      setCrew('船匠', 'done');
      refreshDock();
      refreshStats();
      toast('落地页完工 ✓ 可下载或直接部署');
    } catch (err) {
      store.logAdd('sys', `落地页生成失败：${escHtml(err.message)}`);
      $('#dock-preview-ver').textContent = 'failed';
      toast('生成失败：' + err.message, true);
    } finally {
      busy = false;
      btn.classList.remove('is-busy');
      refreshBridge();
    }
  });
  $('#btn-download-landing').addEventListener('click', () => {
    download(`夜航-落地页-${store.proj.name}.html`, store.proj.landing.html, 'text/html;charset=utf-8');
    store.logAdd('sys', '导出落地页 HTML');
    toast('已下载 HTML');
  });
  $('#btn-open-landing').addEventListener('click', () => {
    // 包一层沙箱 iframe 再开新窗：生成的页面脚本不可访问本应用 origin / localStorage
    const html = store.proj.landing.html;
    const wrapped = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${escHtml(store.proj.name)}</title>` +
      `<style>html,body{margin:0;height:100%;background:#0b0d13}iframe{border:0;width:100%;height:100%}</style></head>` +
      `<body><iframe sandbox="allow-scripts allow-popups" srcdoc="${MD.esc(html)}"></iframe></body></html>`;
    const url = URL.createObjectURL(new Blob([wrapped], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener');
  });

  /* ═══ 信号塔 ═══ */
  const CHANNELS = {
    xiaohongshu: { label: 'CHANNEL · xiaohongshu', tone: '小红书笔记：第一人称女生视角，短句多表情符号，真实经历感，结尾带话题标签与互动钩子' },
    moments: { label: 'CHANNEL · moments', tone: '微信朋友圈：克制、真诚、不油腻，5 行以内，用换行分段，结尾轻引导' },
    campus: { label: 'CHANNEL · campus', tone: '校园公告：正式但亲切，条目化信息（是什么/权益/报名方式），不堆表情' },
    zhihu: { label: 'CHANNEL · zhihu', tone: '知乎回答：方法论长文，有过程、有数据、有反思，标题即观点，结尾轻导流' }
  };

  function moveGlider() {
    const on = $('#signal-tabs .tab.is-on');
    const glider = $('#signal-glider');
    glider.style.width = on.offsetWidth + 'px';
    glider.style.transform = `translateX(${on.offsetLeft}px)`;
  }

  $('#signal-tabs').addEventListener('click', (e) => {
    if (busy) { toast('生成进行中，请等船员完工再切换渠道', true); return; }
    const tab = e.target.closest('.tab');
    if (!tab) return;
    curChannel = tab.dataset.ch;
    $$('#signal-tabs .tab').forEach(t => t.classList.toggle('is-on', t === tab));
    moveGlider();
    $('#signal-ch-label').textContent = CHANNELS[curChannel].label;
    const saved = store.proj && store.proj.signals[curChannel];
    $('#signal-out').innerHTML = saved ? MD.render(saved)
      : '<p class="placeholder">该频道还没有文案。点击右上「生成文案」，信号兵会带上项目定位与知识库素材动笔。</p>';
    $('#btn-copy-signal').disabled = !saved;
  });

  $('#btn-gen-signal').addEventListener('click', async () => {
    const proj = store.proj;
    if (!proj) { toast('先完成起航仪式，信号兵才知道为哪条船发报', true); return; }
    if (busy) return;
    busy = true;
    const ch = curChannel; // 生成期间锁定渠道，防止中途切 tab 串写
    const btn = $('#btn-gen-signal');
    btn.classList.add('is-busy');
    $('#signal-status').textContent = '信号兵·鸢 正在发报…';
    setCrew('信号兵', 'run');
    refreshBridge();
    const out = $('#signal-out');
    out.classList.add('streaming');
    const kbctx = store.kbContext(`${proj.name} ${proj.pitch} 文案 渠道`);
    const stream = makeStreamer((t) => { out.innerHTML = MD.render(t); });
    const t0 = Date.now();
    const finish = (text, usage) => {
      proj.signals[ch] = text;
      store.saveProj();
      addUsage('signal', usage || { ms: Date.now() - t0, tin: 0, tout: 0, est: false, demo: true });
      store.logAdd('gen', `信号兵·鸢 发报 <b>${ch}</b> 文案（${text.length} 字）`);
      setCrew('信号兵', 'done');
      busy = false;
      btn.classList.remove('is-busy');
      out.classList.remove('streaming');
      $('#signal-status').textContent = '已归档 ' + new Date().toLocaleTimeString('zh-CN');
      $('#btn-copy-signal').disabled = false;
      refreshStats();
      toast('文案已归档，可复制 ✓');
    };
    if (store.isDemo()) {
      const full = Demo.signalCopy(ch, proj.name, proj.pitch);
      if (REDUCED) { stream(full); finish(full); }
      else typewriter(full, stream, () => finish(full));
    } else {
      try {
        const r = await LLM.chat({
          system: '你是「夜航」的信号兵·鸢，负责推广文案。用中文 Markdown 输出正文，符合渠道语气，具体不空泛。不要用代码围栏。',
          user: `项目名：${proj.name}\n一句话定位：${proj.pitch}\n\n请写${CHANNELS[ch].tone}。${kbctx}`,
          onDelta: (d, fullText) => stream(fullText),
          temperature: store.cfg.temp
        });
        finish(r.text, { ms: Date.now() - t0, tin: r.usage.tin, tout: r.usage.tout, est: r.usage.est });
      } catch (err) {
        busy = false;
        btn.classList.remove('is-busy');
        stream.cancel();
        out.classList.remove('streaming');
        $('#signal-status').textContent = '';
        out.innerHTML = `<p class="placeholder">发报失败：${escHtml(err.message)}</p>`;
        toast('生成失败：' + err.message, true);
      }
    }
  });
  $('#btn-copy-signal').addEventListener('click', async () => {
    const text = store.proj && store.proj.signals[curChannel];
    if (!text) return;
    try { await navigator.clipboard.writeText(text); toast('已复制到剪贴板'); }
    catch (e) { toast('复制失败，请手动选择文本', true); }
  });

  /* ═══ 藏书舱 ═══ */
  function renderKb() {
    const list = $('#kb-list');
    if (!store.kb.length) {
      list.innerHTML = '<div class="mini-row"><span class="sym" aria-hidden="true">description</span><small>舱内空空。粘贴课程讲义、访谈记录、竞品笔记试试。</small></div>';
      return;
    }
    list.innerHTML = store.kb.map(d => `
      <div class="mini-row">
        <span class="sym" aria-hidden="true">description</span>
        <b>${escHtml(d.title)}</b>
        <small>${d.chunks.length} 段 · ${d.text.length} 字</small>
        <button class="row-del" data-del="${d.id}">移出</button>
      </div>`).join('');
    a11ySweep(list);
    refreshStats();
  }
  $('#btn-kb-add').addEventListener('click', () => {
    const title = $('#kb-title').value.trim();
    const text = $('#kb-content').value.trim();
    if (!title || !text) { toast('标题和正文都要有才能入库', true); return; }
    const doc = store.kbAdd(title, text);
    store.logAdd('kb', `入库藏书 <b>${escHtml(title)}</b>（切成 ${doc.chunks.length} 段）`);
    $('#kb-title').value = ''; $('#kb-content').value = '';
    renderKb();
    toast(`已入库，切成 ${doc.chunks.length} 段待检索`);
  });
  $('#kb-list').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (!del) return;
    const doc = store.kb.find(d => d.id === del.dataset.del);
    store.kbDel(del.dataset.del);
    store.logAdd('kb', `移出藏书 <b>${escHtml(doc ? doc.title : '')}</b>`);
    renderKb();
  });
  $('#btn-kb-probe').addEventListener('click', () => {
    const q = $('#kb-probe-q').value.trim();
    const out = $('#kb-probe-out');
    if (!q) { toast('先输入一句查询', true); return; }
    const hits = store.kbSearch(q, 3);
    if (!hits.length) { out.innerHTML = '<p class="placeholder" style="margin-top:12px">没有命中。试试更贴近藏书内容的关键词。</p>'; return; }
    out.innerHTML = hits.map((h, i) => `
      <div class="probe-hit">
        <div class="hit-meta"><b>#${i + 1}</b><span>${escHtml(h.doc)}</span><span>score ${h.score.toFixed(3)}</span></div>
        ${escHtml(h.chunk.slice(0, 140))}${h.chunk.length > 140 ? '…' : ''}
      </div>`).join('');
  });

  /* ═══ 航海志 ═══ */
  function renderLog() {
    const body = $('#log-body');
    const entries = store.log;
    $('#log-count').textContent = entries.length + ' entries';
    if (!entries.length) {
      body.innerHTML = '<p class="placeholder">航海志还是空的。起航仪式、每份产出、每次导入都会记在这里。</p>';
      return;
    }
    body.innerHTML = entries.slice().reverse().map(e => {
      const d = new Date(e.t);
      const ts = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `<div class="log-entry t-${e.type}"><span class="log-type"></span><span class="log-t">${ts}</span><span>${e.html}</span></div>`;
    }).join('');
  }
  $('#btn-export-log').addEventListener('click', () => {
    if (!store.log.length) { toast('还没有可导出的记录', true); return; }
    download(`夜航-航海志-${store.proj ? store.proj.name : '导出'}.md`, store.logExport(), 'text/markdown;charset=utf-8');
    toast('已下载航海志 .md');
  });

  /* OPC 成本仪表盘 */
  function renderDash() {
    const el = $('#dash-body');
    if (!el) return;
    const bk = store.proj?.usage.byKey || {};
    const rows = [...STAGES.map(s => ({ key: s.id, name: `${s.no} ${s.name} · ${s.artifact}` })),
      { key: 'landing', name: '落地页' }, { key: 'signal', name: '推广文案（各渠道合计）' }];
    let tCalls = 0, tMs = 0, tTok = 0, tCost = 0;
    const trs = rows.map(({ key, name }) => {
      const e = bk[key];
      if (!e) return `<tr><td>${escHtml(name)}</td><td colspan="4" class="dash-dim">—</td></tr>`;
      tCalls += e.calls; tMs += e.ms; tTok += e.tin + e.tout; tCost += e.cost;
      return `<tr><td>${escHtml(name)}</td><td>${e.calls} 次</td><td>${(e.ms / 1000).toFixed(1)}s</td><td>${fmtTok(e.tin + e.tout)}</td><td>${fmtCost(e.cost)}</td></tr>`;
    }).join('');
    el.innerHTML = `<table class="dash-table"><thead><tr><th>航段</th><th>调用</th><th>耗时</th><th>tokens</th><th>成本</th></tr></thead><tbody>${trs}</tbody>` +
      `<tfoot><tr><td>合计</td><td>${tCalls} 次</td><td>${(tMs / 1000).toFixed(1)}s</td><td>${fmtTok(tTok)}</td><td>${fmtCost(tCost)}</td></tr></tfoot></table>` +
      `<p class="dash-note mono">${store.isDemo() ? '演示模式不消耗 token；接引擎后此处为实测计费。' : '费率在「罗盘」可调；token 为接口返回或按字数估算。'}</p>`;
  }

  /* ═══ 罗盘 ═══ */
  function fillCfgForm() {
    const cfg = store.cfg;
    const preset = Object.entries(store.PRESETS).find(([k, v]) =>
      v.base === cfg.base && v.model === cfg.model && (!v.key || v.key === cfg.key));
    $('#cfg-preset').value = cfg.base
      ? (preset ? preset[0] : 'custom')
      : 'demo';
    $('#cfg-base').value = cfg.base || '';
    $('#cfg-key').value = cfg.key || '';
    $('#cfg-model').value = cfg.model || '';
    $('#cfg-temp').value = cfg.temp ?? 0.7;
    $('#cfg-temp-val').textContent = (cfg.temp ?? 0.7).toFixed(1);
    $('#cfg-pin').value = cfg.pin ?? 0;
    $('#cfg-pout').value = cfg.pout ?? 0;
  }
  $('#cfg-preset').addEventListener('change', () => {
    const p = store.PRESETS[$('#cfg-preset').value];
    $('#cfg-base').value = p.base;
    $('#cfg-model').value = p.model;
    $('#cfg-key').value = p.key;
    $('#cfg-temp').value = p.temp;
    $('#cfg-temp-val').textContent = p.temp.toFixed(1);
    $('#cfg-pin').value = p.pin;
    $('#cfg-pout').value = p.pout;
  });
  $('#cfg-temp').addEventListener('input', () => {
    $('#cfg-temp-val').textContent = (+$('#cfg-temp').value).toFixed(1);
  });
  function readCfgForm() {
    store.cfg = {
      base: $('#cfg-base').value.trim(),
      key: $('#cfg-key').value.trim(),
      model: $('#cfg-model').value.trim(),
      temp: +$('#cfg-temp').value,
      pin: +$('#cfg-pin').value || 0,
      pout: +$('#cfg-pout').value || 0
    };
  }
  function cfgMsg(text, cls) {
    const el = $('#cfg-msg');
    el.textContent = text;
    el.className = 'cfg-msg mono ' + (cls || '');
  }
  $('#btn-cfg-save').addEventListener('click', () => {
    readCfgForm();
    refreshStats(); refreshBridge();
    store.logAdd('sys', store.isDemo() ? '切换到演示模式（离线）' : `引擎已连接：<b>${escHtml(store.cfg.model)}</b> @ ${escHtml(store.cfg.base)}`);
    cfgMsg(store.isDemo() ? '已保存：演示模式，离线可跑通全流程。' : '已保存。建议点「测试连接」确认链路。', 'ok');
    toast('罗盘已校准');
  });
  $('#btn-cfg-test').addEventListener('click', async () => {
    readCfgForm();
    if (store.isDemo()) { cfgMsg('当前为演示模式，无需测试。填入 BASE URL 后再试。', ''); return; }
    cfgMsg('测试中…');
    try {
      const reply = await LLM.test();
      cfgMsg(`链路畅通，模型回话：「${reply}」`, 'ok');
      refreshStats();
      toast('连接成功 ✓');
    } catch (err) {
      cfgMsg('失败：' + err.message + '（若为 CORS/网络错误，优先使用本地 llama.cpp 或支持跨域的接口）', 'err');
    }
  });
  $('#btn-reset-all').addEventListener('click', () => {
    if (!confirm('确定清空本机全部夜航数据？（项目、藏书、航海志、设置，不可恢复）')) return;
    store.resetAll();
    location.reload();
  });
  $('#conn-pill').addEventListener('click', () => go('compass'));

  /* ═══ 首屏 ═══ */
  function init() {
    // 存储写失败（配额满/隐私模式）时给出可见提示，不静默丢数据
    store.onWriteError = () => toast('本机存储写入失败，数据可能未持久化', true);
    a11ySweep(document); // 静态标记里的图标字形对读屏器是噪音
    renderCrew();
    renderStages();
    renderKb();
    refreshDock();
    refreshBridge();
    fillCfgForm();
    moveGlider();
    window.addEventListener('resize', moveGlider);
    // 首次到访：自动弹起航仪式
    if (!store.proj && !store.log.length) {
      setTimeout(() => openOnboard(), 800);
    }
  }
  init();
})();
