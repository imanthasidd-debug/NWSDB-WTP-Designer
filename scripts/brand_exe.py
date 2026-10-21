"""Brand the Electron Windows executable in place (no wine / rcedit needed).

* replaces the application icon images (RT_ICON / RT_GROUP_ICON 1) with the PNG images of assets/icon.ico
* rewrites the version resource (FileDescription, ProductName, CompanyName, versions ...)
* recomputes the PE checksum

Every replacement is written inside the existing resource slot, so the resource tree, section table and
relocations are untouched.  Usage: python3 brand_exe.py <exe> <icon.ico> <version> [product] [company]
"""
import struct
import sys


def load_pe(d):
    pe = struct.unpack_from('<I', d, 0x3C)[0]
    assert d[pe:pe + 4] == b'PE\0\0', 'not a PE file'
    nsec = struct.unpack_from('<H', d, pe + 6)[0]
    optsz = struct.unpack_from('<H', d, pe + 20)[0]
    opt = pe + 24
    magic = struct.unpack_from('<H', d, opt)[0]
    dd = opt + (112 if magic == 0x20B else 96)
    secs = []
    for i in range(nsec):
        _n, vsz, va, rsz, rptr = struct.unpack_from('<8sIIII', d, opt + optsz + 40 * i)
        secs.append((va, max(vsz, rsz), rptr))
    return opt, dd, secs


def rva2off(secs, rva):
    for va, sz, rp in secs:
        if va <= rva < va + sz:
            return rva - va + rp
    raise ValueError('rva outside sections')


def resources(d, secs, dd):
    res_rva = struct.unpack_from('<I', d, dd + 8 * 2)[0]
    base = rva2off(secs, res_rva)
    out = {}

    def walk(off, path):
        nn, ni = struct.unpack_from('<HH', d, off + 12)
        for k in range(nn + ni):
            nid, ptr = struct.unpack_from('<II', d, off + 16 + 8 * k)
            key = None if nid & 0x80000000 else nid
            if ptr & 0x80000000:
                walk(base + (ptr & 0x7FFFFFFF), path + [key])
            else:
                rva, size = struct.unpack_from('<II', d, base + ptr)
                out[tuple(path + [key])] = {'entry': base + ptr, 'off': rva2off(secs, rva), 'size': size}

    walk(base, [])
    return out


def slot(res, typ, rid):
    for k, v in res.items():
        if k[0] == typ and k[1] == rid:
            return v
    raise KeyError(f'resource {typ}/{rid} not found')


def put(d, s, data):
    if len(data) > s['size']:
        raise ValueError(f'replacement {len(data)} B larger than slot {s["size"]} B')
    d[s['off']:s['off'] + s['size']] = data + b'\0' * (s['size'] - len(data))
    struct.pack_into('<I', d, s['entry'] + 4, len(data))


def read_ico(path):
    b = open(path, 'rb').read()
    _r, _t, n = struct.unpack_from('<HHH', b, 0)
    imgs = {}
    for i in range(n):
        w, h, _c, _r2, _p, bpp, sz, off = struct.unpack_from('<BBBBHHII', b, 6 + 16 * i)
        imgs[w or 256] = (bpp, b[off:off + sz])
    return imgs


def vs_node(key, value=b'', vtype=1, children=(), value_len=None):
    k = (key + '\0').encode('utf-16le')
    hdr_len = 6 + len(k)
    pad1 = (4 - hdr_len % 4) % 4
    body = k + b'\0' * pad1 + value
    for ch in children:
        cur = 6 + len(body)
        body += b'\0' * ((4 - cur % 4) % 4) + ch
    vl = value_len if value_len is not None else len(value)
    return struct.pack('<HHH', 6 + len(body), vl, vtype) + body


