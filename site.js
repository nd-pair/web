// Shared chrome: nav + footer injection, active link, scroll-reveal, mobile menu.
(function(){
  const PAGES = [
    ["index.html","Home"],
    ["laboratories.html","Laboratories"],
    ["people.html","People"],
    ["publications.html","Publications"],
    ["internal.html","Internal"],
  ];
  const here = (location.pathname.split("/").pop() || "index.html");
  const navEl = document.getElementById("site-nav");
  if(navEl){
    navEl.className = "nav";
    navEl.innerHTML =
      `<div class="wrap">
        <a class="brand" href="index.html">Physical <span class="at">AI</span> and Robotics Initiative</a>
        <button class="navtoggle" aria-label="Menu">☰</button>
        <nav>${PAGES.map(([h,l])=>`<a href="${h}" class="${h===here?"active":""}">${l}</a>`).join("")}</nav>
      </div>`;
    const toggle = navEl.querySelector(".navtoggle");
    const menu = navEl.querySelector("nav");
    toggle.addEventListener("click",()=>menu.classList.toggle("open"));
  }

  const footEl = document.getElementById("site-footer");
  if(footEl){
    footEl.className = "site";
    const yr = document.getElementById("nd-year-slot");
    footEl.innerHTML =
      `<div class="wrap">
        <div style="max-width:34ch">
          <div class="brand">Physical <span style="color:#e5b93d">AI</span> and Robotics Initiative</div>
          <small>Building robots to increase human flourishing, at the University of Notre Dame.</small>
        </div>
        <div>
          <div style="color:#fff;font-weight:600;margin-bottom:8px">Explore</div>
          ${PAGES.map(([h,l])=>`<div><a href="${h}">${l}</a></div>`).join("")}
        </div>
        <div>
          <div style="color:#fff;font-weight:600;margin-bottom:8px">Elsewhere</div>
          <div><a href="https://robotics.nd.edu/" target="_blank" rel="noopener">robotics.nd.edu</a></div>
          <div><a href="https://www.nd.edu/" target="_blank" rel="noopener">nd.edu</a></div>
          <div><a href="https://openalex.org/" target="_blank" rel="noopener">Data: OpenAlex</a></div>
        </div>
      </div>
      <div class="wrap" style="margin-top:22px"><small>© University of Notre Dame · Robotics @ Notre Dame</small></div>`;
  }

  // reveal on scroll
  const io = new IntersectionObserver((es)=>{
    es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
  }, {threshold:.12});
  document.querySelectorAll(".reveal").forEach(el=>io.observe(el));

  // a light-blue schematic humanoid idly walking back and forth in each hero
  function heroWalker(){
    const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll(".hero").forEach(hero=>{
      const cv=document.createElement("canvas"); cv.className="fx"; hero.prepend(cv);
      const ctx=cv.getContext("2d"); let W,H,dpr,last=0;
      let posX=0.5, dir=1, pause=0;
      function size(){
        dpr=Math.min(2,window.devicePixelRatio||1);
        W=cv.width=hero.clientWidth*dpr; H=cv.height=hero.clientHeight*dpr;
        cv.style.width=hero.clientWidth+"px"; cv.style.height=hero.clientHeight+"px";
      }
      // segment lengths (local units, ~175 tall)
      const TORSO=52, NECK=10, HEAD=12, THIGH=36, SHANK=34, UARM=26, FARM=24;
      function seg(x,y,a,l){ return [x+Math.sin(a)*l, y+Math.cos(a)*l]; } // a from +Y(down)
      function figure(cx,cy,s,ph,face){
        ctx.save(); ctx.translate(cx,cy); ctx.scale(face*s,s); ctx.translate(0,-3.5*Math.abs(Math.sin(ph)));
        ctx.lineWidth=3.4; ctx.lineCap="round"; ctx.lineJoin="round";
        ctx.strokeStyle="rgba(150,188,230,0.55)"; ctx.fillStyle="rgba(150,188,230,0.55)";
        const sh=[0,-TORSO];
        // leg: hip(0,0)->knee->foot
        const leg=p=>{ const th=0.55*Math.sin(p), kb=0.95*Math.max(0,Math.sin(p+0.4));
          const k=seg(0,0,th,THIGH), f=seg(k[0],k[1],th-kb,SHANK);
          ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(k[0],k[1]);ctx.lineTo(f[0],f[1]);ctx.stroke(); };
        // arm: shoulder->elbow->hand
        const arm=p=>{ const sa=0.5*Math.sin(p), eb=0.35+0.35*Math.max(0,Math.sin(p+0.5));
          const e=seg(sh[0],sh[1],sa,UARM), h=seg(e[0],e[1],sa-eb,FARM);
          ctx.beginPath();ctx.moveTo(sh[0],sh[1]);ctx.lineTo(e[0],e[1]);ctx.lineTo(h[0],h[1]);ctx.stroke(); };
        leg(ph); leg(ph+Math.PI); arm(ph+Math.PI); arm(ph);
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(sh[0],sh[1]);ctx.stroke();       // spine
        ctx.beginPath();ctx.moveTo(sh[0],sh[1]);ctx.lineTo(0,-TORSO-NECK);ctx.stroke();
        ctx.beginPath();ctx.arc(0,-TORSO-NECK-HEAD,HEAD,0,6.2832);ctx.stroke();     // head
        ctx.restore();
      }
      // pace in the open right third of the hero (clear of the left-aligned text)
      const LO=0.62, HI=0.90; posX=0.74;
      function frame(ts){
        const dt=Math.min(60, ts-(last||ts)); last=ts;
        ctx.clearRect(0,0,W,H);
        if(pause>0) pause-=dt;
        else { posX+=dir*0.00006*dt;
          if(posX>HI){posX=HI;dir=-1;pause=1000;}
          if(posX<LO){posX=LO;dir=1;pause=1000;} }
        const ph=ts*0.0050*(pause>0?0.12:1);           // slow to a shuffle at turns
        const s=0.52*H/175, cy=H*0.56;
        figure(posX*W, cy, s, ph, dir);
        requestAnimationFrame(frame);
      }
      window.addEventListener("resize",size); size();
      if(reduce) figure(0.76*W, H*0.56, 0.52*H/175, 0, 1);
      else requestAnimationFrame(frame);
    });
  }
  heroWalker();

  // photographic hero: a single lab image under a navy overlay + slow ken-burns
  function heroPhotos(){
    const hero=document.querySelector(".hero[data-photo]");
    if(!hero) return;
    hero.classList.add("photo");
    const ov=document.createElement("div"); ov.className="overlay"; hero.prepend(ov);
    const kb=document.createElement("div"); kb.className="kb";
    kb.style.backgroundImage=`url(${hero.dataset.photo})`;
    hero.prepend(kb); kb.classList.add("on");
  }
  heroPhotos();
})();
