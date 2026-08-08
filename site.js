// Shared chrome: nav + footer injection, active link, scroll-reveal, mobile menu.
(function(){
  // ---- soft password gate (SHA-256 of "pair@nd"; data is public, not real security) ----
  const PW_HASH = "7481995bf6b9ebdd5defda06e5d81290fe7dd29ae422ee1b8e0104c95296eb10";
  if(sessionStorage.getItem("nd_pair_auth")!=="1"){
    document.documentElement.style.overflow="hidden";
    const gate=document.createElement("div"); gate.id="gate";
    gate.innerHTML=
      `<form id="gateForm">
        <img class="glogo" src="assets/pair-logo.png" alt="" />
        <h1>Physical <span>AI</span> and Robotics Initiative</h1>
        <p>Internal preview — please enter the access password.</p>
        <input type="password" id="gatePw" autocomplete="current-password" autofocus />
        <button type="submit">Enter</button>
        <div id="gateErr"></div>
        <div class="gnote">For ND PAIR members. This is a soft gate — the underlying data is public.</div>
      </form>`;
    (document.body||document.documentElement).appendChild(gate);
    const sha256=async s=>{ const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
      return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join(""); };
    gate.querySelector("#gateForm").addEventListener("submit", async e=>{
      e.preventDefault();
      if(await sha256(document.getElementById("gatePw").value)===PW_HASH){
        sessionStorage.setItem("nd_pair_auth","1"); gate.remove(); document.documentElement.style.overflow="";
      } else document.getElementById("gateErr").textContent="Incorrect password.";
    });
    setTimeout(()=>{ const i=document.getElementById("gatePw"); if(i) i.focus(); },30);
  }

  const PAGES = [
    ["index.html","Home"],
    ["laboratories.html","Laboratories"],
    ["people.html","People"],
    ["publications.html","Publications"],
    ["internal.html","Internal"],
  ];
  const fav=document.createElement("link"); fav.rel="icon"; fav.type="image/png"; fav.href="assets/pair-logo.png"; document.head.appendChild(fav);
  const here = (location.pathname.split("/").pop() || "index.html");
  const navEl = document.getElementById("site-nav");
  if(navEl){
    navEl.className = "nav";
    navEl.innerHTML =
      `<div class="wrap">
        <a class="brand" href="index.html"><img class="logo" src="assets/pair-logo.png" alt="PAIR logo">Physical <span class="at">AI</span> and Robotics Initiative</a>
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
          <div class="brand"><img class="logo" src="assets/pair-logo.png" alt="PAIR logo">Physical <span style="color:#e5b93d">AI</span> and Robotics Initiative</div>
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
      if(hero.hasAttribute("data-photo")) return;   // skip the front-page photo hero
      const cv=document.createElement("canvas"); cv.className="fx"; hero.prepend(cv);
      const ctx=cv.getContext("2d"); let W,H,dpr,last=0;
      let posX=0.5, dir=1, pause=0;
      function size(){
        dpr=Math.min(2,window.devicePixelRatio||1);
        W=cv.width=hero.clientWidth*dpr; H=cv.height=hero.clientHeight*dpr;
        cv.style.width=hero.clientWidth+"px"; cv.style.height=hero.clientHeight+"px";
      }
      // schematic humanoid-robot proportions (local units, ~180 tall)
      const TORSO=56, NECK=6, THIGH=44, SHANK=40, UARM=30, FARM=24;
      const seg=(x,y,a,l)=>[x+Math.sin(a)*l, y+Math.cos(a)*l]; // a measured from +Y (down)
      const BODY="rgba(156,192,232,0.62)", FAR="rgba(156,192,232,0.30)",
            DARK="rgba(70,110,162,0.75)", LINE="rgba(198,222,248,0.5)";
      function figure(cx,cy,s,ph,face){
        ctx.save(); ctx.translate(cx,cy); ctx.scale(face*s,s); ctx.translate(0,-4*Math.abs(Math.sin(ph)));
        ctx.lineCap="round"; ctx.lineJoin="round";
        const sh=[1,-TORSO], hip=[0,0];
        const cap=(a,b,w,c)=>{ ctx.strokeStyle=c; ctx.lineWidth=w; ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke(); };
        const joint=(p,r,c)=>{ ctx.fillStyle=c; ctx.beginPath();ctx.arc(p[0],p[1],r,0,6.2832);ctx.fill(); ctx.lineWidth=1.1;ctx.strokeStyle=DARK;ctx.stroke(); };
        function rrect(cx2,cy2,w,h,rad,rot,c){ ctx.save(); ctx.translate(cx2,cy2); ctx.rotate(rot);
          const x=-w/2,y=-h/2; ctx.beginPath(); ctx.moveTo(x+rad,y);
          ctx.arcTo(x+w,y,x+w,y+h,rad); ctx.arcTo(x+w,y+h,x,y+h,rad);
          ctx.arcTo(x,y+h,x,y,rad); ctx.arcTo(x,y,x+w,y,rad); ctx.closePath();
          ctx.fillStyle=c; ctx.fill(); ctx.lineWidth=1.1; ctx.strokeStyle=DARK; ctx.stroke(); ctx.restore(); }
        function leg(p,c,jr){
          const th=0.5*Math.sin(p), kb=1.0*Math.max(0,Math.sin(p+0.35));
          const k=seg(hip[0],hip[1],th,THIGH), aA=th-kb, an=seg(k[0],k[1],aA,SHANK);
          cap(hip,k,15,c); cap(k,an,11,c);                       // thigh, shank
          cap([an[0]-6,an[1]+2],[an[0]+19,an[1]+4],8,c);         // flat foot
          joint(hip,8,c); joint(k,7,c); joint(an,5,c);           // hip, knee, ankle actuators
        }
        function arm(p,c,jr){
          const sa=0.42*Math.sin(p), eb=0.4+0.3*Math.max(0,Math.sin(p+0.5));
          // forearm folds FORWARD (in the walking direction); reverses with facing
          const e=seg(sh[0],sh[1],sa,UARM), h=seg(e[0],e[1],sa+eb,FARM);
          cap(sh,e,10,c); cap(e,h,8,c);
          joint(sh,7,c); joint(e,5,c); joint(h,4,c);             // shoulder, elbow, gripper
        }
        // far side first (depth), then body, then near side
        leg(ph+Math.PI, FAR); arm(ph, FAR);
        rrect(0,3,30,16,5,0,BODY);                               // pelvis block
        rrect(2,-TORSO*0.58,27,TORSO*0.82,7,0.05,BODY);          // chest, slight lean
        cap([-8,-TORSO*0.5],[10,-TORSO*0.5],2,LINE);             // chest detail line
        rrect(2,-TORSO-NECK-9,18,20,6,0.03,BODY);                // head
        ctx.save(); ctx.translate(2,-TORSO-NECK-11); ctx.rotate(0.03);
        ctx.fillStyle=DARK; ctx.beginPath(); ctx.rect(-8,-2.5,16,5); ctx.fill(); ctx.restore();  // visor
        leg(ph, BODY); arm(ph+Math.PI, BODY);
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
