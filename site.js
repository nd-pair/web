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

  // animated "physical-AI network" in each hero — drifting nodes + links
  function heroFX(){
    if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelectorAll(".hero").forEach(hero=>{
      const cv=document.createElement("canvas"); cv.className="fx"; hero.prepend(cv);
      const ctx=cv.getContext("2d"); let W,H,dpr,parts;
      function init(){
        const n=Math.max(24,Math.min(70,Math.round(hero.clientWidth/22)));
        parts=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,
          vx:(Math.random()-.5)*.18*dpr,vy:(Math.random()-.5)*.18*dpr,r:(Math.random()*1.6+1)*dpr}));
      }
      function size(){
        dpr=Math.min(2,window.devicePixelRatio||1);
        W=cv.width=hero.clientWidth*dpr; H=cv.height=hero.clientHeight*dpr;
        cv.style.width=hero.clientWidth+"px"; cv.style.height=hero.clientHeight+"px"; init();
      }
      function frame(){
        ctx.clearRect(0,0,W,H);
        for(const p of parts){ p.x+=p.vx; p.y+=p.vy;
          if(p.x<0)p.x+=W; if(p.x>W)p.x-=W; if(p.y<0)p.y+=H; if(p.y>H)p.y-=H; }
        const max=145*dpr;
        for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
          const a=parts[i],b=parts[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
          if(d<max){ ctx.globalAlpha=(1-d/max)*.30; ctx.strokeStyle="#c99700"; ctx.lineWidth=dpr;
            ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke(); }
        }
        ctx.globalAlpha=1;
        for(const p of parts){ ctx.fillStyle="rgba(229,185,61,.85)";
          ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.2832);ctx.fill(); }
        requestAnimationFrame(frame);
      }
      window.addEventListener("resize",size); size(); frame();
    });
  }
  heroFX();

  // photographic hero: cross-fade lab images with a slow ken-burns zoom
  function heroPhotos(){
    const hero=document.querySelector(".hero[data-photos]");
    if(!hero) return;
    fetch("data/gallery.json").then(r=>r.json()).then(imgs=>{
      if(!imgs.length) return;
      hero.classList.add("photo");
      const ov=document.createElement("div"); ov.className="overlay"; hero.prepend(ov);
      const a=document.createElement("div"), b=document.createElement("div");
      a.className="kb"; b.className="kb"; hero.prepend(b); hero.prepend(a);
      let i=0, cur=a, nxt=b;
      const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
      cur.style.backgroundImage=`url(${imgs[0].src})`; cur.classList.add("on");
      if(reduce||imgs.length<2) return;
      setInterval(()=>{
        i=(i+1)%imgs.length;
        nxt.style.backgroundImage=`url(${imgs[i].src})`;
        nxt.classList.add("on"); cur.classList.remove("on");
        [cur,nxt]=[nxt,cur];
      }, 6000);
    }).catch(()=>{});
  }
  heroPhotos();
})();
