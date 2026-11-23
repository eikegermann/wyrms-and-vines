"""Browser smoke test: plays full games (computer players, and a human answering puzzles/duels).
Run: pip install playwright && playwright install chromium; python tests/smoke.py"""
import pathlib, sys
from playwright.sync_api import sync_playwright

URL = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
FAST = "WVGame.setTestFactor(0.01); document.querySelector('#titleOverlay').classList.remove('show')"

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
        if page.locator('#stage .title:has-text("wins")').count() or page.locator('#encounter.win').count(): break
        ans = page.locator(':is(#stage,#encCard) .answer input:not([disabled])')
        if ans.count():
            q = page.locator(':is(#stage,#encCard) .msg b').filter(has_text='= ?').last.inner_text()
            expr = q.replace('= ?', '').replace('−', '-').strip()
            ans.fill(str(eval(expr))); ans.press('Enter'); continue
        slot = page.locator(':is(#stage,#encCard) button.slot.pick')
        if slot.count(): slot.first.click(); continue
        btn = page.locator(':is(#stage, #encounter:not(.win) #encCard) .actions button:not([disabled]):not(.giveUp):visible')
        if btn.count():
                try: btn.first.click(timeout=1500)
                except Exception: pass
                continue
        page.wait_for_timeout(20)
    print('human game:', page.inner_text('#stage .title'), 'steps', steps)
    log = page.inner_text('#log')
    print('vines climbed:', log.count('climbs the vine'), '| wyrms dodged:', log.count('shook off'), '| duels:', log.count('duels'))
    check_errors(errors)
    # 2b) Iron Wyrm mode: four computer players, then a human answering everything
    for human in (False, True):
        page.goto(URL); page.evaluate(FAST)
        page.check('#ironToggle')
        page.fill('#codeInput', 'IRON-7')
        if not human:
            for _ in range(2): page.click('#addPlayerBtn')
            sels = page.locator('.prow select:nth-of-type(2)')
            for i in range(4): sels.nth(i).select_option('c')
        page.click('#startBtn')
        steps = 0
        S = ':is(#stage,#encCard)'
        while steps < 6000:
            steps += 1
            if page.locator('#stage .title:has-text("wins")').count() or page.locator('#encounter.win').count(): break
            ans = page.locator(S + ' .answer input:not([disabled])')
            if ans.count():
                q = page.locator(S + ' .msg b').filter(has_text='= ?').last.inner_text()
                expr = q.replace('= ?', '').replace('−', '-').replace('²', '**2').strip()
                ans.fill(str(eval(expr))); ans.press('Enter'); continue
            slot = page.locator(S + ' button.slot.pick')
            if slot.count(): slot.first.click(); continue
            btn = page.locator(':is(#stage, #encounter:not(.win) #encCard) .actions button:not([disabled]):not(.giveUp):visible')
            if btn.count():
                try: btn.first.click(timeout=1500)
                except Exception: pass
                continue
            page.wait_for_timeout(10)
        log = page.inner_text('#log')
        print('iron game', 'human' if human else 'computers', '|', page.inner_text('#stage .title')[:40], '| steps', steps,
              '| colonies', log.count('ants moved in'), 'eggs', log.count('laid an egg'), 'hatched', log.count('fortified wyrm ('),
              'tunnels', log.count('left a tunnel'), 'eaten', log.count('ate a hunter'), 'stomps', log.count('stomped'), 'tunnel falls', log.count('fell down a tunnel'))
        check_errors(errors)
        page.evaluate("localStorage.removeItem('wyrms-and-vines.iron')")

    # 3) Unlocks: Player 1 just finished a level 1 game, so level 4 stays locked; a level 3 record opens it
    page.goto(URL)
    lvl4 = page.locator('.prow').first.locator('select').first.locator('option[value="4"]')
    assert lvl4.is_disabled(), 'level 4 should be locked'
    assert not page.locator('.prow').first.locator('select').first.locator('option[value="6"]').is_disabled(), 'adult always open'
    page.evaluate("localStorage.setItem('wyrms-and-vines.played', JSON.stringify({'player 1': 3}))")
    page.goto(URL)
    lvl4 = page.locator('.prow').first.locator('select').first.locator('option[value="4"]')
    adult = page.locator('.prow').first.locator('select').first.locator('option[value="6"]')
    assert not lvl4.is_disabled() and not adult.is_disabled(), 'level 4 and adult open'
    page.click('#titleGo')
    page.check('#unlockAll')
    assert not page.locator('.prow').first.locator('select').first.locator('option[value="6"]').is_disabled()
    print('unlocks OK')
    b.close()
print('OK')
