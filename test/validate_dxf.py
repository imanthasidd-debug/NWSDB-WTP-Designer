import sys, glob, xml.dom.minidom
KNOWN = {'LINE','POLYLINE','VERTEX','SEQEND','CIRCLE','TEXT'}
def check(fn):
    lines = open(fn, newline='').read().split('\r\n')
    if lines[-1] == '': lines = lines[:-1]
    assert len(lines) % 2 == 0, 'odd number of lines'
    pairs = [(int(lines[i].strip()), lines[i+1]) for i in range(0, len(lines), 2)]
    assert pairs[-1] == (0, 'EOF'), 'missing EOF'
    layers = set(); used = set(); depth = 0; ents = {}; in_poly = False; sec = None
    for i,(c,v) in enumerate(pairs):
        if c == 0 and v == 'SECTION': depth += 1; sec = pairs[i+1][1]
        elif c == 0 and v == 'ENDSEC': depth -= 1; sec = None
        elif c == 0 and sec == 'ENTITIES':
            assert v in KNOWN, f'unknown entity {v}'
            ents[v] = ents.get(v, 0) + 1
            if v == 'POLYLINE': assert not in_poly; in_poly = True
            if v == 'SEQEND': assert in_poly; in_poly = False
            if v == 'VERTEX': assert in_poly
        if c == 2 and sec == 'TABLES' and pairs[i-1] == (0, 'LAYER'): layers.add(v)
        if c == 8: used.add(v)
        if c in (10,20,30,11,21,31,40,50): float(v)
        if c in (62,66,70,72,73): int(v)
        if c == 1: assert all(32 <= ord(ch) < 127 for ch in v), f'non-ascii text {v!r}'
    assert depth == 0 and not in_poly
    missing = used - layers
    assert not missing, f'layers not in table: {missing}'
    return ents
bad = 0
for fn in sorted(glob.glob(sys.argv[1] + '/*.dxf')):
    try: e = check(fn)
    except Exception as ex: bad += 1; print('FAIL', fn, ex)
for fn in sorted(glob.glob(sys.argv[1] + '/*.svg')):
    try: xml.dom.minidom.parse(fn)
    except Exception as ex: bad += 1; print('SVG FAIL', fn, ex)
print('checked', len(glob.glob(sys.argv[1] + '/*.dxf')), 'dxf +', len(glob.glob(sys.argv[1] + '/*.svg')), 'svg; failures:', bad)
