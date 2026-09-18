/* 夜航 store.js — 本机状态：设置 / 项目 / 产出物 / 知识库 / 航海志
   全部存 localStorage，命名空间 nightsail: */
(function () {
  'use strict';

  const NS = 'nightsail:';
  const KEYS = { cfg: NS + 'cfg', proj: NS + 'proj', kb: NS + 'kb', log: NS + 'log' };

  const PRESETS = {
    demo:     { base: '', model: '', key: '', temp: 0.7, pin: 0, pout: 0 },
    local:    { base: 'http://127.0.0.1:8080/v1', model: 'minicpm5', key: '', temp: 0.7, pin: 0, pout: 0 },
    zhipu:    { base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash', key: '', temp: 0.7, pin: 0, pout: 0 },
    deepseek: { base: 'https://api.deepseek.com', model: 'deepseek-chat', key: '', temp: 0.7, pin: 2, pout: 8 },
    moonshot: { base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', key: '', temp: 0.7, pin: 12, pout: 12 },
    custom:   { base: '', model: '', key: '', temp: 0.7, pin: 0, pout: 0 }
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) {
      console.warn('[nightsail] 本地存储写入失败', key, e);
      // 供 UI 层挂接提示（如 toast），避免静默丢数据
      if (typeof api.onWriteError === 'function') api.onWriteError(key);
      return false;
    }
  }

  /* ---- 配置 ---- */
  let cfg = read(KEYS.cfg, null) || Object.assign({}, PRESETS.demo);
  function saveCfg() { write(KEYS.cfg, cfg); }
  function isDemo() { return !cfg.base; }

  /* ---- 项目 ---- */
  // proj = { name, pitch, createdAt, stages:{id:text}, cites:{id:[{i,doc,chunk,score}]},
  //          qc:{id:{scores,reviewer,issues,revised}}, reviews:{id:md},
  //          usage:{byKey:{key:{calls,ms,tin,tout,cost,demo}}}, landing:{}, signals:{} }
  function normalize(p) {
    if (!p) return p;
    p.stages = p.stages || {}; p.signals = p.signals || {};
    p.cites = p.cites || {}; p.qc = p.qc || {}; p.reviews = p.reviews || {};
    p.usage = p.usage || { byKey: {} };
    if (!p.usage.byKey) p.usage.byKey = {};
    return p;
  }
  let proj = normalize(read(KEYS.proj, null));
  function newProject(name, pitch) {
    proj = normalize({
      name: name || '未命名的船', pitch: pitch || '',
      createdAt: Date.now()
    });
    saveProj();
    return proj;
  }
  function saveProj() { if (proj) write(KEYS.proj, proj); }

  /* ---- 知识库 ---- */
  let kb = read(KEYS.kb, []);
  function saveKb() { write(KEYS.kb, kb); }

  // 分段：优先按空行/标题切，再合并到 200–600 字
  function chunkText(text) {
    const paras = String(text).replace(/\r\n?/g, '\n')
      .split(/\n\s*\n|\n(?=#{1,4}\s)/).map(s => s.trim()).filter(Boolean);
    const chunks = [];
    let buf = '';
    for (const p of paras) {
      if ((buf + '\n' + p).length > 600 && buf.length >= 200) { chunks.push(buf); buf = p; }
      else buf = buf ? buf + '\n' + p : p;
    }
    if (buf) chunks.push(buf);
    // 超长段落兜底硬切
    const fin = [];
    for (const c of chunks) {
      for (let i = 0; i < c.length; i += 600) fin.push(c.slice(i, i + 600));
    }
    return fin;
  }

  function kbAdd(title, text) {
    const doc = { id: 'kb' + Date.now().toString(36), title, addedAt: Date.now(), text, chunks: chunkText(text) };
    kb.push(doc); saveKb();
    return doc;
  }
  function kbDel(id) { kb = kb.filter(d => d.id !== id); saveKb(); }

  // 检索：中文 bigram 重叠打分，取 top n
  function bigrams(s) {
    const t = s.toLowerCase().replace(/\s+/g, '');
    const set = new Set();
    for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
    return set;
  }
  function kbSearch(query, n) {
    n = n || 3;
    const q = bigrams(query);
    const hits = [];
    for (const doc of kb) {
      for (let ci = 0; ci < doc.chunks.length; ci++) {
        const g = bigrams(doc.chunks[ci]);
        let inter = 0;
        g.forEach(x => { if (q.has(x)) inter++; });
        const score = g.size ? inter / Math.sqrt(g.size) : 0;
        if (score > 0.04) hits.push({ doc: doc.title, chunk: doc.chunks[ci], score });
      }
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, n);
  }
  function kbContext(query) {
    return kbContextDetailed(query, 3).text;
  }
  // 带编号引用上下文：cites 供产物徽章回跳
  function kbContextDetailed(query, n) {
    n = n || 3;
    const hits = kbSearch(query, n);
    const text = hits.length
      ? '\n\n【船内参考资料（事实以此为准，未覆盖处需标注 [待验证]）】\n' +
        hits.map((h, i) => `[资料${i + 1} · ${h.doc}]\n${h.chunk}`).join('\n---\n')
      : '';
    return { text, cites: hits.map((h, i) => ({ i: i + 1, doc: h.doc, chunk: h.chunk, score: h.score })) };
  }

  /* ---- 航海志 ---- */
  const LOG_MAX = 500; // 防止逼近 localStorage 配额
  let log = read(KEYS.log, []);
  function logAdd(type, html) {
    const entry = { t: Date.now(), type, html };
    log.push(entry);
    if (log.length > LOG_MAX) log = log.slice(-LOG_MAX);
    write(KEYS.log, log);
    return entry;
  }
  function logReset() { log = []; write(KEYS.log, log); }

  function logExport() {
    const decode = (s) => { const el = document.createElement('textarea'); el.innerHTML = s; return el.value; };
    const lines = log.map(e => {
      const d = new Date(e.t);
      const ts = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const text = decode(e.html.replace(/<[^>]+>/g, ''));
      return `- \`${ts}\` **[${e.type}]** ${text}`;
    });
    return `# 夜航 NightSail · 航海志导出\n\n> 项目：${proj ? proj.name : '（无）'} · 导出于 ${new Date().toLocaleString('zh-CN')}\n\n${lines.join('\n')}\n`;
  }

  function resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    cfg = Object.assign({}, PRESETS.demo); proj = null; kb = []; log = [];
  }

  const api = {
    PRESETS, get cfg() { return cfg; }, set cfg(v) { cfg = v; saveCfg(); },
    saveCfg, isDemo, onWriteError: null,
    get proj() { return proj; }, newProject, saveProj,
    kbAdd, kbDel, kbSearch, kbContext, get kb() { return kb; },
    logAdd, logReset, logExport, get log() { return log; }, resetAll
  };
  window.NSStore = api;
})();
