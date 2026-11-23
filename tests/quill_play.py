"""Plays vine and wyrm puzzles with the quill: picks or writes each answer by drawing the digits
on the quill's canvas with the mouse. Checks Trace (pick, then trace) and Free (just write) modes.
Run: python tests/quill_play.py"""
import pathlib, sys
from playwright.sync_api import sync_playwright

URL = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
S = ':is(#stage, #encounter:not(.win) #encCard)'

def draw_digit(page, cell, ch):
    canvas = cell.locator('canvas')
    box = canvas.bounding_box()
    strokes = page.evaluate(f"Glyphs.DIGITS['{ch}'].strokes")
    for st in strokes:
        pts = [(box['x'] + x / 100 * box['width'], box['y'] + y / 140 * box['height']) for x, y in st]
        page.mouse.move(*pts[0]); page.mouse.down()
        for p in pts[1:]: page.mouse.move(*p, steps=1)
        page.mouse.up()

def play(level, want=3):
    page.goto(URL)
    page.evaluate(f"localStorage.setItem('wyrms-and-vines.quillLevel', '{level}')")
    page.goto(URL)
    page.evaluate("WVGame.setTestFactor(0.02); document.querySelector('#titleOverlay').classList.remove('show')")
    if page.is_checked('#ironToggle'): page.uncheck('#ironToggle')
    page.uncheck('#forestToggle')
    page.locator('.prow').first.locator('select.inputSel').select_option('quill')
    # record every message the puzzle shows (they flash by quickly at test speed)
    page.evaluate("""() => { window.__msgs = []; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1 && n.textContent) window.__msgs.push(n.textContent); }))).observe(document.querySelector('#encCard'), {childList: true, subtree: true}); }""")
    page.fill('#codeInput', 'FERN-42'); page.click('#startBtn')
    done = right = 0
    for _ in range(6000):
        if done >= want or page.locator('#encounter.win').count(): break
        if page.locator('#quillLayer.on').count():
            prompt = page.inner_text('#qCard .qprompt')
            answer = str(eval(prompt.replace('= ?', '').replace('−', '-').replace('²', '**2')))
            if page.locator('#qCard .qstep .qpad').count():          # Trace / Remember: pick the number first
                for d in answer: page.locator('#qCard .qstep .qpad button', has_text=d).first.click()
                page.locator('#qCard .qstep .qpad button.go').click()
                page.wait_for_timeout(300)
            cells = page.locator('#qCard .qcell')
            for i, d in enumerate(answer): draw_digit(page, cells.nth(i), d)
            page.locator('#qCard .qdone').click()
            page.wait_for_function("!document.querySelector('#quillLayer').classList.contains('on')", timeout=8000)
            page.wait_for_timeout(150)
            msgs = page.evaluate('window.__msgs')
            # accepted: the game said "Yes, N!", or the vine/grip moved on to N
            if any(('Yes, ' + answer + '!') in m or m.startswith(f'Vine: {answer} of') or m.startswith(f'Grip: {answer}') for m in msgs): right += 1
            page.evaluate('window.__msgs = []')
            done += 1
            continue
        slot = page.locator(S + ' button.slot.pick')
        if slot.count(): slot.first.click(); continue
        btn = page.locator(S + ' .actions button:not([disabled]):not(.giveUp):visible')
        if btn.count():
            try: btn.first.click(timeout=1500)
            except Exception: pass
            continue
        page.wait_for_timeout(10)
    log = page.inner_text('#log')
    return done, right, log

with sync_playwright() as pw:
    b = pw.chromium.launch(); page = b.new_page(viewport={'width': 1366, 'height': 1000})
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    ok = True
    for level, name in ((1, 'Trace'), (3, 'Free')):
        done, right, log = play(level)
        print(f'{name}: wrote {done} answers with the quill, {right} accepted as right')
        if done < 3 or right < done: ok = False
    if errors: print('JS errors:', errors); ok = False
    b.close()
print('OK' if ok else 'FAILED'); sys.exit(0 if ok else 1)
