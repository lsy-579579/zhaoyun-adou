# 生成游戏音效 WAV 文件：python3 tools/gen_audio.py
import math
import os
import random
import struct
import wave

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'audio')
os.makedirs(OUT, exist_ok=True)


def write_wav(name, samples):
    path = os.path.join(OUT, name + '.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = b''.join(
            struct.pack('<h', int(max(-1, min(1, s)) * 32767 * 0.8)) for s in samples
        )
        w.writeframes(frames)
    print('generated', name + '.wav', f'{os.path.getsize(path) / 1024:.1f}KB')


def env(t, dur, a=0.005, r=0.6):
    if t < a:
        return t / a
    return max(0.0, (1 - (t - a) / (dur - a))) ** r


def gen(dur, fn):
    n = int(SR * dur)
    return [fn(i / SR, dur) for i in range(n)]


def sin(f, t):
    return math.sin(2 * math.pi * f * t)


def noise():
    return random.random() * 2 - 1


# 合成：木鱼般的“笃”声上扬
write_wav('merge', gen(0.22, lambda t, d:
    (sin(520 + t * 1400, t) * 0.7 + sin(1040 + t * 1800, t) * 0.25) * env(t, d, 0.004, 1.2)))

# 射击：短促“嗖”
write_wav('shoot', gen(0.12, lambda t, d:
    (sin(900 - t * 3200, t) * 0.5 + noise() * 0.18) * env(t, d, 0.002, 1.6)))

# 受击：闷响
write_wav('hit', gen(0.13, lambda t, d:
    (sin(180 - t * 300, t) * 0.7 + noise() * 0.3) * env(t, d, 0.002, 1.8)))

# 金币：清脆双音
write_wav('coin', gen(0.24, lambda t, d:
    sin(1320 if t < 0.08 else 1760, t) * 0.6 * env(t, d, 0.003, 1.4)))


# 召唤武将：铜锣+上行琶音
def summon(t, d):
    gong = sin(220, t) * math.exp(-t * 4) * 0.5 + sin(331, t) * math.exp(-t * 5) * 0.3
    idx = min(3, int(t / 0.14))
    arp = sin([523, 659, 784, 1046][idx], t) * 0.3 * env(t, d, 0.01, 1)
    return gong + arp


write_wav('summon', gen(0.7, summon))


# BOSS 来袭：低沉战鼓
def boss(t, d):
    beat = t % 0.3
    drum = (sin(70, beat) + noise() * 0.2) * math.exp(-beat * 18) * 0.9
    return drum * env(t, d, 0.005, 0.5)


write_wav('boss', gen(0.9, boss))


# 胜利：上行号角
def win(t, d):
    f = [392, 523, 659, 784][min(3, int(t / 0.28))]
    return (sin(f, t) * 0.5 + sin(f * 2, t) * 0.2 + sin(f * 1.5, t) * 0.15) * env(t, d, 0.02, 0.8)


write_wav('win', gen(1.2, win))

# 失败：下行叹息
write_wav('lose', gen(1.1, lambda t, d:
    (sin(440 - t * 220, t) * 0.5 + sin((440 - t * 220) * 0.5, t) * 0.3) * env(t, d, 0.02, 0.9)))

# 点击
write_wav('click', gen(0.07, lambda t, d: sin(1100, t) * 0.5 * env(t, d, 0.002, 2)))
