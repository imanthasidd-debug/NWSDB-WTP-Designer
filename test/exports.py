import asyncio, zipfile, json, openpyxl
from playwright.async_api import async_playwright
OUT = '/tmp/claude-0/-home-claude/ab443502-a195-5238-a92b-65d538795bc7/scratchpad/exports'
import os; os.makedirs(OUT, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(accept_downloads=True, viewport={'width': 1500, 'height': 950})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("localStorage.clear()")
        await pg.goto('file:///home/claude/wtp-designer/dist/index.html'); await pg.wait_for_timeout(1500)
        async def dl(action):
            async with pg.expect_download() as d:
                await action()
            dd = await d.value
            path = os.path.join(OUT, dd.suggested_filename); await dd.save_as(path); return path
        x = await dl(lambda: pg.keyboard.press('Control+e'))
        wb = openpyxl.load_workbook(x)
        print('xlsx sheets:', [(ws.title, ws.max_row) for ws in wb.worksheets])
        print('  summary B6:', wb['Summary']['B6'].value, '| calc rows:', wb['Calculations'].max_row)
        s = await dl(lambda: pg.keyboard.press('Control+s'))
        proj = json.load(open(s)); print('saved project:', os.path.basename(s), 'keys', list(proj['inputs'].keys())[:6], '...')
        await pg.evaluate("[...document.querySelectorAll('.nav')].find(n=>n.textContent.includes('Design report')).click()"); await pg.wait_for_timeout(1200)
        z = await dl(lambda: pg.click("button:has-text('Drawings (ZIP)')"))
        names = zipfile.ZipFile(z).namelist(); print('drawing zip:', len(names), 'files e.g.', names[:4])
        # PNG export of a drawing
        await pg.evaluate("[...document.querySelectorAll('.nav')].find(n=>n.textContent.startsWith('Sedimentation')).click()"); await pg.wait_for_timeout(800)
        png = await dl(lambda: pg.locator('.card', has_text='Sedimentation tanks – plan').locator("button:has-text('PNG')").click())
        print('png bytes:', os.path.getsize(png))
        # re-open saved project through the file input fallback
        await pg.evaluate("document.querySelector('.titlebar .tb-btn').click()"); await pg.wait_for_timeout(200)
        async with pg.expect_file_chooser() as fc:
            await pg.click(".menu .mi:has-text('Open')")
            if await pg.locator('.modal').count(): await pg.click(".modal button:has-text(\"Don't save\")")
        chooser = await fc.value; await chooser.set_files(s); await pg.wait_for_timeout(1200)
        print('reopened, status:', await pg.evaluate("document.querySelector('.statusbar').innerText.replace(/\\n/g,' ')"))
        print('ERRORS:', errs)
        await b.close()
asyncio.run(main())
