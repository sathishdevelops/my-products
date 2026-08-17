#!/usr/bin/env python3
from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "icons"


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(
        ">I", zlib.crc32(tag + data) & 0xFFFFFFFF
    )


def write_png(path: Path, rgba: list[tuple[int, int, int, int]], size: int) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            r, g, b, a = rgba[y * size + x]
            raw.extend((r, g, b, a))
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def paw(size: int, color: tuple[int, int, int, int]) -> list[tuple[int, int, int, int]]:
    scale = size / 16.0
    px = [[0] * size for _ in range(size)]

    def dot(cx: float, cy: float, r: float) -> None:
        for y in range(size):
            for x in range(size):
                if (x + 0.5 - cx * scale) ** 2 + (y + 0.5 - cy * scale) ** 2 <= (r * scale) ** 2:
                    px[y][x] = 1

    dot(8, 10.2, 3.4)
    dot(4.2, 5.2, 1.7)
    dot(7.0, 3.8, 1.6)
    dot(10.6, 3.8, 1.6)
    dot(13.0, 5.4, 1.7)
    out: list[tuple[int, int, int, int]] = []
    for y in range(size):
        for x in range(size):
            out.append(color if px[y][x] else (0, 0, 0, 0))
    return out


def icon_1024() -> list[tuple[int, int, int, int]]:
    size = 1024
    bg = (15, 118, 110, 255)
    paw_px = paw(720, (255, 253, 248, 255))
    out = [bg] * (size * size)
    off = (size - 720) // 2
    for y in range(720):
        for x in range(720):
            r, g, b, a = paw_px[y * 720 + x]
            if a:
                out[(y + off) * size + (x + off)] = (r, g, b, a)
    return out


def main() -> None:
    OUT.mkdir(exist_ok=True)
    write_png(OUT / "trayTemplate.png", paw(16, (0, 0, 0, 255)), 16)
    write_png(OUT / "icon.png", icon_1024(), 1024)
    print(f"Wrote icons in {OUT}")


if __name__ == "__main__":
    main()
