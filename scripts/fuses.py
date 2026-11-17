"""Flip Electron fuses in an executable (fuse wire v1).
usage: fuses.py <exe> <fuse-string>   e.g. 000001011
Order: RunAsNode, EnableCookieEncryption, EnableNodeOptionsEnvironmentVariable, EnableNodeCliInspectArguments,
EnableEmbeddedAsarIntegrityValidation, OnlyLoadAppFromAsar, LoadBrowserProcessSpecificV8Snapshot,
GrantFileProtocolExtraPrivileges, WasmTrapHandlers."""
import sys
SENTINEL = b'dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX'
exe, want = sys.argv[1], sys.argv[2].encode()
b = bytearray(open(exe, 'rb').read())
i = b.find(SENTINEL)
assert i > 0 and b.count(SENTINEL) == 1, 'fuse sentinel not found exactly once'
ver, n = b[i + 32], b[i + 33]
assert ver == 1 and n == len(want), f'unexpected fuse wire v{ver} with {n} fuses'
old = bytes(b[i + 34:i + 34 + n])
assert all(c in b'01' for c in old), old
b[i + 34:i + 34 + n] = want
open(exe, 'wb').write(b)
print(f'fuses {old.decode()} -> {want.decode()}')