def vs_string(key, val):
    v = (val + '\0').encode('utf-16le')
    return vs_node(key, v, 1, value_len=len(v) // 2)


def version_block(old, ver, product, company, exe_name):
    parts = [int(x) for x in (ver.split('.') + ['0', '0', '0'])[:4]]
    ms, ls = (parts[0] << 16) | parts[1], (parts[2] << 16) | parts[3]
    i = old.find(struct.pack('<I', 0xFEEF04BD))
    fixed = bytearray(old[i:i + 52]) if i >= 0 else bytearray(struct.pack('<13I', 0xFEEF04BD, 0x10000, 0, 0, 0, 0, 0x3F, 0, 0x40004, 1, 0, 0, 0))
    struct.pack_into('<IIII', fixed, 8, ms, ls, ms, ls)
    strings = [('CompanyName', company), ('FileDescription', product), ('FileVersion', ver), ('InternalName', 'WTPDesigner'),
               ('LegalCopyright', f'(C) {company}'), ('OriginalFilename', exe_name), ('ProductName', product), ('ProductVersion', ver)]
    table = vs_node('040904b0', b'', 1, [vs_string(k, v) for k, v in strings])
    sfi = vs_node('StringFileInfo', b'', 1, [table])
    var = vs_node('Translation', struct.pack('<HH', 0x0409, 0x04B0), 0)
    vfi = vs_node('VarFileInfo', b'', 1, [var])
    return vs_node('VS_VERSION_INFO', bytes(fixed), 0, [sfi, vfi])


def pe_checksum(d, opt):
    csum_off = opt + 64
    total = 0
    n = len(d)
    padded = bytes(d) + (b'\0' if n % 2 else b'')
    for (w,) in struct.iter_unpack('<H', padded):
        total += w
    total -= struct.unpack_from('<H', d, csum_off)[0] + struct.unpack_from('<H', d, csum_off + 2)[0]
    while total >> 16:
        total = (total & 0xFFFF) + (total >> 16)
    return (total + n) & 0xFFFFFFFF


def main():
    exe, ico, ver = sys.argv[1:4]
    product = sys.argv[4] if len(sys.argv) > 4 else 'NWSDB WTP Designer'
    company = sys.argv[5] if len(sys.argv) > 5 else 'National Water Supply and Drainage Board'
    d = bytearray(open(exe, 'rb').read())
    opt, dd, secs = load_pe(d)
    res = resources(d, secs, dd)
    imgs = read_ico(ico)

    # --- icon group 1 (the application icon)
    grp = slot(res, 14, 1)
    g = bytearray(d[grp['off']:grp['off'] + grp['size']])
    count = struct.unpack_from('<H', g, 4)[0]
    for i in range(count):
        o = 6 + 14 * i
        w, _h, _c, _r, _planes, _bpp, _sz, nid = struct.unpack_from('<BBBBHHIH', g, o)
        size = w or 256
        best = min(imgs, key=lambda s: (abs(s - size), -s))
        bpp, data = imgs[best]
        s = slot(res, 3, nid)
        if len(data) > s['size']:
            print(f'  icon {size}px: new image too large for slot, kept original')
            continue
        put(d, s, data)
        wb = 0 if best >= 256 else best
        struct.pack_into('<BBBBHHIH', g, o, wb, wb, 0, 0, 1, bpp, len(data), nid)
        print(f'  icon {size}px <- {best}px PNG ({len(data)} B)')
    d[grp['off']:grp['off'] + len(g)] = g

    # --- version resource
    vs = slot(res, 16, 1)
    old = bytes(d[vs['off']:vs['off'] + vs['size']])
    exe_name = exe.replace('\\', '/').split('/')[-1]
    blk = version_block(old, ver, product, company, exe_name)
    if len(blk) > vs['size']:
        company = 'NWSDB Sri Lanka'
        blk = version_block(old, ver, product, company, exe_name)
    put(d, vs, blk)
    print(f'  version resource {len(blk)}/{vs["size"]} B: {product} {ver} ({company})')

    struct.pack_into('<I', d, opt + 64, pe_checksum(d, opt))
    open(exe, 'wb').write(d)
    print('  checksum updated')


if __name__ == '__main__':
    main()
