# Validates exported drawings: every DXF opens in ezdxf with a clean audit and follows the NWSDB CAD set-up of the
# exporter (AutoCAD 2007 DXF, millimetres, layers with line weights, known text styles); every SVG is well-formed XML.
#   python3 test/validate_dxf.py <dir>        (needs: pip install ezdxf)
import sys, glob, xml.dom.minidom
import ezdxf

STYLES = {'Standard', 'SANS', 'SANS BOLD', 'NIRMALA'}
WEIGHTED = {'wall': 25, 'OL': 18, 'DIM': 15, 'TEXT': 25, 'pipe': 50, 'CL': 15, 'HID': 25}


def check(fn):
    doc = ezdxf.readfile(fn)
    audit = doc.audit()
    assert not audit.errors, f'audit errors: {[e.message for e in audit.errors[:3]]}'
    assert doc.dxfversion >= 'AC1021', f'DXF version {doc.dxfversion}'
    assert doc.header.get('$INSUNITS') == 4, 'model space must be in millimetres ($INSUNITS 4)'
    layers = {l.dxf.name: l for l in doc.layers}
    for name, lw in WEIGHTED.items():
        assert name in layers and layers[name].dxf.get('lineweight') == lw, f'layer {name} line weight'
    assert layers['NPRINT'].dxf.get('plot', 1) == 0, 'NPRINT must not plot'
    assert layers['CL'].dxf.linetype == 'CENTER2' and layers['HID'].dxf.linetype == 'HIDDEN2', 'linetypes'
    msp = doc.modelspace()
    n = 0
    for e in msp:
        n += 1
        assert e.dxf.layer in layers, f'layer {e.dxf.layer} not in table'
        if e.dxftype() == 'TEXT':
            assert e.dxf.style in STYLES, f'text style {e.dxf.style}'
            assert ' m' not in e.dxf.text or e.dxf.layer != 'DIM' or 'm³' in e.dxf.text, f'dimension in metres: {e.dxf.text!r}'
    assert n > 0, 'empty drawing'
    return n


bad = 0
for fn in sorted(glob.glob(sys.argv[1] + '/*.dxf')):
    try:
        check(fn)
    except Exception as ex:
        bad += 1
        print('FAIL', fn, ex)
for fn in sorted(glob.glob(sys.argv[1] + '/*.svg')):
    try:
        xml.dom.minidom.parse(fn)
    except Exception as ex:
        bad += 1
        print('SVG FAIL', fn, ex)
print('checked', len(glob.glob(sys.argv[1] + '/*.dxf')), 'dxf +', len(glob.glob(sys.argv[1] + '/*.svg')), 'svg; failures:', bad)
sys.exit(1 if bad else 0)
