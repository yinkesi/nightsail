# 夜航自检脚本：截图七个舱室 + 抓控制台错误 + 走通演示工作流
from playwright.sync_api import sync_playwright
import os, pathlib

OUT = pathlib.Path(__file__).parent / "_shots"
OUT.mkdir(exist_ok=True)
URL = "http://localhost:8123"

errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(URL)
    page.wait_for_timeout(1800)  # 等尘埃粒子淡入 + 起航仪式弹出
    page.screenshot(path=str(OUT / "01-onboard.png"))

    # 点示例点子 → 启航
    page.click(".onboard-chips .chip")
    page.click("#btn-onboard-go")
    page.wait_for_timeout(4500)  # 演示模式打字机
    page.screenshot(path=str(OUT / "02-voyage-gen.png"), full_page=True)

    # 等生成完毕，展开并起草第 02 段（侦察）
    page.wait_for_timeout(4000)
    page.click('[data-open="scout"]')
    page.wait_for_timeout(400)
    page.click('[data-gen="scout"]')
    page.wait_for_timeout(8000)
    page.screenshot(path=str(OUT / "03-voyage-done.png"), full_page=True)

    # 舰桥
    page.click('.rail-item[data-nav="bridge"]')
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / "04-bridge.png"), full_page=True)

    # 船坞：生成落地页
    page.click('.rail-item[data-nav="dock"]')
    page.wait_for_timeout(400)
    page.click("#btn-gen-landing")
    page.wait_for_timeout(2500)
    page.screenshot(path=str(OUT / "05-dock.png"), full_page=True)

    # 信号塔
    page.click('.rail-item[data-nav="signal"]')
    page.wait_for_timeout(300)
    page.click("#btn-gen-signal")
    page.wait_for_timeout(3500)
    page.screenshot(path=str(OUT / "06-signal.png"), full_page=True)

    # 藏书舱
    page.click('.rail-item[data-nav="library"]')
    page.wait_for_timeout(300)
    page.fill("#kb-title", "30 份同学访谈摘录")
    page.fill("#kb-content", "访谈发现：85% 的受访同学愿意为三折正版二手教材等待 48 小时以内。主要顾虑是笔记涂写程度与是否正版。七成受访者表示微信群接龙经常错过消息，希望有固定入口。")
    page.click("#btn-kb-add")
    page.wait_for_timeout(500)
    page.fill("#kb-probe-q", "同学愿意为二手教材付多少钱")
    page.click("#btn-kb-probe")
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / "07-library.png"), full_page=True)

    # 航海志 + 导出下载断言
    page.click('.rail-item[data-nav="logbook"]')
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT / "08-logbook.png"), full_page=True)
    with page.expect_download() as dl_info:
        page.click("#btn-export-log")
    dl = dl_info.value
    exported = OUT / dl.suggested_filename
    dl.save_as(str(exported))
    assert exported.stat().st_size > 200, "航海志导出文件过小，导出链路异常"
    print("EXPORT OK:", dl.suggested_filename, exported.stat().st_size, "bytes")

    # 罗盘
    page.click('.rail-item[data-nav="compass"]')
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT / "09-compass.png"), full_page=True)

    browser.close()

print("=== CONSOLE ERRORS ===")
print("\n".join(errors) if errors else "(none)")
print("=== SHOTS ===")
for f in sorted(OUT.iterdir()):
    print(f.name, f.stat().st_size)
