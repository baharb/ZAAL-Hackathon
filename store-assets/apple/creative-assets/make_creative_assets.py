import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
OUT=sys.argv[1]; S=sys.argv[2]
W,H=5244,2950
bg=Image.open('assets/neli-world/backgrounds/Jungle/jungle_landscape_3840x2160.webp').convert('RGB').resize((W,H),Image.LANCZOS)
c=bg.convert('RGBA')
def place(path,h,cx,bottom):
    im=Image.open(path).convert('RGBA'); im=im.crop(im.getbbox())
    im=im.resize((int(im.width*h/im.height),h),Image.LANCZOS)
    x=int(cx-im.width/2); y=bottom-h
    sh=Image.new('RGBA',c.size,(0,0,0,0)); e=ImageDraw.Draw(sh)
    e.ellipse((x+im.width*0.1,bottom-50,x+im.width*0.9,bottom+50),fill=(20,60,20,90))
    c.alpha_composite(sh.filter(ImageFilter.GaussianBlur(25)))
    c.alpha_composite(im,(x,y))
# letter bubbles
fa=ImageFont.truetype('C:/Windows/Fonts/tahomabd.ttf',230)
bub=[('آ',2100,1950,(239,83,80)),('ب',2700,2150,(255,167,38)),('پ',3300,1950,(66,165,245)),('ت',4250,900,(171,71,188))]
for ch,x,y,col in bub:
    l=Image.new('RGBA',c.size,(0,0,0,0)); d=ImageDraw.Draw(l); r=190
    d.ellipse((x-r+12,y-r+18,x+r+12,y+r+18),fill=(0,0,0,50))
    d.ellipse((x-r,y-r,x+r,y+r),fill=col+(255,),outline=(255,255,255,255),width=22)
    d.text((x,y-10),ch,font=fa,fill='white',anchor='mm')
    c.alpha_composite(l)
place('assets/neli-world/characters/Neli/04_dancing_4x.png',1650,1130,2470)
place('assets/neli-world/characters/Lila/lila_jumping@4x.png',1350,4000,2460)
# logo + phrase
logo=Image.open('marketing/reels/shared/logo-color.png').convert('RGBA'); logo=logo.crop(logo.getbbox())
lw=1500; logo=logo.resize((lw,int(logo.height*lw/logo.width)),Image.LANCZOS)
plate=Image.new('RGBA',c.size,(0,0,0,0)); d=ImageDraw.Draw(plate)
lx=(W-lw)//2; ly=560
d.rounded_rectangle((W//2-1050,ly-90,W//2+1050,ly+logo.height+330),radius=140,fill=(255,255,255,235))
c.alpha_composite(plate.filter(ImageFilter.GaussianBlur(2)))
c.alpha_composite(logo,(lx,ly))
f=ImageFont.truetype('assets/fonts/Nunito_800ExtraBold.ttf',170)
d=ImageDraw.Draw(c); d.text((W//2,ly+logo.height+150),'Learn Farsi through play',font=f,fill=(124,58,237),anchor='mm')
u=c.convert('RGB'); u.save(OUT+'/ZAAL-universal-5244x2950.png',optimize=True)
hh=round(W*1646/3840); y0=(H-hh)//2
u.crop((0,y0,W,y0+hh)).resize((3840,1646),Image.LANCZOS).save(OUT+'/ZAAL-header-3840x1646.jpg',quality=93)
sw=round(H*1.5); x0=(W-sw)//2
u.crop((x0,0,x0+sw,H)).resize((3840,2560),Image.LANCZOS).save(OUT+'/ZAAL-search-3840x2560.jpg',quality=93)
# preview with safe-area guides
p=u.copy(); d=ImageDraw.Draw(p)
d.rectangle((0,y0,W,y0+hh),outline=(255,0,0),width=14); d.rectangle((x0,0,x0+sw,H),outline=(0,0,255),width=14)
p.thumbnail((1400,1400)); p.save(S+'/preview.jpg')
