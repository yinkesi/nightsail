/* 夜航 llm.js — OpenAI 兼容接口客户端（SSE 流式） + 演示模式回退 */
(function () {
  'use strict';

  const store = window.NSStore;

  /**
   * chat({system, user, onDelta, onDone, onError, signal})
   * 演示模式（未配置 base）由调用方自行走 NSDemo，本函数只走真实接口。
   * 返回完整文本；失败时 throw Error(带可读原因)。
   */
  async function chat({ system, user, onDelta, signal, temperature }) {
    const cfg = store.cfg;
    if (!cfg.base) throw new Error('未配置引擎接口（当前为演示模式）');

    const url = cfg.base.replace(/\/+$/, '') + '/chat/completions';
    const headers = { 'Content-Type': 'application/json' };
    if (cfg.key) headers.Authorization = 'Bearer ' + cfg.key;

    const body = {
      model: cfg.model || 'default',
      stream: true,
      temperature: typeof temperature === 'number' ? temperature : (cfg.temp ?? 0.7),
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: user }
      ]
    };

    const res = await fetch(url, {
      method: 'POST', headers, body: JSON.stringify(body), signal
    });

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
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const payload = t.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            full += delta;
            onDelta && onDelta(delta, full);
          }
        } catch (e) { /* 忽略半包 */ }
      }
    }
    if (!full) throw new Error('接口未返回任何内容。请检查模型名是否正确。');
    return full;
  }

  /** 快速测试连接：发一条 1 token 的问候 */
  async function test() {
    const text = await chat({
      system: '你是连通性测试器，只回复两个字：畅通',
      user: 'ping',
      temperature: 0
    });
    return text.slice(0, 40);
  }

  window.NSLLM = { chat, test };
})();
