import pathlib
import sys, asyncio, json
from playwright.async_api import async_playwright
OUT = sys.argv[1]
pages = sys.argv[2].split(',') if len(sys.argv) > 2 else ['dashboard']
theme = sys.argv[3] if len(sys.argv) > 3 else 'light'
tab = sys.argv[4] if len(sys.argv) > 4 else None
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1600, 'height': 1000}, device_scale_factor=1)
        errs = []
        pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
        await pg.add_init_script(f"localStorage.setItem('wtp.settings', JSON.stringify({{theme:'{theme}'}})); localStorage.removeItem('wtp.autosave');")
        await pg.goto(pathlib.Path(__file__).resolve().parent.parent.joinpath('dist', 'index.html').as_uri())
        await pg.wait_for_timeout(1600)
        for name in pages:
            await pg.evaluate(f"document.querySelectorAll('.nav').forEach(n => {{ if (n.title === n.title && n.textContent.trim().toLowerCase().startsWith('{name.lower()}')) n.click(); }})")
            await pg.wait_for_timeout(700)
            if tab:
                await pg.evaluate(f"[...document.querySelectorAll('.tabs button')].find(b => b.textContent.toLowerCase().startsWith('{tab}'))?.click()")
                await pg.wait_for_timeout(600)
            fn = f"{OUT}/{name.replace(' ','_')}_{theme}{'_'+tab if tab else ''}.png"
            await pg.screenshot(path=fn, full_page=False)
            print('shot', fn)
        print('ERRORS:', json.dumps(errs, indent=1)[:4000])
        await b.close()
asyncio.run(main())
