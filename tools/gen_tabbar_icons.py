# -*- coding: utf-8 -*-
"""
生成物时小程序 tabBar 图标（81x81 PNG，线性风格，抗锯齿）
仅用 Python 标准库，不依赖第三方包
"""
import os
import math
import zlib
import struct

SIZE = 81
SS = 4  # 超采样倍数


def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def seg(px, py, x1, y1, x2, y2, w):
    """点到线段距离是否在描边宽度内"""
    dx = x2 - x1
    dy = y2 - y1
    l2 = dx * dx + dy * dy
    if l2 == 0:
        return False
    t = ((px - x1) * dx + (py - y1) * dy) / l2
    t = 0.0 if t < 0 else (1.0 if t > 1 else t)
    cx = x1 + t * dx
    cy = y1 + t * dy
    return (px - cx) ** 2 + (py - cy) ** 2 <= (w / 2.0) ** 2


def ring(px, py, cx, cy, r, w):
    d = math.hypot(px - cx, py - cy)
    return abs(d - r) <= w / 2.0


def arc(px, py, cx, cy, r, w, a1, a2):
    """角度制，y 轴向下；判断点是否落在圆弧上"""
    dx = px - cx
    dy = py - cy
    d = math.hypot(dx, dy)
    if abs(d - r) > w / 2.0:
        return False
    ang = math.degrees(math.atan2(dy, dx)) % 360
    return a1 <= ang <= a2


# ---------- 图标形状定义（画布 81x81） ----------
SHAPES = {
    # 房子：三角屋顶 + 墙体
    'home': [
        ('seg', 40.5, 15, 12, 40, 5.5),
        ('seg', 40.5, 15, 69, 40, 5.5),
        ('seg', 21, 38, 21, 66, 5.5),
        ('seg', 60, 38, 60, 66, 5.5),
        ('seg', 21, 66, 60, 66, 5.5),
    ],
    # 箱子：盖 + 箱体 + 中缝
    'box': [
        ('seg', 14, 32, 40.5, 20, 5.5),
        ('seg', 67, 32, 40.5, 20, 5.5),
        ('seg', 14, 32, 14, 64, 5.5),
        ('seg', 67, 32, 67, 64, 5.5),
        ('seg', 14, 64, 67, 64, 5.5),
        ('seg', 40.5, 32, 40.5, 64, 5.5),
    ],
    # 人：头 + 肩
    'user': [
        ('ring', 40.5, 26, 11, 5.5),
        ('arc', 40.5, 52, 21, 5.5, 12, 168),
    ],
}


def hit(shape, px, py):
    kind = shape[0]
    if kind == 'seg':
        return seg(px, py, shape[1], shape[2], shape[3], shape[4], shape[5])
    if kind == 'ring':
        return ring(px, py, shape[1], shape[2], shape[3], shape[4])
    if kind == 'arc':
        return arc(px, py, shape[1], shape[2], shape[3], shape[4], shape[5], shape[6])
    return False


def render(name, color_hex):
    shapes = SHAPES[name]
    r, g, b = hex2rgb(color_hex)
    rows = []
    step = 1.0 / SS
    for y in range(SIZE):
        row = bytearray()
        row.append(0)  # filter type 0
        for x in range(SIZE):
            inside = 0
            for j in range(SS):
                sy = y + (j + 0.5) * step
                for i in range(SS):
                    sx = x + (i + 0.5) * step
                    for s in shapes:
                        if hit(s, sx, sy):
                            inside += 1
                            break
            cov = inside / float(SS * SS)
            a = int(round(255 * cov))
            row += bytes((r, g, b, a))
        rows.append(bytes(row))
    raw = b''.join(rows)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', SIZE, SIZE, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    return png


def main():
    base = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        'miniprogram', 'assets', 'tabbar')
    os.makedirs(base, exist_ok=True)

    normal = '#A3AAA5'
    active = '#5E8C7A'
    for name in ('home', 'box', 'user'):
        for suffix, color in (('', normal), ('-active', active)):
            path = os.path.join(base, name + suffix + '.png')
            with open(path, 'wb') as f:
                f.write(render(name, color))
            print('generated:', path)


if __name__ == '__main__':
    main()
