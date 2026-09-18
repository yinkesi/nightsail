/* 夜航 llm.js — OpenAI 兼容接口客户端（SSE 流式） + 演示模式回退 */
(function () {
  'use strict';

  const store = window.NSStore;

  /**
   * chat({system, user, onDelta, onDone, onError, signal})
   * 演示模式（未配置 base）由调用方自行走 NSDemo，本函数只走真实接口。
   * 返回完整文本；失败时 throw Error(带可读原因)。
   */
  async function chat({ system, user, onDelta, temperature }) {
    const cfg = store.cfg;
    if (!cfg.base) throw new Error('未配置引擎接口（当前为演示模式）');

    const url = cfg.base.replace(/\/+$/, '') + '/chat/completions';
    const headers = { 'Content-Type': 'application/json' };
    if (cfg.key) headers.Authorization = 'Bearer ' + cfg.key;

    // 空闲超时保护：每收到一段流就重置计时，120s 无任何响应才中断（防止 busy 永久死锁，又不掐正常长流）
    const ctrl = new AbortController();
    let timer = 0;
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(() => ctrl.abort(), 120000);
    };

    const body = {
      model: cfg.model || 'default',
      stream: true,
      temperature: typeof temperature === 'number' ? temperature : (cfg.temp ?? 0.7),
      stream_options: { include_usage: true }, // 服务端不支持时回退重试
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: user }
      ]
    };

    // 单行 SSE 解析；遇到内容增量时累积 full 并回调；捕获服务端 usage
    let full = '';
    let usageSeen = null;
    const handleLine = (line) => {
      const t = line.trim();
      if (!t.startsWith('data:')) return;
      const payload = t.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload);
        if (json.usage) usageSeen = { tin: json.usage.prompt_tokens || 0, tout: json.usage.completion_tokens || 0 };
        const delta = json.choices?.[0]?.delta?.content || '';
        if (delta) {
          full += delta;
          onDelta && onDelta(delta, full);
        }
      } catch (e) { /* 忽略半包 */ }
    };

    try {
      bump();
      const mkInit = (b) => ({ method: 'POST', headers, body: JSON.stringify(b), signal: ctrl.signal });
      let res = await fetch(url, mkInit(body));
      if (res.status === 400 && body.stream_options) {
        // 个别兼容服务不认识 stream_options：去掉重试一次
        const fallback = { ...body };
        delete fallback.stream_options;
        res = await fetch(url, mkInit(fallback));
      }

      if (!res.ok) {
        let detail = '';
        try { detail = (await res.text()).slice(0, 200); } catch (e) { /* ignore */ }
        if (res.status === 401) throw new Error('密钥被拒绝（401）。请到罗盘检查 API KEY。');
        if (res.status === 404) throw new Error('接口路径不存在（404）。请检查 BASE URL 是否以 /v1 结尾、模型名是否正确。');
        throw new Error(`接口返回 ${res.status}：${detail || '无详情'}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bump(); // 流仍活跃，重置空闲计时
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          handleLine(buf.slice(0, idx));
          buf = buf.slice(idx + 1);
        }
      }
      buf += decoder.decode();
      if (buf.trim()) handleLine(buf); // 冲洗尾包

      if (!full) throw new Error('接口未返回任何内容。请检查模型名是否正确。');
      const estTok = (s) => Math.max(1, Math.round(s.length / 1.7));
      const usage = usageSeen
        ? { tin: usageSeen.tin, tout: usageSeen.tout, est: false }
        : { tin: estTok((system || '') + user), tout: estTok(full), est: true };
      return { text: full, usage };
    } catch (err) {
      if (ctrl.signal.aborted) throw new Error('连接空闲超过 120 秒或被中断，请检查接口后重试。');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 快速测试连接：发一条 1 token 的问候 */
  async function test() {
    const r = await chat({
      system: '你是连通性测试器，只回复两个字：畅通',
      user: 'ping',
      temperature: 0
    });
    return r.text.slice(0, 40);
  }

  window.NSLLM = { chat, test };
})();
