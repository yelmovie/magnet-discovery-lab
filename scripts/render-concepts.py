"""Deterministic 12 s educational motion graphics; Pillow → FFmpeg/H.264.

Run: python scripts/render-concepts.py (imageio-ffmpeg in .tools/python).
Only magnetic apparatus appears: no generated people or uncertain physics.
"""
from pathlib import Path
import math, subprocess, sys, wave, struct, json, hashlib
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools/python'))
import imageio_ffmpeg

OUT = ROOT / 'public/video/concepts'
OUT.mkdir(parents=True, exist_ok=True)
W, H, FPS, SECONDS = 1280, 720, 24, 12
INK, TEAL, RED, BLUE, GOLD, PAPER = '#173f47', '#397f7b', '#d95c50', '#357da5', '#e9ba53', '#fff9e9'
FONT = Path('C:/Windows/Fonts/malgunbd.ttf')
fonts = {n: ImageFont.truetype(str(FONT), n) for n in [22, 26, 28, 30, 32, 38, 44, 48]}
TITLES = ['생활 속 자석', '닿지 않아도 작용하는 힘', '자석의 극과 움직임', '손대지 않는 원격 조종', '설계하고 시험하고 고치기']
CAPTIONS = [
 ['덮개 안의 자석과 철판을 찾아보자.', '자석이 철판을 당겨 덮개를 붙잡아.', '자석을 빼면? 같은 흔들림에도 덮개가 열려.'],
 ['철은 붙지만, 모든 금속이 붙는 것은 아니야.', '자석을 가까이하면 닿기 전에도 철이 움직여.', '같은 거리에서 얇은 종이만 넣어도 힘이 작용해.'],
 ['같은 극이 마주 보면 서로 밀어내.', '다른 극이 마주 보면 서로 끌어당겨.', '고리의 윗면과 아랫면! 마주 보는 극을 살펴봐.'],
 ['유리 밖 자석을 따라 안쪽 철 패드가 움직여.', '가까이, 천천히! 멀어지면 패드가 따라오지 못해.', '앞에서 당기거나 뒤에서 밀어 택배를 옮겨.'],
 ['누구의 불편을 해결할까? 부품을 직접 배치해.', '멀리 떨어져 있으면 원하는 대로 작동하지 않아.', '가까이 마주 놓고, 다른 상황에서도 다시 시험해.'],
]

def ease(v):
    v = min(1, max(0, v))
    return v*v*(3-2*v)

def text(d, xy, value, size=30, fill=INK, anchor='mm'):
    d.text(xy, value, font=fonts[size], fill=fill, anchor=anchor)

def rr(d, box, fill, radius=20, outline=None, width=3):
    d.rounded_rectangle(tuple(int(x) for x in box), radius=radius, fill=fill, outline=outline, width=width)

def arrow(d, x, y, tx, ty, color=TEAL, width=7):
    d.line((x,y,tx,ty), fill=color, width=width)
    a=math.atan2(ty-y,tx-x)
    d.polygon([(tx,ty),(tx-20*math.cos(a-.5),ty-20*math.sin(a-.5)),(tx-20*math.cos(a+.5),ty-20*math.sin(a+.5))], fill=color)

def magnet(d, x, y, pole='N', scale=1):
    w,h=180*scale,70*scale
    rr(d,(x-w/2,y-h/2+8,x+w/2,y+h/2+8),'#173f4720')
    rr(d,(x-w/2,y-h/2,x+w/2,y+h/2),RED if pole=='N' else BLUE,14,INK)
    rr(d,(x,y-h/2,x+w/2,y+h/2),BLUE if pole=='N' else RED,10)
    d.line((x,y-h/2,x,y+h/2),fill=INK,width=2)
    text(d,(x-w/4,y),'N' if pole=='N' else 'S',32,'white')
    text(d,(x+w/4,y),'S' if pole=='N' else 'N',32,'white')

def iron(d,x,y,label='鉄',w=100):
    rr(d,(x-w/2,y-33,x+w/2,y+33),'#afc2c4',12,INK)
    text(d,(x,y),'철' if label=='鉄' else label,28)

def waves(d,x,y,strength,t):
    for i in range(3):
        r=32+i*23+(t*14)%23
        if strength>.1: d.arc((x-r,y-r,x+r,y+r),-65,65,fill='#6caaa0',width=3)

