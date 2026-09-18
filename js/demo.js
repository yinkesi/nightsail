/* 夜航 demo.js — 演示模式脚本内容（离线可跑通完整工作流）
   内容以示例项目「课本漂流」为原型，参数化注入船名与航向 */
(function () {
  'use strict';

  function brief(name, pitch) {
    return `# 航前会 · ${name}

> **一句话定位**：${pitch}

## 一、她是谁
**${name}** 是一个由学生运营的轻量服务：不追大而全，只把一件事做到值得口口相传。

## 二、为谁解决什么问题
- **目标用户**：先圈定"最痛的一小撮"——同校区、高频接触该问题的大学生，而不是泛泛的"所有学生"。
- **核心痛点**：用户当前解决问题的办法（群聊喊话、碰运气、忍受不便）费时费力且不可靠，转换意愿天然存在。
- **情绪洞察**：用户要的不只是功能，还有"被同校人靠谱地接住"的信任感。

## 三、价值主张
**三折努力，一份确定性。** 把原本要碰运气的事，变成一个可预期的动作。

## 四、MVP 边界（第一航段只做这些）
1. 一个能让用户完成核心动作的最小闭环（发布 → 匹配 → 交付）
2. 微信群 / 朋友圈作为分发渠道，不开发 App
3. 人工客服 = 船长本人，前期所有异常人工兜底

## 五、命名与口号
- 名字：**${name}**（口播友好，同学间一提就懂）
- 口号候选：① 别再碰运气。② 三分钟，搞定。③ 从今天起，靠谱是标配。

## 六、两周验证计划
| 时间 | 动作 | 通过标准 |
|---|---|---|
| 第 1–3 天 | 朋友圈 + 2 个年级群发布内测招募 | 30 人进群 |
| 第 4–10 天 | 手动撮合前 20 单，记录每单耗时与投诉 | 完成率 ≥ 80% |
| 第 11–14 天 | 复盘：用户是否主动回来用第二次 | 次周回流 ≥ 30% |

## 七、风险与对策
- **冷启动无人用** → 先服务好 1 个学院，做透再扩。
- **口碑事故** → 前期全人工审核，慢就是快。
- **学业冲突** → 每周运营时间封顶 5 小时，能用 AI 自动化的绝不手工。

*—— 军师·鹄 起草 · 供船长修订*`;
  }

  function scout(name, pitch) {
    return `# 侦察报告 · ${name}

## 一、海况（需求侧）
- **问题真实度**：⭐⭐⭐⭐ 目标用户在访谈中会主动抱怨该问题，属"高频低成本"型需求，适合学生侧轻启动。
- **时机**：开学季 / 换届季 / 考试季存在天然流量峰，首航应卡在峰前两周。[待验证]
- **情绪洞察**：用户要的不只是功能，还有"被同校人靠谱地接住"的信任感。

## 二、附近的其他船（竞品对照）
| 对手 | 打法 | 他们的弱点 | 我们的差异化 |
|---|---|---|---|
| 大平台通用方案 | 功能全但为大众设计 | 不懂校园场景，冷启动重 | 只服务一个校区，够深 |
| 群聊 + 接龙 | 零成本 | 信息沉底、无信任保障 | 有记录、有兜底、可追溯 |
| 校方/社团渠道 | 权威 | 流程慢、体验旧 | 24h 响应，同学语气 |

## 三、风向（增长侧）
- 种子用户最优解：**辅导员 / 班长 / 群主**三个节点，一次触达 = 一整个班级。[待验证]
- 内容钩子：晒"第 N 单完成"截图，比任何广告都可信。

## 四、验证实验（先花一周，别先写代码）
1. 拉一个 50 人内测群，手动提供服务（不对，是"人肉 MVP"）。
2. 记录：多少人问价、多少人下单、多少人回头。
3. 若回流 < 20%，先改话术与定价，再考虑写代码。

## 五、侦察结论
**可以启航，但只许造小船。** 两周内验证核心闭环，不碰 App、不碰支付牌照敏感环节。

*—— 侦察官·隼 观测 · 供军师复核*`;
  }

  function build(name, pitch) {
    return `# 造船清单 · ${name}

## 一、MVP 功能（P0 = 没它不能出海）
| 级别 | 功能 | 一句话验收标准 |
|---|---|---|
| P0 | 核心发布流 | 用户 3 步内完成一次发布 |
| P0 | 匹配/交付闭环 | 从发布到完成 ≤ 24h |
| P0 | 信用展示 | 每单有双方确认记录 |
| P1 | 通知 | 微信模板消息 / 群机器人播报 |
| P1 | 数据看板 | 船长能看周活与完成率 |
| P2 | 积分与勋章 | 拒绝做，首月不做 |

## 二、技术选型（一人可维护为最高原则）
- **前端**：单页静态站（HTML+JS，零构建链路），容器：任意免费静态托管。
- **后端**：云函数 / Serverless 免费档，或 WhatsApp/微信群 + 表格硬扛前 100 单。
- **AI 层**：${name} 的客服与内容初稿全部由本地/接口大模型起草，船长只做审核。
- **原则**：能买不造、能白嫖不买、能自动不手工。

## 三、两周冲刺排期
- **D1–2**：落地页上线（船坞生成）+ 内测群建立。
- **D3–5**：P0 发布流联调；每天找 3 个真实用户走一遍。
- **D6–8**：交付闭环 + 人工兜底 SOP 写成一页纸。
- **D9–10**：接通知播报；埋最简统计（发布数/完成数/回流数）。
- **D11–12**：bug 清零，发布文案就位（去信号塔生成）。
- **D13–14**：正式亮灯，首轮 200 人触达。

## 四、成本表（OPC 版）
| 项目 | 方案 | 月成本 |
|---|---|---|
| 域名 | .site 首年特惠 | ≈ ¥8 |
| 托管 | 静态托管免费档 | ¥0 |
| 后端 | 云函数免费额度 | ¥0 |
| AI | 本地模型 / 免费额度 | ¥0 |
| **合计** | | **≈ ¥8/月** |

## 五、上线验收（绿灯标准）
- 真实用户完成 ≥ 20 单核心闭环；
- 完成率 ≥ 80%，投诉 ≤ 2 起；
- 至少 30% 用户第二周主动回流。

*—— 船匠·鲁 制图 · 供船长签收*`;
  }

  function launch(name, pitch) {
    return `# 亮灯发布包 · ${name}

## 一、发布节奏（发布日 = 周日晚 21:00）
1. **预热（前 3 天）**：朋友圈晒开发日志截图，标题打"一个学生的一人公司"。
2. **首发（当晚）**：内测群 + 2 个年级群同步发公告（文案见信号塔）。
3. **接力（次日）**：找 3 位种子用户发体验反馈截图，船长江集体答谢。

## 二、发布公告（定稿）
> 🚢 **${name}，今晚亮灯。**
> ${pitch}
> 首批限量 50 个创始用户，全部功能免费，直通船长本人反馈通道。
> 👉 入口：见群公告链接

## 三、FAQ 预案（客服口径）
- **收费吗？** 现在全部免费。未来若收费，创始用户永久 5 折。
- **信息会泄露吗？** 数据只用于撮合本身，可随时注销删除。
- **出问题找谁？** 群里 @船长，24h 内响应。

## 四、亮灯自检清单
- [ ] 落地页在手机端打开 ≤ 3 秒
- [ ] 发布流走通 5 次无事故
- [ ] 公告文案与落地页口径一致
- [ ] 客服口径已同步给所有协助同学

*—— 信号兵·鸢 与 船匠·鲁 联合签发*`;
  }

  function growth(name, pitch) {
    return `# 增长信风 · ${name}

## 一、两周内容日历
| 日期 | 渠道 | 内容钩子 |
|---|---|---|
| 周一 | 朋友圈 | 本周战报：新增 N 单、最快 N 分钟成交 |
| 周三 | 小红书 | 故事帖：我为什么在宿舍开了一人公司 |
| 周五 | 校园群 | 福利帖：周五下单送优先撮合位 |
| 周日 | 知乎 | 干货帖：学生轻创业的 OPC 最小闭环（含模板） |

## 二、渠道优先级
1. **私域群**（转化最高）：每周固定"营业时间"制造预期。
2. **朋友圈/小红书**（信任资产）：晒真实过程，不晒完美海报。
3. **知乎/公众号**（长尾）：只沉淀方法论，顺手导流。

## 三、留存与回流
- **第 2 单激励**：完成首单 48h 内推送"老船票"优惠券（成本为 0 的优先权）。
- **周报仪式**：每周日向全体用户发 3 行战报，制造"这船还活着"的安全感。
- **流失回访**：7 天未活跃，船长亲自私信 1 句话（AI 起草，人工发送）。

## 四、周复盘模板（每周日 15 分钟）
1. 本周北极星（完成单数）：___，环比 ___%
2. 最有效的一个动作 / 最浪费的一个动作
3. 下周只做的一件事：___

## 五、增长红线
- 不刷量、不买水军、不做夸大承诺——OPC 的船小，翻不起但也沉不起。
- 每周运营 ≤ 5 小时，超出即说明流程该自动化了。

*—— 信号兵·鸢 执笔 · 与军师·鹄会签*`;
  }

  function signalCopy(ch, name, pitch) {
    const map = {
      xiaohongshu: `# 🚢 在宿舍开了一人公司，第 7 天

姐妹们！！我真的憋不住要说了 ——
我搞了个小东西叫 **${name}** ✨

${pitch}

起因超简单：我自己被这个问题烦了一整学期，
试过群接龙、试过碰运气，全都不靠谱 😇
于是我干脆自己动手，用一个周末把它做出来了！

现在它已经帮我和小伙伴搞定了 20+ 单 💪
【真实截图在 P2 / P3，没摆拍】

🎯 目前免费，只招 50 个创始用户
💬 想体验的评论区扣"上船"，我看到就回！

#大学生创业 #一人公司 #AI效率工具 #校园好物 #学生党必看`,
      moments: `晚上好，汇报一件事 🌙

折腾了两周的「${name}」今晚亮灯。
一句话：${pitch}

不融资、不开会、一个人 + 一队 AI 船员。
首批 50 个创始用户免费，反馈直达我本人。
入口在评论区 👇 求转发给需要的同学`,
      campus: `【校内服务上线】${name} · 首批创始用户招募

同学们好！我们是本校学生团队（目前其实只有一个人和五位 AI 船员）。

我们在做的事：${pitch}

· 首批限 50 人，全部功能免费
· 全流程可追溯，问题 24 小时内响应
· 意见直达负责人，共同决定产品方向

报名方式：回复本条消息"上船"+ 你的年级专业。
名额有限，按回复顺序录取。`,
      zhihu: `# 一个大三学生的一人公司实验：我如何用 AI 船员补齐所有短板

## 先说结论
不用融资、不用组队、不用辞职。一个人 + 一组 AI Agent，足够把一个校园服务从想法推进到上线。我用两周做了「${name}」——${pitch}以下是完整过程和方法论。

## 一、为什么是一人公司（OPC）
组队常见成本：沟通对齐、股权谈判、进度互等。学生创业最大的资产是时间和试错速度，最贵的成本恰恰是"人"。OPC 把固定成本压到近零：我负责判断和审核，AI 负责起草和执行。

## 二、我的"船员编制"
- 军师：定位与策划书起草
- 侦察官：竞品与需求验证方案
- 船匠：MVP 功能清单与技术选型
- 信号兵：全渠道文案
- 舵手：流程编排与知识库管理

每人各司其职，我每周只花 5 小时运营。

## 三、两周最小闭环
第 1–3 天人肉验证需求（拉群手动服务），第 4–10 天上 MVP，第 11–14 天亮灯。关键指标只有三个：完成率、回流率、投诉数。

## 四、给想开始的你的三个忠告
1. 先手动跑通业务，再写代码；
2. 成本表第一行永远是"月预算 ≤ 一杯奶茶"；
3. 把 AI 当船员而不是许愿池——它出稿，你签收。

（工具与提示词模板我整理好了，需要的评论区留言）`
    };
    return map[ch] || map.xiaohongshu;
  }

  function landing(name, pitch) {
    const safe = NSMD.esc(name);
    const p = NSMD.esc(pitch);
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safe} — 同学们的确定性</title>
<style>
  :root{--bg:#0a0c12;--ink:#eef1f8;--mut:#9aa3b8;--line:rgba(238,241,248,.12);
    --g:linear-gradient(100deg,#5b9dff,#b48ae0 52%,#e87f89)}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:"PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",system-ui,sans-serif;
    background:var(--bg);color:var(--ink);line-height:1.7;overflow-x:hidden}
  .wrap{max-width:1080px;margin:0 auto;padding:0 28px}
  nav{display:flex;align-items:center;gap:14px;padding:26px 0}
  .logo{width:34px;height:34px;border-radius:10px;background:var(--g);display:grid;place-items:center;font-weight:800;color:#0a0c12}
  nav b{font-size:17px}
  nav .cta{margin-left:auto;background:var(--g);color:#0a0c12;padding:10px 22px;border-radius:999px;font-weight:600;font-size:14px;text-decoration:none}
  header{padding:88px 0 72px;text-align:center;position:relative}
  header::before{content:"";position:absolute;inset:-40% -20%;z-index:-1;
    background:radial-gradient(42% 42% at 30% 30%,rgba(91,157,255,.18),transparent 70%),
      radial-gradient(40% 40% at 70% 60%,rgba(180,138,224,.16),transparent 70%);filter:blur(40px)}
  .tag{display:inline-flex;gap:8px;align-items:center;font-size:12px;letter-spacing:.14em;color:var(--mut);
    border:1px solid var(--line);border-radius:999px;padding:7px 16px}
  .tag i{width:7px;height:7px;border-radius:50%;background:#8fd6a8}
  h1{font-size:clamp(34px,6vw,62px);line-height:1.12;letter-spacing:-.03em;font-weight:700;margin:30px 0 0}
  h1 span{background:var(--g);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sub{margin:22px auto 0;max-width:640px;color:var(--mut);font-size:17px}
  .cta-row{margin-top:36px;display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
  .btn{padding:15px 32px;border-radius:999px;font-weight:600;font-size:15.5px;text-decoration:none}
  .btn-main{background:var(--g);color:#0a0c12}
  .btn-ghost{border:1px solid var(--line);color:var(--ink)}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:760px;margin:70px auto 0}
  .stat{border:1px solid var(--line);border-radius:20px;padding:24px;background:rgba(255,255,255,.02)}
  .stat b{font-size:30px;letter-spacing:-.02em}
  .stat b em{font-style:normal;font-size:15px;color:var(--mut)}
  .stat small{display:block;color:var(--mut);margin-top:6px;font-size:13px}
  section{padding:70px 0}
  .sec-t{font-size:26px;font-weight:650;letter-spacing:-.02em;text-align:center}
  .sec-d{color:var(--mut);text-align:center;margin-top:10px}
  .feats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:44px}
  .feat{border:1px solid var(--line);border-radius:22px;padding:28px;background:rgba(255,255,255,.02)}
  .feat .ic{width:42px;height:42px;border-radius:12px;background:rgba(180,138,224,.15);display:grid;place-items:center;margin-bottom:16px;font-size:20px}
  .feat h3{font-size:16.5px}
  .feat p{color:var(--mut);font-size:14px;margin-top:8px}
  .band{border:1px solid var(--line);border-radius:28px;padding:54px 30px;text-align:center;
    background:radial-gradient(60% 100% at 50% 0%,rgba(180,138,224,.14),transparent 70%)}
  .band h2{font-size:clamp(24px,4vw,36px);letter-spacing:-.02em}
  .band p{color:var(--mut);margin-top:12px}
  footer{border-top:1px solid var(--line);padding:34px 0 44px;color:var(--mut);font-size:13px;
    display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
  @media(max-width:760px){.feats,.stats{grid-template-columns:1fr}header{padding:60px 0 50px}}
</style>
</head>
<body>
<div class="wrap">
  <nav><div class="logo">${safe.slice(0, 1)}</div><b>${safe}</b>
    <a class="cta" href="#join">立即上船</a></nav>
  <header>
    <span class="tag"><i></i>创始用户 · 限量 50 席</span>
    <h1>别再碰运气，<br><span>把这件事交给确定性。</span></h1>
    <p class="sub">${p}<br>由本校学生运营，AI 驱动，24 小时内响应。</p>
    <div class="cta-row">
      <a class="btn btn-main" href="#join">免费加入首批用户</a>
      <a class="btn btn-ghost" href="#how">看看怎么运作</a>
    </div>
    <div class="stats">
      <div class="stat"><b>3<em> 步</em></b><small>完成一次下单，全程 ≤ 3 分钟</small></div>
      <div class="stat"><b>24<em> h</em></b><small>任何问题直达船长本人</small></div>
      <div class="stat"><b>¥0</b><small>创始用户永久免费</small></div>
    </div>
  </header>
  <section id="how">
    <div class="sec-t">它如何运作</div>
    <p class="sec-d">三步闭环，每一步都有记录，每一单都可追溯。</p>
    <div class="feats">
      <div class="feat"><div class="ic">📝</div><h3>说出你的需求</h3><p>像发朋友圈一样简单，30 秒发布，不用学任何新东西。</p></div>
      <div class="feat"><div class="ic">🤝</div><h3>系统快速撮合</h3><p>AI 匹配 + 人工兜底，绝大多数订单 24 小时内交付。</p></div>
      <div class="feat"><div class="ic">🛡️</div><h3>双方确认完结</h3><p>完成双确认，信用互相可见，口碑看得见。</p></div>
    </div>
  </section>
  <section id="join">
    <div class="band">
      <h2>首航灯已亮，虚位以待。</h2>
      <p>回复"上船"到我们的公众号 / 群聊，或直接联系船长。</p>
      <div class="cta-row"><a class="btn btn-main" href="#">立即上船 →</a></div>
    </div>
  </section>
  <footer><span>© 2026 ${safe} · 由一名大学生与 AI 船员共同运营</span><span>OPC · 一人公司实践</span></footer>
</div>
</body>
</html>`;
  }

  /* 内置质检/互审数据（演示模式）：接真实引擎后由对方船员实审 */
  const QC = {
    brief:  { scores: { exec: 4, detail: 3, align: 5 }, issues: ['[中] 口号候选①「别再碰运气。」偏否定式，缺少正向利益点，建议以②「三分钟，搞定。」为主口号。', '[中] 两周验证计划的通过标准建议补一行「次周回流率 ≥ 30%」，否则冷启动成功与否无判据。'] },
    scout:  { scores: { exec: 3, detail: 4, align: 5 }, issues: ['[高] 「一周验证实验」缺第一个动作：先访谈 3 家目标店主/3 名同学，验证折扣与信息意愿，再谈拉群。', '[低] 「人肉 MVP」建议改为「人工服务试点」，对外表述更专业。'] },
    build:  { scores: { exec: 5, detail: 3, align: 4 }, issues: ['[中] 成本表缺域名续费（第二年通常 ¥60+），建议注明「首年特惠价」。', '[中] 冲刺排期 D6-8 的 SOP 应写明验收人（船长本人）与验收时间点。'] },
    launch: { scores: { exec: 4, detail: 3, align: 5 }, issues: ['[中] FAQ 缺必被问到的「和微信群接龙/大平台有什么区别」，建议补一条对照口径。', '[低] 发布日选周日晚 21:00 合理，但建议避开考试周前两周。'] },
    growth: { scores: { exec: 3, detail: 4, align: 4 }, issues: ['[高] 内容日历缺复用规则：同一素材如何改写成 4 个渠道的分发路径，避免每周重复劳动。', '[中] 周复盘模板建议增加「退群/取关数」指标，只看增长会漏掉流失信号。'] }
  };
  function qc(id) { return QC[id] || QC.brief; }

  window.NSDemo = { brief, scout, build, launch, growth, signalCopy, landing, qc };
})();
