import{S as L,i as N,s as j,d as p,v as M,o as E,p as S,c as A,b as $,w as T,H as P,x as H,J as q,e as g,z as W,h as x,y as k,f as B,K as O,j as y,k as b,A as I,L as D,B as F,M as z,G as R}from"../chunks/vqp9XDtz.js";import{g as G}from"../chunks/D0QH3NT1.js";import"../chunks/IHki7fMi.js";import{b as v}from"../chunks/5PUMWepz.js";import{N as K}from"../chunks/81iL96uD.js";import{p as J}from"../chunks/BOd594CG.js";import{F as V}from"../chunks/CE76q_-h.js";const{document:C}=G;function Q(h){let o,f=`window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
        displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
      },
      chtml: {
        displayAlign: 'left',
        displayIndent: '0em',
        linebreaks: { automatic: true }
      },
      options: {
        renderActions: {
          addMenu: [] // disable context menu
        }
      }
    };
  `,s,c="",_,m,l,u,r,d,a,e,i;return l=new K({}),e=new V({}),{c(){o=y("script"),o.textContent=f,s=y("script"),s.innerHTML=c,m=b(),I(l.$$.fragment),u=b(),r=y("div"),d=new D(!1),a=b(),I(e.$$.fragment),this.h()},l(t){const n=q("svelte-sp5bra",C.head);o=g(n,"SCRIPT",{"data-svelte-h":!0}),W(o)!=="svelte-1wdi56k"&&(o.textContent=f),s=g(n,"SCRIPT",{src:!0,"data-svelte-h":!0}),W(s)!=="svelte-1jz3o7s"&&(s.innerHTML=c),n.forEach(p),m=x(t),k(l.$$.fragment,t),u=x(t),r=g(t,"DIV",{class:!0});var w=B(r);d=O(w,!1),w.forEach(p),a=x(t),k(e.$$.fragment,t),this.h()},h(){P(s.src,_="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js")||H(s,"src",_),d.a=null,H(r,"class","pandoc-html")},m(t,n){A(C.head,o),A(C.head,s),$(t,m,n),T(l,t,n),$(t,u,n),$(t,r,n),d.m(h[0],r),h[2](r),$(t,a,n),T(e,t,n),i=!0},p(t,[n]){(!i||n&1)&&d.p(t[0])},i(t){i||(S(l.$$.fragment,t),S(e.$$.fragment,t),i=!0)},o(t){E(l.$$.fragment,t),E(e.$$.fragment,t),i=!1},d(t){t&&(p(m),p(u),p(r),p(a)),p(o),p(s),M(l,t),h[2](null),M(e,t)}}}function U(h,o,f){let s="",c;F(async()=>{const l=await(await fetch(`${v}/methods-doc.html`)).text(),r=new DOMParser().parseFromString(l,"text/html");r.querySelectorAll("img[src]").forEach(a=>{const e=a.getAttribute("src");e&&!e.startsWith("http://")&&!e.startsWith("https://")&&!e.startsWith("//")&&!e.startsWith(v)&&!e.startsWith("/")&&a.setAttribute("src",`${v}/${e}`)}),Array.from(r.querySelectorAll("h3")).forEach((a,e)=>{const i=document.createElement("details");e===0&&i.setAttribute("open","");const t=document.createElement("summary");t.textContent=a.textContent||"",i.appendChild(t);let n=a.nextElementSibling;for(;n&&n.tagName!=="H3"&&!(n.tagName==="SECTION"&&n.id==="footnotes");){const w=n.nextElementSibling;i.appendChild(n),n=w}a.replaceWith(i)}),f(0,s=r.body.innerHTML),await z(),c.addEventListener("click",function(a){const e=a.target.closest("summary");if(e&&e.parentElement.tagName==="DETAILS"){const i=e.parentElement,t=e.textContent?.trim()||"";!i.open?J.capture("section opened",{section_name:t}):J.capture("section closed",{section_name:t})}}),window.MathJax&&typeof window.MathJax.startup?.promise?.then=="function"&&(await window.MathJax.startup.promise,await window.MathJax.typesetPromise([c]))});function _(m){R[m?"unshift":"push"](()=>{c=m,f(1,c)})}return[s,c,_]}class st extends L{constructor(o){super(),N(this,o,U,Q,j,{})}}export{st as component};
