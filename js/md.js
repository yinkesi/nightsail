/* 夜航 md.js — 轻量 Markdown 渲染（离线，零依赖）
   支持：标题/粗斜体/行内代码/列表/表格/引用/分隔线/链接/围栏代码块 */
(function () {
  'use strict';

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
      // 仅放行安全协议，拦截 javascript:/data: 等注入
      if (!/^(https?:|mailto:|#|\/)/i.test(url)) return text;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
    });
    return s;
  }

  function render(src) {
    if (!src) return '';
    const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0, para = [];

    const flushPara = () => {
      if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; }
    };

    while (i < lines.length) {
      const line = lines[i];

      // 围栏代码块
      const fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        flushPara();
        const buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push('<pre><code class="mono">' + esc(buf.join('\n')) + '</code></pre>');
        continue;
      }

      // 标题
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flushPara(); out.push(`<h${h[1].length}>` + inline(h[2]) + `</h${h[1].length}>`); i++; continue; }

      // 分隔线
      if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) { flushPara(); out.push('<hr>'); i++; continue; }

      // 表格
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        flushPara();
        const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const heads = cells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
        let t = '<table><thead><tr>' + heads.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>';
        for (const r of rows) t += '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>';
        t += '</tbody></table>';
        out.push(t);
        continue;
      }

      // 引用
      if (/^\s*>\s?/.test(line)) {
        flushPara();
        const buf = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        out.push('<blockquote>' + inline(buf.join(' ')) + '</blockquote>');
        continue;
      }

      // 无序列表
      if (/^\s*[-*•]\s+/.test(line)) {
        flushPara();
        const items = [];
        while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*•]\s+/, '')); i++;
        }
        out.push('<ul>' + items.map(x => '<li>' + inline(x) + '</li>').join('') + '</ul>');
        continue;
      }

      // 有序列表
      if (/^\s*\d+[.、)]\s+/.test(line)) {
        flushPara();
        const items = [];
        while (i < lines.length && /^\s*\d+[.、)]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+[.、)]\s+/, '')); i++;
        }
        out.push('<ol>' + items.map(x => '<li>' + inline(x) + '</li>').join('') + '</ol>');
        continue;
      }

      // 空行
      if (/^\s*$/.test(line)) { flushPara(); i++; continue; }

      para.push(line.trim());
      i++;
    }
    flushPara();
    return out.join('\n');
  }

  window.NSMD = { render, esc };
})();
