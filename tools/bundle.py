"""Builds a single offline HTML file with all styles, scripts and images inlined.
Run: python tools/bundle.py [output.html]   (default: wyrms-and-vines.html next to the repo)"""
import base64, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / 'wyrms-and-vines.html'
html = (root / 'index.html').read_text()
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: '<style>\n' + (root / m.group(1)).read_text() + '\n</style>', html)
html = re.sub(r'<script src="([^"]+)"></script>', lambda m: '<script>\n' + (root / m.group(1)).read_text() + '\n</script>', html)
# images referenced as 'img/...png' (e.g. Oli's wyrm) become data URIs
for img in (root / 'img').glob('*.png'):
    uri = 'data:image/png;base64,' + base64.b64encode(img.read_bytes()).decode()
    html = html.replace(f"'img/{img.name}'", f"'{uri}'")
assert 'src="js/' not in html and 'href="css/' not in html
out.write_text(html)
print('wrote', out, f'({out.stat().st_size // 1024} KB)')
