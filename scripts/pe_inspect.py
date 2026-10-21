import struct, sys
d = open(sys.argv[1], 'rb').read()
pe = struct.unpack_from('<I', d, 0x3c)[0]
assert d[pe:pe+4] == b'PE\0\0'
nsec = struct.unpack_from('<H', d, pe+6)[0]
optsz = struct.unpack_from('<H', d, pe+20)[0]
opt = pe + 24
magic = struct.unpack_from('<H', d, opt)[0]
ddoff = opt + (112 if magic == 0x20b else 96)
dirs = [struct.unpack_from('<II', d, ddoff + 8*i) for i in range(16)]
print('magic', hex(magic), 'sections', nsec, 'res dir', [hex(x) for x in dirs[2]], 'cert', [hex(x) for x in dirs[4]], 'filesize', hex(len(d)))
secs = []
sh = opt + optsz
for i in range(nsec):
    name, vsz, va, rsz, rptr = struct.unpack_from('<8sIIII', d, sh + 40*i)
    secs.append((name.rstrip(b'\0').decode(), va, vsz, rptr, rsz))
    print(secs[-1][0], hex(va), hex(vsz), hex(rptr), hex(rsz))
def rva2off(rva):
    for n, va, vsz, rp, rs in secs:
        if va <= rva < va + max(vsz, rs): return rva - va + rp
rsrc = rva2off(dirs[2][0])
TYPES = {3: 'ICON', 14: 'GROUP_ICON', 16: 'VERSION', 24: 'MANIFEST'}
def walk(off, depth, path):
    nn, ni = struct.unpack_from('<HH', d, off + 12)
    for k in range(nn + ni):
        nid, ptr = struct.unpack_from('<II', d, off + 16 + 8*k)
        key = nid if not nid & 0x80000000 else 'name'
        if ptr & 0x80000000: walk(rsrc + (ptr & 0x7fffffff), depth+1, path + [key])
        else:
            rva, sz, cp, _ = struct.unpack_from('<IIII', d, rsrc + ptr)
            print('  ', [TYPES.get(path[0], path[0])] + path[1:] + [key], 'rva', hex(rva), 'size', sz)
walk(rsrc, 0, [])
