import json,sys,re,statistics as st
from datetime import date
from collections import defaultdict
S=sys.argv[1]; rows=[r for r in json.load(open(f"{S}/items.json")) if r["date"]>"2025"]
orders=sorted(set(r["date"] for r in rows))
DROP=r"\b(sainsbury'?s|js|taste the difference|so organic|fairtrade|british|fresh|loose|large|small|medium|whole|seedless|red|white|green|classic|ripe ?& ?ready|essential|organic|frozen|pack|each)\b"
def fam(n):
    s=n.lower(); s=re.sub(r"\(.*?\)","",s); s=re.sub(DROP,"",s)
    s=re.sub(r"\b\d+(\.\d+)?\s*(g|kg|ml|l|cl|pint|x|pk|pack)?\b","",s); s=re.sub(r"\bx\s*\d+\b","",s)
    s=re.sub(r"[^a-zà-ÿ& ]"," ",s); return re.sub(r"\s+"," ",s).strip()
bask=defaultdict(set); lastname={}
for r in sorted(rows,key=lambda r:r["date"]):
    f=fam(r["name"]); bask[r["date"]].add(f); lastname[(f,r["date"])]=r["name"]
def wk(a,b): return (date.fromisoformat(b)-date.fromisoformat(a)).days/7
def predict(t, W=10, TH=0.7):
    past=[o for o in orders if o<t]; win=past[-W:]
    dates=defaultdict(list)
    for o in past:
        for f in bask[o]: dates[f].append(o)
    staples={};restock={}
    for f,ds in dates.items():
        sh=sum(1 for o in win if f in bask[o])/len(win)
        if sh>=TH: staples[f]=(sh,ds[-1]); continue
        gaps=[wk(a,b) for a,b in zip(ds,ds[1:])]
        if len(ds)>=4 and len(gaps)>=2:
            med=st.median(gaps); since=wk(ds[-1],t); spr=st.pstdev(gaps)/med if med else 9
            if med>=1.5 and spr<=0.6 and 0.9*med<=since<=2.5*med: restock[f]=(med,since,len(ds),ds[-1])
    return staples,restock
if __name__=="__main__":
    for W,TH in [(10,0.7),(8,0.75),(12,0.65)]:
        sp=[];rp=[];cov=[]
        for t in orders[-8:]:
            s,r=predict(t,W,TH); a=bask[t]
            sp.append(len(set(s)&a)/len(s)); rp.append(len(set(r)&a)/len(r) if r else 0); cov.append(len((set(s)|set(r))&a)/len(a))
        print(f"window {W}, threshold {TH:.0%}: staples right {st.mean(sp):.0%} (avg {st.mean([len(predict(t,W,TH)[0]) for t in orders[-8:]]):.0f} items), restock right {st.mean(rp):.0%} (avg {st.mean([len(predict(t,W,TH)[1]) for t in orders[-8:]]):.0f} items), covers {st.mean(cov):.0%} of order")
