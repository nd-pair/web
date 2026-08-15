// Shared chrome: nav + footer injection, active link, scroll-reveal, mobile menu.
(function(){
  // ---- soft password gate (SHA-256 of "pair@nd"; data is public, not real security) ----
  const PW_HASH = "7481995bf6b9ebdd5defda06e5d81290fe7dd29ae422ee1b8e0104c95296eb10";
  if(sessionStorage.getItem("nd_pair_site")!=="1"){
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
        sessionStorage.setItem("nd_pair_site","1"); gate.remove(); document.documentElement.style.overflow="";
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
