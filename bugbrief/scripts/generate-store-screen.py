#!/usr/bin/env python3
"""Write a 1280x800 Chrome Web Store screenshot."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "store" / "screens"
W, H = 1280, 800
BG = (238, 242, 255)
CARD = (255, 255, 255)
INK = (15, 23, 42)
MUTED = (100, 116, 139)
ACCENT = (79, 70, 229)
FAIL = (185, 28, 28)
WARN = (180, 83, 9)
PASS = (22, 163, 74)


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(
        ">I", zlib.crc32(tag + data) & 0xFFFFFFFF
    )


def write_png(path: Path, pixels: bytearray, w: int, h: int) -> None:
    raw = bytes(pixels)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def fill(px: bytearray, x0: int, y0: int, x1: int, y1: int, color: tuple[int, int, int]) -> None:
    r, g, b = color
    for y in range(max(0, y0), min(H, y1)):
        row = 1 + y * (1 + W * 3)
        for x in range(max(0, x0), min(W, x1)):
            i = row + x * 3
            px[i : i + 3] = bytes((r, g, b))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    px = bytearray()
    for _y in range(H):
        px.append(0)
        for _x in range(W):
            px.extend(BG)
    fill(px, 360, 80, 920, 720, CARD)
    fill(px, 360, 80, 920, 160, ACCENT)
    fill(px, 400, 200, 540, 280, (254, 226, 226))
    fill(px, 560, 200, 700, 280, (255, 237, 213))
    fill(px, 720, 200, 860, 280, (220, 252, 231))
    fill(px, 400, 310, 880, 400, (248, 250, 252))
    fill(px, 400, 420, 880, 510, (248, 250, 252))
    fill(px, 400, 530, 880, 620, (248, 250, 252))
    fill(px, 400, 640, 880, 690, ACCENT)
    write_png(OUT / "1280x800.png", px, W, H)
    print(f"Wrote {OUT / '1280x800.png'}")


if __name__ == "__main__":
    main()
