"""Builds the fictional sample notices as phone-style photos and measures
where each value sits on the image, so the app can highlight them offline.

Run:  python3 scripts/make-samples.py
Writes: client/public/samples/<key>.jpg, test-notices/notice-*.jpg,
        server/sample-boxes.json  (boxes as [ymin, xmin, ymax, xmax], 0-1000)
Needs:  pip install playwright && playwright install chromium
"""
import json, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 1000, 1250

CSS = f"""
body{{margin:0}}
.table{{width:{W}px;height:{H}px;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 30% 20%,#8a7560,#4e4034)}}
.page{{width:700px;padding:52px 60px;background:#fbfaf6;color:#151515;font-family:Georgia,serif;
  font-size:16px;line-height:1.55;box-shadow:0 18px 40px rgba(0,0,0,.45)}}
.hdr{{border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:20px}}
.co{{font-size:22px;font-weight:bold}} .sm{{font-size:12px;color:#444}}
h2{{text-align:center;font-size:19px;letter-spacing:1px;margin:20px 0}}
table{{border-collapse:collapse;margin:10px 0}} td{{padding:3px 18px 3px 0}}
.stamp{{margin-top:26px;font-size:10.5px;color:#a00;border:1px dashed #a00;padding:6px;text-align:center;font-family:Arial}}
"""
STAMP = '<div class="stamp">FICTIONAL SAMPLE NOTICE FOR SOFTWARE TESTING. NOT A REAL DOCUMENT. NOT LEGAL ADVICE.</div>'

def rent_notice(date, addr, cur, new, eff, extra):
    return f"""<div class="hdr"><div class="co"><span data-f="landlord_or_company">SAMPLE STREET HOLDINGS LLC</span></div>
<div class="sm">100 Sample Street, Suite 1 · Newark, NJ 07102 · (973) 555-0142</div></div>
<p><span data-f="notice_date">{date}</span></p><p>Resident<br><span data-f="unit_address">{addr}<br>Newark, NJ 07104</span></p>
<h2>NOTICE OF RENT INCREASE</h2><p>Dear Resident,</p>
<p>This letter is to inform you that the monthly rent for your apartment will be adjusted as shown below.</p>
<table><tr><td>Current monthly rent:</td><td><b data-f="current_rent">${cur}</b></td></tr>
<tr><td>New monthly rent:</td><td><b data-f="new_rent">${new}</b></td></tr>
<tr><td>Effective date:</td><td><b data-f="effective_date">{eff}</b></td></tr></table>
<p>{extra}</p><p>Please contact the management office with any questions.</p>
<p>Sincerely,<br><br>Property Management<br>Sample Street Holdings LLC</p>{STAMP}"""

COURT = f"""<div class="hdr" style="text-align:center"><div class="co">SAMPLE COUNTY COURT (FICTIONAL)</div>
<div class="sm">LANDLORD / TENANT DIVISION · NOT A REAL COURT · FOR SOFTWARE TESTING</div></div>
<p><b data-f="landlord_or_company">Sample Street Holdings LLC</b>, Plaintiff,<br>v.<br>
Resident, <span data-f="unit_address">45 Example Place, Apt 2B, Newark, NJ 07104</span>, Defendant.</p>
<p>Docket No. SAMPLE-0000</p>
<h2><span data-f="court_mention">SUMMONS: LANDLORD/TENANT COMPLAINT</span></h2>
<p>Date issued: <span data-f="notice_date">October 8, 2026</span></p>
<p>Your landlord has filed a complaint asking that you be evicted. A hearing is scheduled for
<b data-f="deadline_to_respond">October 22, 2026</b>. If you do not appear, a judgment may be entered against you.</p>
<p>If you cannot afford a lawyer, you may be eligible for free legal assistance.</p>{STAMP}"""

SAMPLES = {
    # key: (filename in test-notices, rotation in degrees, html)
    'legal':   ('notice-1-legal', -1.6, rent_notice('October 1, 2026', '45 Example Place, Apt 4B', '1,500.00', '1,545.00', 'December 1, 2026',
                'The adjustment reflects increased operating costs.')),
    'illegal': ('notice-2-illegal', 1.4, rent_notice('October 1, 2026', '45 Example Place, Apt 4B', '1,500.00', '1,800.00', 'November 1, 2026',
                'Payment of the new amount is required beginning on the effective date above.')),
    'court':   ('notice-3-court', -1.1, COURT),
    'yellow':  ('notice-4-yellow-4.5pct', -2.2, rent_notice('October 1, 2026', '45 Example Place, Apt 3C', '1,600.00', '1,672.00', 'December 1, 2026',
                'This building contains six (6) residential units. The increase reflects rising operating costs.')),
    'short':   ('notice-5-short-notice', 1.8, rent_notice('October 10, 2026', '45 Example Place, Apt 1A', '1,400.00', '1,442.00', 'October 24, 2026',
                'Payment of the new amount is required beginning on the effective date above.')),
}

def main():
    (ROOT / 'client/public/samples').mkdir(parents=True, exist_ok=True)
    (ROOT / 'test-notices').mkdir(exist_ok=True)
    boxes = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': W, 'height': H})
        for key, (fname, deg, html) in SAMPLES.items():
            page.set_content(f'<style>{CSS}</style><div class="table"><div class="page" style="transform:rotate({deg}deg)">{html}</div></div>')
            # Axis-aligned box of each value on the final (rotated) image, scaled 0-1000.
            found = page.evaluate("""() => Object.fromEntries([...document.querySelectorAll('[data-f]')].map(el => {
                const r = el.getBoundingClientRect(), pad = 4;
                return [el.dataset.f, [r.top - pad, r.left - pad, r.bottom + pad, r.right + pad]];
            }))""")
            boxes[key] = {f: [round(b[0] / H * 1000), round(b[1] / W * 1000), round(b[2] / H * 1000), round(b[3] / W * 1000)]
                          for f, b in found.items()}
            for out in (ROOT / f'client/public/samples/{key}.jpg', ROOT / f'test-notices/{fname}.jpg'):
                page.screenshot(path=str(out), type='jpeg', quality=82)
        browser.close()
    (ROOT / 'server/sample-boxes.json').write_text(json.dumps(boxes, indent=2) + '\n')
    print('wrote', len(boxes), 'samples')

if __name__ == '__main__':
    main()
