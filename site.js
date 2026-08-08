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
          <small>Bringing robotics to the problems that matter, at the University of Notre Dame.</small>
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
})();
