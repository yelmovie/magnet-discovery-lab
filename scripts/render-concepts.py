"""Deterministic 12 s educational motion graphics; Pillow → FFmpeg/H.264.

Run: python scripts/render-concepts.py (Pillow, fonttools[woff], and FFmpeg).
Only magnetic apparatus appears: no generated people or uncertain physics.
"""
from pathlib import Path
import math, os, shutil, subprocess, sys, tempfile, wave, struct, json, hashlib
from functools import lru_cache
from io import BytesIO
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]

OUT = ROOT / 'public/video/concepts'
OUT.mkdir(parents=True, exist_ok=True)
W, H, FPS, SECONDS = 1280, 720, 24, 12
INK, TEAL, RED, BLUE, GOLD, PAPER = '#173f47', '#397f7b', '#d95c50', '#357da5', '#e9ba53', '#fff9e9'
# The same official typeface as the activity screens; Pillow needs SFNT data.
with TTFont(ROOT / 'public/fonts/NanumSquareNeoTTF-cBd.woff2') as source_font:
    font_data = BytesIO()
    source_font.flavor = None
    source_font.save(font_data)
font_bytes = font_data.getvalue()
fonts = {n: ImageFont.truetype(BytesIO(font_bytes), n) for n in [22, 26, 28, 30, 32, 38, 44, 48]}
TITLES = ['생활 속 자석', '닿지 않아도 작용하는 힘', '자석의 극과 움직임', '손대지 않는 원격 조종', '설계하고 시험하고 고치기']
CAPTIONS = [
 ['덮개를 열면 빨강·파랑 자석이 함께 올라가. 몸체의 철판은 제자리에 있어.', '덮개를 내리면 자석과 철판이 맞닿아 덮개를 붙잡아.', '같은 세기로 흔들어 보니, 이 우편함은 자석을 뺀 쪽만 열렸어.'],
 ['철 클립과 철못은 자석에 붙었어. 알루미늄 포일과 나무는 그대로야.', '자석을 가까이 가져가자, 닿기 전부터 철 클립이 움직여.', '같은 자리에서 얇은 종이만 넣어 봐. 클립은 종이 앞까지 끌려와.'],
 ['S극과 S극이 마주 봐. 두 자석이 서로 밀어내며 멀어져.', 'S극과 N극이 마주 봐. 두 자석이 서로 끌어당겨 붙어.', '막대에 끼운 윗고리를 놓아 봐. 마주 보는 면의 극에 따라 뜨거나 붙어.'],
 ['손잡이를 내리면 물속 패드도 내려가. 두 자석이 유리 너머로 서로 당겨.', '앞에서 다른 극을 마주 대면 수레가 끌려와. 자석끼리 닿기 전에도 움직여.', '뒤에서 같은 극을 마주 대면 수레가 밀려나. 이번에도 오른쪽으로 가.'],
 ['덮개를 닫고 흔드니 다시 열렸어. 자석이 철판에서 멀리 빗나가 있어.', '철판의 자리를 고쳐 봐. 이제 덮개를 닫으면 자석과 철판이 만나.', '편지를 넣고, 책을 넣고 다시 시험했어. 두 번 다 덮개가 잘 닫혀 있어.'],
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

def mailbox_diagram(d, origin, scale, angle, *, installed=True, plate=265, load='letter'):
    """Side cutaway. The lid rotates about one real hinge; both mating faces coincide at angle 0."""
    ox, oy = origin
    def xy(x, y):
        return (ox+x*scale, oy+y*scale)
    def box(x1, y1, x2, y2, color, radius=5):
        rr(d, (*xy(x1,y1), *xy(x2,y2)), color, max(1,round(radius*scale)), INK, max(1,round(2*scale)))
    def lid_point(x,y):
        return xy(x*math.cos(angle)+y*math.sin(angle), -x*math.sin(angle)+y*math.cos(angle))
    def lid_box(x1,y1,x2,y2,color):
        corners=[lid_point(x1,y1),lid_point(x2,y1),lid_point(x2,y2),lid_point(x1,y2)]
        d.polygon(corners,fill=color)
        d.line(corners+[corners[0]],fill=INK,width=max(1,round(2*scale)))
    # The exposed side is cut away to reveal the load and the two front mounting faces.
    box(-10,30,323,114,'#e2bd87',10)
    if load=='letter':
        box(37,55,160,94,'#fff5d9',3)
        d.line([xy(38,56),xy(100,81),xy(159,56)],fill='#ad7249',width=max(1,round(scale*2)))
    else:
        box(33,59,159,91,'#648579',3);box(40,65,158,85,'#f8efda',2)
    box(-11,0,9,112,'#bf814c');box(308,29,325,112,'#bf814c')
    box(plate-31,18,plate+31,30,'#abc0c2',3)
    lid_box(-9,-15,322,0,'#cb8e4d')
    lid_box(226,-2,303,3,'#835b35')
    if installed:
        lid_box(237,2,266,18,RED);lid_box(266,2,294,18,BLUE)
    lid_box(112,-24,162,-15,'#9a633c')
    d.ellipse((*xy(-7,-7),*xy(7,7)),fill=GOLD,outline=INK,width=2)
    return lid_point(266,10),xy(plate,24)

def leader(d, label, xy, end):
    text(d,xy,label,26)
    d.line((xy[0],xy[1]+19,*end), fill='#6e8176',width=2)
    x,y=end
    d.ellipse((x-3,y-3,x+3,y+3),fill=INK)

@lru_cache(maxsize=None)
def material(index, width, angle=0):
    with Image.open(ROOT/'public/assets/quest/material-kit.webp') as kit:
        sw,sh=kit.width//3,kit.height//2
        col,row=index%3,index//3
        obj=kit.crop((col*sw,row*sh,(col+1)*sw,(row+1)*sh)).convert('RGBA')
    if angle:
        obj=obj.rotate(angle,Image.Resampling.BICUBIC,expand=True)
    obj=obj.crop(obj.getchannel('A').point(lambda a: 255 if a>32 else 0).getbbox())
    return ImageOps.contain(obj,(width,width),Image.Resampling.LANCZOS)

def object_at(im, obj, x, y):
    im.paste(obj,(round(x-obj.width/2),round(y-obj.height/2)),obj)

def ring(d,x,y,top):
    top_color,bottom_color=(RED,BLUE) if top=='N' else (BLUE,RED)
    d.ellipse((x-97,y+2,x+97,y+34),fill=bottom_color,outline=INK,width=3)
    d.rectangle((x-97,y-16,x+97,y+18),fill=bottom_color,outline=INK,width=2)
    d.rectangle((x-95,y-16,x+95,y),fill=top_color)
    d.ellipse((x-97,y-34,x+97,y),fill=top_color,outline=INK,width=3)
    d.ellipse((x-24,y-25,x+24,y-10), fill='#664e38',outline=INK,width=2)
    d.rectangle((x-6,y-27,x+6,y-13),fill='#b18a51')
    text(d,(x+57,y-17),top,22,'white')
    text(d,(x+57,y+13),'S' if top=='N' else 'N',22,'white')

def stage_mail(d,p,u,t):
    if p<2:
        angle=.41*u if p==0 else .41*(1-u)
        pin,strike=mailbox_diagram(d,(405,384),1.38,angle)
        leader(d,'덮개 자석',(336,245),pin);leader(d,'몸체 철판',(990,328),strike)
        text(d,(1020,493),'우편함 옆모습',26)
    else:
        text(d,(355,232),'자석을 뺀 우편함',32);text(d,(918,232),'자석이 있는 우편함',32)
        shake=math.sin(24*t)*4*math.sin(math.pi*u)
        for i,x in enumerate((158,721)):
            mailbox_diagram(d,(x+shake,375),1.15,.32*u if i==0 else 0,installed=i==1)
            text(d,(x+186,539),('덮개가 들려' if i==0 else '닫힌 채로 있어') if u>.52 else '똑같이 흔들기',26,TEAL)

def stage_clip(im,d,p,u):
    if p==0:
        for i,name in enumerate(('철 클립','철못','알루미늄 포일','나무 조각')):
            x=255+i*254
            obj=material(i,85)
            magnet(d,x,297,'N',.78)
            y=423-u*(423-(324+obj.height/2)) if i<2 else 423
            object_at(im,obj,x+(27*u if i<2 else 0),y)
            text(d,(x,491),name,26);text(d,(x,529),('붙었어' if i<2 else '그대로') if u>.7 else '관찰 중',22,TEAL)
        return
    obj=material(0,112,-46)
    move=ease((u-.42)/.58) if p==1 else ease((u-.23)/.77)
    mx=425+205*ease(u/.48) if p==1 else 630
    start,edge=842,720 if p==1 else 770
    left=start+(edge-start)*move
    if p==2:
        rr(d,(756,267,770,461),'#fffdf8',3,'#a69676')
        text(d,(763,496),'얇은 종이',26)
    d.line((86,407,1170,407),fill='#b5a680',width=5)
    # Put the lower edges of the two objects on this tabletop. The clip cannot cross the paper's right face.
    magnet(d,mx,369,'N')
    object_at(im,obj,left+obj.width/2,404-obj.height/2)
    if move<.91:
        arrow(d,left+71,329,left+4,329,TEAL,5)
    if p==1:text(d,(640,502),'자석을 가까이 가져가기',28)
    else:text(d,(411,496),'같은 자리의 자석',26)
    text(d,(1040,375),'철 클립',26)

def stage_poles(d,p,u):
    if p<2:
        left=525-94*u if p==0 else 446+104*u
        right=755+94*u if p==0 else 834-104*u
        magnet(d,left,384,'N');magnet(d,right,384,'S' if p==0 else 'N')
        if p==0 or u<.98:
            direction=-1 if p==0 else 1
            arrow(d,left,302,left+90*direction,302);arrow(d,right,302,right-90*direction,302)
        text(d,(640,488),'같은 극  S · S' if p==0 else '다른 극  S · N',32)
        return
    for i,x in enumerate((350,905)):
        text(d,(x,217),'같은 극이 마주 봐' if i==0 else '다른 극이 마주 봐',28)
        rr(d,(x-110,496,x+110,516),'#a87848',8,INK)
        rr(d,(x-6,245,x+6,500),'#b48a54',5)
        lower=496-34  # The bottom edge rests directly on the top of the wooden base.
        upper=(351-29*u) if i==0 else (323+(lower-34-323)*u)
        ring(d,x,lower,'N');ring(d,x,upper,'S' if i==0 else 'N')
        if u<.96:
            arrow(d,x-130,upper+10,x-130,upper+10+(-40 if i==0 else 40),TEAL,5)
        text(d,(x,542),('N · N  →  윗고리가 떠' if i==0 else 'S · N  →  두 고리가 붙어'),26,TEAL)

def stage_remote(d,p,u):
    if p==0:
        rr(d,(643,230,1090,476),'#c7e6e4',18,'#6ca9ac')
        rr(d,(630,220,646,485),'#82bdc7',5,'#4c858d')
        text(d,(422,228),'유리 밖',28);text(d,(848,277),'물속',28)
        y=320+72*u
        # Both protective housings slide on their own face of the glass.
        rr(d,(486,y-36,630,y+36),'#cf896b',13,INK)
        rr(d,(646,y-36,790,y+36),'#669ca7',13,INK)
        magnet(d,559,y,'N',.72);magnet(d,718,y,'N',.72)
        if u<.96:
            arrow(d,462,y-16,462,y+38);arrow(d,817,y-16,817,y+38)
        text(d,(440,514),'바깥 손잡이 자석',26);text(d,(843,514),'물속 패드 자석',26)
        text(d,(637,207),'유리벽',22)
        return
    pull=p==1
    cart=(368 if pull else 480)+215*ease((u-.1)/.9)
    controller=cart+(196-22*ease(u/.2) if pull else -205+33*ease(u/.2))
    d.line((169,445,1112,445),fill='#ab936c',width=8)
    rr(d,(cart-83,368,cart+83,420),'#cc9c63',10,INK)
    for wx in (cart-49,cart+49):d.ellipse((wx-15,414,wx+15,444),fill=INK,outline='#aabcb9',width=4)
    magnet(d,cart,374,'N',.75)
    magnet(d,controller,374,'N' if pull else 'S',.75)
    arrow(d,cart-52,302,cart+54,302);text(d,(cart,264),'수레가 받는 힘',26)
    text(d,(cart,492),'택배 수레',26);text(d,(controller,492),'조종 자석',26)
    text(d,(640,536),'앞의 조종 자석이 당겨' if pull else '뒤의 조종 자석이 밀어',26,TEAL)

def stage_design(d,p,u,t):
    if p<2:
        if p==0:
            angle=.36*(1-ease(u/.38))+.28*ease((u-.50)/.47)
            dx=math.sin(28*t)*3 if .42<u<.87 else 0
            plate=140
        else:
            angle=.37*(1-ease((u-.5)/.5))
            dx=0
            plate=140+125*ease(u/.45)
        pin,strike=mailbox_diagram(d,(421+dx,367),1.32,angle,plate=plate)
        leader(d,'덮개 자석',(333,251),pin);leader(d,'몸체 철판',(973,307),strike)
        text(d,(640,541),'첫 시험 · 철판이 빗나갔어' if p==0 else '고치기 · 두 자리를 맞춰',28,TEAL)
    else:
        for i,x in enumerate((163,721)):
            progress=ease(u*2-i)
            shake=math.sin(26*t)*3 if 0.62<progress<.96 else 0
            mailbox_diagram(d,(x+shake,380),1.15,.31*(1-ease(progress/.6)),load='letter' if i==0 else 'book')
            text(d,(x+183,224),'편지 한 장' if i==0 else '책 한 권',32)
            text(d,(x+183,529),'확인 · 닫혀 있어' if progress>.95 else '사용 시험',26,TEAL)

def scene(stage,t):
    im,d,p,u=base(stage,t)
    if stage==0:stage_mail(d,p,u,t)
    elif stage==1:stage_clip(im,d,p,u)
    elif stage==2:stage_poles(d,p,u)
    elif stage==3:stage_remote(d,p,u)
    else:stage_design(d,p,u,t)
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

def render(scratch):
    ffmpeg=os.environ.get('FFMPEG') or shutil.which('ffmpeg')
    if not ffmpeg:
        sys.path.append(str(ROOT/'.tools/python'))
        import imageio_ffmpeg
        ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    audio=scratch/'chimes.wav';soundtrack(audio)
    manifest=[]
    for stage in range(5):
        target=scratch/f'stage-{stage+1}.mp4'
        published = OUT / target.name
        # Caption/diagram edits preserve the exact existing audio stream. The
        # synthesized chimes are needed only when rendering a new film.
        audio_source = published if published.is_file() else audio
        audio_format = ['-c:a', 'copy'] if audio_source == published else ['-c:a', 'aac', '-b:a', '64k']
        command=[ffmpeg,'-y','-loglevel','error','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(audio_source),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p',*audio_format,'-t',str(SECONDS),'-movflags','+faststart',str(target)]
        proc=subprocess.Popen(command,stdin=subprocess.PIPE)
        for frame in range(FPS*SECONDS):proc.stdin.write(scene(stage,frame/FPS).tobytes())
        proc.stdin.close()
        if proc.wait()!=0:raise RuntimeError(f'FFmpeg failed: {stage}')
        scene(stage,10.9).save(scratch/f'stage-{stage+1}.webp',quality=90)
        vtt='WEBVTT\n\n'+'\n\n'.join(f'00:0{i*4}.000 --> 00:{(i+1)*4:02}.000\n{caption}' for i,caption in enumerate(CAPTIONS[stage]))+'\n'
        with (scratch/f'stage-{stage+1}.vtt').open('w', encoding='utf-8', newline='\n') as file: file.write(vtt)
        manifest.append({'stage':stage+1,'title':TITLES[stage],'duration':SECONDS,'width':W,'height':H,'fps':FPS,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
        print(f'{target.name}: {target.stat().st_size/1024:.0f} KB',flush=True)
    with (scratch/'manifest.json').open('w', encoding='utf-8', newline='\n') as file:
        json.dump(manifest, file, ensure_ascii=False, indent=2)
    for item in [*scratch.glob('stage-*'),scratch/'manifest.json']:
        item.replace(OUT/item.name)

if __name__=='__main__':
    with tempfile.TemporaryDirectory(prefix='.concept-render-',dir=OUT.parent) as scratch:
        render(Path(scratch))
