"""Browser smoke test: plays full games (computer players, and a human answering puzzles/duels).
Run: pip install playwright && playwright install chromium; python tests/smoke.py"""
import pathlib, sys
from playwright.sync_api import sync_playwright

URL = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
FAST = "Object.assign(WVGame.DELAY,{ai:5,step:1,slide:5})"

def check_errors(errors):
    if errors:
        print('JS errors:', errors); sys.exit(1)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    page = b.new_page(viewport={'width': 1400, 'height': 900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.evaluate(FAST)

    # 1) Four computer players, full game, several boards
    for code in ['FERN-42', 'MOSS-17', 'EMBER-88']:
        page.goto(URL); page.evaluate(FAST)
        page.fill('#codeInput', code)
        for _ in range(2): page.click('#addPlayerBtn')
        sels = page.locator('.prow select:nth-of-type(2)')
        for i in range(4): sels.nth(i).select_option('c')
        page.locator('.prow select:nth-of-type(1)').nth(3).select_option('6')
        page.click('#startBtn')
        page.wait_for_selector('#stage .title:has-text("wins")', timeout=180000)
        print(code, page.inner_text('#stage .title'), '| log lines:', page.locator('#log div').count())
    check_errors(errors)

    # 2) One human vs one computer: human always answers correctly and plays duels
    page.goto(URL); page.evaluate(FAST)
    page.fill('#codeInput', 'ROOT-23')
    page.click('#startBtn')
    steps = 0
    while steps < 3000:
        steps += 1
        if page.locator('#stage .title:has-text("wins")').count(): break
        ans = page.locator('#stage .answer input:not([disabled])')
        if ans.count():
            q = page.locator('#stage .msg b').filter(has_text='= ?').last.inner_text()
            expr = q.replace('= ?', '').replace('−', '-').strip()
            ans.fill(str(eval(expr))); ans.press('Enter'); continue
        slot = page.locator('#stage button.slot.pick')
        if slot.count(): slot.first.click(); continue
        btn = page.locator('#stage .actions button:not([disabled])')
        if btn.count(): btn.first.click(); continue
        page.wait_for_timeout(20)
    print('human game:', page.inner_text('#stage .title'), 'steps', steps)
    log = page.inner_text('#log')
    print('vines climbed:', log.count('climbs the vine'), '| wyrms dodged:', log.count('shook off'), '| duels:', log.count('duels'))
    check_errors(errors)
    # 3) Unlocks: Player 1 just finished a level 1 game, so level 4 stays locked; a level 3 record opens it
    page.goto(URL)
    lvl4 = page.locator('.prow').first.locator('select').first.locator('option[value="4"]')
    assert lvl4.is_disabled(), 'level 4 should be locked'
    page.evaluate("localStorage.setItem('wyrms-and-vines.played', JSON.stringify({'player 1': 3}))")
    page.goto(URL)
    lvl4 = page.locator('.prow').first.locator('select').first.locator('option[value="4"]')
    adult = page.locator('.prow').first.locator('select').first.locator('option[value="6"]')
    assert not lvl4.is_disabled() and adult.is_disabled(), 'level 4 open, adult still locked'
    page.check('#unlockAll')
    assert not page.locator('.prow').first.locator('select').first.locator('option[value="6"]').is_disabled()
    print('unlocks OK')
    b.close()
print('OK')
