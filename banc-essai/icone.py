# -*- coding: utf-8 -*-
"""Extrait le logo SEUL de l'image fournie (marge blanche + ombre portée
   retirées) et reconstruit un CARRÉ PLEIN — exactement la forme de l'ancienne
   icône, dont les coins étaient peints jusqu'au bord et arrondis par le CSS
   (in-app) ou par le système (écran d'accueil). Les coins arrondis cuits dans
   l'image sont donc rebouchés par prolongement de la couleur voisine."""
from PIL import Image
from collections import deque

SRC='/root/.claude/uploads/fb9bf869-826b-5523-9825-ea1b24c294d0/9c7a74bc-image.png'
L,R,T,B = 61,1183,58,1190
im = Image.open(SRC).convert('RGB').crop((L,T,R+1,B+1))
W,H = im.size
px = im.load()

def fond(p):
    r,g,b = p
    return (max(p)-min(p)) < 26 and max(p) > 35      # neutre ET pas le noir du logo

# 1) le FOND, c'est ce qui est neutre-clair ET relié à un coin de la découpe
dehors = [[False]*H for _ in range(W)]
q = deque()
for sx,sy in ((0,0),(W-1,0),(0,H-1),(W-1,H-1)):
    if fond(px[sx,sy]): dehors[sx][sy]=True; q.append((sx,sy))
while q:
    x,y = q.popleft()
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
        nx,ny = x+dx, y+dy
        if 0<=nx<W and 0<=ny<H and not dehors[nx][ny] and fond(px[nx,ny]):
            dehors[nx][ny]=True; q.append((nx,ny))

# 1bis) on élargit de 3 px : la frange anti-crénelée entre le blanc et le logo
#       est un mélange des deux, ni tout à fait neutre ni tout à fait logo.
for _ in range(3):
    bord=[]
    for x in range(W):
        for y in range(H):
            if dehors[x][y]:
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx,ny=x+dx,y+dy
                    if 0<=nx<W and 0<=ny<H and not dehors[nx][ny]: bord.append((nx,ny))
    for x,y in bord: dehors[x][y]=True
n_dehors = sum(1 for x in range(W) for y in range(H) if dehors[x][y])
print("  pixels de fond retirés : %d (%.2f %% de l'image)" % (n_dehors, 100.0*n_dehors/(W*H)))

# 2) on rebouche : chaque pixel de fond prend la couleur du pixel d'image le
#    plus proche (propagation en largeur depuis la frontière du logo)
q = deque()
for x in range(W):
    for y in range(H):
        if dehors[x][y]:
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx,ny = x+dx,y+dy
                if 0<=nx<W and 0<=ny<H and not dehors[nx][ny]:
                    q.append((x,y)); break
vus = set(q)
while q:
    x,y = q.popleft()
    src=None
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)):
        nx,ny = x+dx,y+dy
        if 0<=nx<W and 0<=ny<H and not dehors[nx][ny]: src=(nx,ny); break
    if src: px[x,y] = px[src]; dehors[x][y]=False
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
        nx,ny = x+dx,y+dy
        if 0<=nx<W and 0<=ny<H and dehors[nx][ny] and (nx,ny) not in vus:
            vus.add((nx,ny)); q.append((nx,ny))
reste = sum(1 for x in range(W) for y in range(H) if dehors[x][y])
print("  pixels non rebouchés : %d" % reste)

# 3) carré parfait, puis toutes les tailles
carre = im.resize((1024,1024), Image.LANCZOS)
carre.save('logo-1024.png')
for nom,taille in (('logo-512.png',512), ('logo-192.png',192), ('logo-180.png',180), ('logo-64.png',64)):
    carre.resize((taille,taille), Image.LANCZOS).save(nom)
print('  écrit : logo-1024/512/192/180/64.png')
c=carre.load()
print('  coins du résultat :', c[0,0], c[1023,0], c[0,1023], c[1023,1023])