def base(stage,t):
    im=Image.new('RGB',(W,H),PAPER);d=ImageDraw.Draw(im)
    for x in range(0,W,40):
        for y in range(0,H,40):d.ellipse((x,y,x+2,y+2),fill='#e8e5d3')
    rr(d,(38,32,172,72),TEAL,18);text(d,(105,52),f'발견 {stage+1:02}',22,'white')
    text(d,(204,52),'자꾸의 12초 개념 실험실',26,INK,'lm')
    text(d,(640,119),TITLES[stage],44)
    rr(d,(62,173,1218,563),'#f1ecd9',32)
    # Three numbered cut indicators, with a deliberately still final composition.
    part=min(2,int(t//4))
    for i in range(3):
        rr(d,(1090+i*31,42,1110+i*31,62),TEAL if i<=part else '#cbd4c5',9)
    rr(d,(62,594,1218,677),'#e0eee6',20)
    text(d,(640,635),CAPTIONS[stage][part],30)
    rr(d,(62,698,1218,704),'#d4daca',3)
    rr(d,(62,698,62+1156*min(1,t/SECONDS),704),TEAL,3)
    return im,d,part,ease((t%4-.3)/2.7)

def scene(stage,t):
    im,d,p,u=base(stage,t)
    if stage==0:
        # One apparatus, then magnified mechanism, then a controlled removal.
        rr(d,(352,310,928,510),'#cf9962',25,INK)
        rr(d,(377,333,903,478),'#715d43',18)
        opened = (1-u)*95 if p==0 else (u*95 if p==2 else 0)
        rr(d,(342,262-opened,938,337-opened),'#edbf79',18,INK)
        magnet(d,507 if p!=2 else 507-u*205,375,'N',.78)
        iron(d,689,375,'철판',120)
        if p==1:
            arrow(d,627,375,582,375);waves(d,564,375,1,t)
            text(d,(640,222),'당기는 힘',32)
        elif p==0:
            text(d,(640,220),'덮개 속을 확대해서 보자',28)
        else:
            arrow(d,960,355,960,270-opened,GOLD)
            text(d,(640,221),'자석 유무만 바꾸어 비교',28)
    elif stage==1:
        if p==0:
            labels=['철 클립','철못','알루미늄','나무']
            for i,l in enumerate(labels):
                x=270+i*245; y=374-(u*56 if i<2 else 0)
                magnet(d,x,258,'N',.65)
                rr(d,(x-73,y-28,x+73,y+28),'#adbdbe' if i<3 else '#cca66c',12,INK)
                text(d,(x,y),l,26);text(d,(x,480),'붙었어' if i<2 else '따라오지 않아',26,TEAL if i<2 else INK)
                if i<2:arrow(d,x,375,x,337,GOLD,5)
        else:
            mx=350+(u*120 if p==1 else 120)
            cx=780-u*123 if p==1 else 657+math.sin(t)*9
            magnet(d,mx,368,'N');iron(d,cx,368,'철 클립',130)
            arrow(d,cx-85,368,mx+115,368)
            if p==2:
                rr(d,(568,263,587,478),'#fffefa',4,'#b7ad8d')
                text(d,(577,508),'얇은 종이',28)
            else:text(d,(640,489),'거리만 바꾸어 비교',30)
            waves(d,mx+75,368,1,t)
    elif stage==2:
        if p<2:
            gap=(150*u if p==0 else -150*u)
            magnet(d,400-gap/2,363,'N')
            magnet(d,880+gap/2,363,'S' if p==0 else 'N')
            if p==0:
                arrow(d,570,363,507,363,RED);arrow(d,710,363,773,363,RED)
                text(d,(640,482),'S  ↔  S  ·  밀어내기',38,RED)
            else:
                arrow(d,520,363,594,363,TEAL);arrow(d,760,363,686,363,TEAL)
                text(d,(640,482),'S  →  ←  N  ·  끌어당기기',38,TEAL)
        else:
            d.line((640,230,640,511),fill='#8f8a71',width=16)
            for i in range(3):
                cy=470-i*(54+u*38)
                d.ellipse((550,cy-24,730,cy+24),fill=RED if i%2==0 else BLUE,outline=INK,width=3)
                d.ellipse((626,cy-8,654,cy+8),fill='#e5d4a9',outline=INK,width=2)
                text(d,(862,cy),f'위 {"N" if i%2==0 else "S"} / 아래 {"S" if i%2==0 else "N"}',26)
            text(d,(354,352),'같은 극이\n마주 보게!',32)
    elif stage==3:
        if p<2:
            rr(d,(638,217,658,520),'#89bfc9',8)
            text(d,(650,202),'유리',26)
            y=345+math.sin(t*1.25)*72
            mx=470 if p==0 else 470-u*155
            py=y if p==0 else 348+math.sin(5)*60
            magnet(d,mx,y,'N',.85);iron(d,758,py,'패드',105)
            if p==0:arrow(d,758,py+83,758,y+50)
            text(d,(350,514),'바깥 자석',28);text(d,(880,514),'안쪽 철 패드',28)
            if p==1:text(d,(640,252),'너무 멀어지면 따라오지 않아',28)
        else:
            for row,y in enumerate([298,456]):
                x=450+u*330
                d.line((210,y+47,1080,y+47),fill='#b8a679',width=7)
                rr(d,(x-63,y-32,x+63,y+29),'#d1a666',12,INK)
                d.ellipse((x-44,y+21,x-20,y+45),fill=INK);d.ellipse((x+20,y+21,x+44,y+45),fill=INK)
                magnet(d,x,y-6,'N',.5)
                magnet(d,x+(180 if row==0 else -180),y-6,'N' if row==0 else 'S',.65)
                arrow(d,x-40,y-73,x+50,y-73,GOLD,6)
                text(d,(1060,y-8),'당기기' if row==0 else '밀기',28)
    else:
        rr(d,(351,335,930,513),'#d4b787',22,INK)
        text(d,(640,475),'나의 자석 장치',30)
        gap=220 if p==0 else (220 if p==1 else 220-u*130)
        magnet(d,470,353-(1-u)*100 if p==0 else 353,'N',.8)
        iron(d,470+gap,353,'철판',105)
        if p==0:
            arrow(d,470,222,470,294,GOLD);arrow(d,690,222,690,294,GOLD)
            text(d,(640,216),'배치하기',32)
        elif p==1:
            text(d,(640,230),'멀리 떨어진 부품 → 다시 고쳐 보자',30)
        else:
            arrow(d,605,353,580,353)
            text(d,(640,224),'가까이 + 마주 보게',32,TEAL)
            text(d,(640,543),'편지 한 장  ✓       책 한 권  ✓' if u>.7 else '다른 사용 상황도 시험 중…',28,TEAL)
    return im

def soundtrack(path):
    rate=44100
    with wave.open(str(path),'wb') as wav:
        wav.setparams((1,2,rate,0,'NONE','not compressed'))
        samples=[]
        for i in range(rate*SECONDS):
            t=i/rate; v=0
            for start,f in [(0.2,523.25),(0.4,659.25),(4.1,587.33),(4.3,783.99),(8.1,659.25),(8.3,783.99),(10.8,1046.5)]:
                q=t-start
                if 0<q<.65:v+=.09*math.sin(2*math.pi*f*q)*math.exp(-q*7)*min(1,q/.012)
            samples.append(struct.pack('<h',int(max(-1,min(1,v))*32767)))
        wav.writeframes(b''.join(samples))

def render():
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    audio=ROOT/'.tools/concept-chimes.wav';audio.parent.mkdir(exist_ok=True);soundtrack(audio)
    manifest=[]
    for stage in range(5):
        target=OUT/f'stage-{stage+1}.mp4'
        command=[ffmpeg,'-y','-loglevel','error','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(audio),'-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','64k','-t',str(SECONDS),'-movflags','+faststart',str(target)]
        proc=subprocess.Popen(command,stdin=subprocess.PIPE)
        for frame in range(FPS*SECONDS):proc.stdin.write(scene(stage,frame/FPS).tobytes())
        proc.stdin.close()
        if proc.wait()!=0:raise RuntimeError(f'FFmpeg failed: {stage}')
        scene(stage,10.9).save(OUT/f'stage-{stage+1}.webp',quality=90)
        vtt='WEBVTT\n\n'+'\n\n'.join(f'00:0{i*4}.000 --> 00:{(i+1)*4:02}.000\n{caption}' for i,caption in enumerate(CAPTIONS[stage]))+'\n'
        (OUT/f'stage-{stage+1}.vtt').write_text(vtt,encoding='utf-8')
        manifest.append({'stage':stage+1,'title':TITLES[stage],'duration':SECONDS,'width':W,'height':H,'fps':FPS,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
        print(f'{target.name}: {target.stat().st_size/1024:.0f} KB',flush=True)
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__':render()
