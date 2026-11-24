import pathlib, os, tempfile
OUT = os.environ.get('WTP_TEST_OUT', os.path.join(tempfile.gettempdir(), 'wtp-tests'))
os.makedirs(OUT, exist_ok=True)
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=__import__('os').environ.get('CHROMIUM_PATH') or None)
        pg = await b.new_page(viewport={'width': 1500, 'height': 950})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.add_init_script("localStorage.clear()")
        await pg.goto(pathlib.Path(__file__).resolve().parent.parent.joinpath('dist', 'index.html').as_uri())
        await pg.wait_for_timeout(1500)
        nav = lambda t: pg.evaluate(f"[...document.querySelectorAll('.nav')].find(n=>n.textContent.trim().startsWith('{t}')).click()")
        await nav('Sedimentation'); await pg.wait_for_timeout(500)
        kpi = lambda: pg.evaluate("[...document.querySelectorAll('.kpi')].map(k=>k.innerText.replace(/\\n/g,' ')).slice(0,3).join(' | ')")
        print('before:', await kpi())
        inp = pg.locator('.field', has_text='Surface overflow rate').locator('input')
        await inp.fill('40'); await pg.wait_for_timeout(900)
        print('after SOR=40:', await kpi())
        await pg.click('body'); await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(700)
        print('after undo:', await kpi())
        await pg.keyboard.press('Control+y'); await pg.wait_for_timeout(700)
        print('after redo:', await kpi())
        print('dirty badge visible:', await pg.evaluate("getComputedStyle(document.querySelector('.dirty')).display"))
        # tabs
        for t in ['Charts', 'Checks', 'Calculation sheet']:
            await pg.evaluate(f"[...document.querySelectorAll('.tabs button')].find(b=>b.textContent.startsWith('{t}')).click()"); await pg.wait_for_timeout(400)
            print('tab', t, 'ok; katex nodes:', await pg.evaluate("document.querySelectorAll('.katex').length"), 'svg charts:', await pg.evaluate("document.querySelectorAll('.chart svg').length"))
        # load samples via menu
        for i, s in enumerate(['Dry-zone', 'Rural']):
            await pg.click('text=File'); await pg.wait_for_timeout(200)
            await pg.click(f".menu .mi:has-text('{s}')"); await pg.wait_for_timeout(400)
            # confirm discard modal
            if await pg.locator('.modal').count():
                await pg.click(".modal button:has-text(\"Don't save\")"); await pg.wait_for_timeout(900)
            print('loaded', s, '->', await pg.evaluate("document.querySelector('.dh-q').innerText.replace(/\\n/g,' ')"), '| train:', (await pg.evaluate("[...document.querySelectorAll('.pfd2 .pf-u > text')].map(t=>t.textContent).filter(Boolean).join(' / ')"))[:260])
        # visit every page for render errors
        names = await pg.evaluate("[...document.querySelectorAll('.nav')].map(n=>n.textContent.trim()).filter(Boolean)")
        for n in names:
            await pg.evaluate(f"[...document.querySelectorAll('.nav')].find(x=>x.textContent.trim()==={json.dumps(n)}).click()"); await pg.wait_for_timeout(250)
            bad = await pg.evaluate("[...document.querySelectorAll('.note.fail')].map(n=>n.innerText).filter(t=>t.includes('could not be rendered')||t.includes('Calculation error'))")
            if bad: print('PAGE ERROR', n, bad)
        await pg.evaluate("[...document.querySelectorAll('.nav')].find(x=>x.textContent.includes('Slow')||x.textContent.includes('Filtration')).click()"); await pg.wait_for_timeout(500)
        await pg.screenshot(path=os.path.join(OUT, 'rural_filtration.png'))
        print('ERRORS:', errs[:10])
        await b.close()
asyncio.run(main())
