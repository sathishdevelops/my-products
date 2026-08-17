#!/usr/bin/env python3
"""Write simple teal PNG icons for the Chrome extension."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "icons"
TEAL = (15, 118, 110)
WHITE = (255, 255, 255)


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(
        ">I", zlib.crc32(tag + data) & 0xFFFFFFFF
    )


def write_png(path: Path, size: int) -> None:
    pixels = bytearray()
    for y in range(size):
        pixels.append(0)
        for x in range(size):
            # rounded-ish square: inset border
            inset = max(1, size // 16)
            if x < inset or y < inset or x >= size - inset or y >= size - inset:
                r, g, b = TEAL
            else:
                # white "P" bar on the left third, with a top and mid arm
                t = size / 6
                left = size * 0.32
                right = size * 0.68
                mid_y = size * 0.48
                on = False
                if left <= x <= left + t and t * 1.2 <= y <= size - t * 1.2:
                    on = True
                if left <= x <= right and t * 1.2 <= y <= t * 1.2 + t:
                    on = True
                if left <= x <= right and mid_y <= y <= mid_y + t * 0.85:
                    on = True
                if right - t <= x <= right and t * 1.2 <= y <= mid_y + t * 0.85:
                    on = True
                r, g, b = WHITE if on else TEAL
            pixels.extend((r, g, b))
    raw = bytes(pixels)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for size in (16, 48, 128):
        write_png(OUT / f"{size}.png", size)
    print(f"Wrote icons in {OUT}")


if __name__ == "__main__":
    main()
