import{s as k,e as g,a as x,H as q,L as J,c as b,p as M,f as p,g as y,b as P,B as j,K as B,q as E,h as S,i as w,v as O,M as D,C as F}from"../chunks/scheduler.CpIhDC54.js";import{S as R,i as z,c as A,b as T,m as H,t as W,a as I,d as L}from"../chunks/index.B2rtClCL.js";import{g as K}from"../chunks/globals.D0QH3NT1.js";import{b as C}from"../chunks/paths.BEaxu4dJ.js";import{N as V}from"../chunks/NavigationBar.CLzVc20u.js";import{C as N}from"../chunks/module.Dwu5nY3-.js";import{F as G}from"../chunks/Footer.D2GcialB.js";const{document:v}=K;function Q(f){let o,h=`window.MathJax = {
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
  `,s,c="",_,m,l,u,r,d,a,e,i;return l=new V({}),e=new G({}),{c(){o=g("script"),o.textContent=h,s=g("script"),s.innerHTML=c,m=x(),A(l.$$.fragment),u=x(),r=g("div"),d=new q(!1),a=x(),A(e.$$.fragment),this.h()},l(t){const n=J("svelte-sp5bra",v.head);o=b(n,"SCRIPT",{"data-svelte-h":!0}),M(o)!=="svelte-1wdi56k"&&(o.textContent=h),s=b(n,"SCRIPT",{src:!0,"data-svelte-h":!0}),M(s)!=="svelte-1jz3o7s"&&(s.innerHTML=c),n.forEach(p),m=y(t),T(l.$$.fragment,t),u=y(t),r=b(t,"DIV",{class:!0});var $=P(r);d=j($,!1),$.forEach(p),a=y(t),T(e.$$.fragment,t),this.h()},h(){B(s.src,_="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js")||E(s,"src",_),d.a=null,E(r,"class","pandoc-html")},m(t,n){S(v.head,o),S(v.head,s),w(t,m,n),H(l,t,n),w(t,u,n),w(t,r,n),d.m(f[0],r),f[2](r),w(t,a,n),H(e,t,n),i=!0},p(t,[n]){(!i||n&1)&&d.p(t[0])},i(t){i||(W(l.$$.fragment,t),W(e.$$.fragment,t),i=!0)},o(t){I(l.$$.fragment,t),I(e.$$.fragment,t),i=!1},d(t){t&&(p(m),p(u),p(r),p(a)),p(o),p(s),L(l,t),f[2](null),L(e,t)}}}function U(f,o,h){let s="",c;O(async()=>{const l=await(await fetch(`${C}/methods-doc.html`)).text(),r=new DOMParser().parseFromString(l,"text/html");r.querySelectorAll("img[src]").forEach(a=>{const e=a.getAttribute("src");e&&!e.startsWith("http://")&&!e.startsWith("https://")&&!e.startsWith("//")&&!e.startsWith(C)&&!e.startsWith("/")&&a.setAttribute("src",`${C}/${e}`)}),Array.from(r.querySelectorAll("h3")).forEach((a,e)=>{const i=document.createElement("details");e===0&&i.setAttribute("open","");const t=document.createElement("summary");t.textContent=a.textContent||"",i.appendChild(t);let n=a.nextElementSibling;for(;n&&n.tagName!=="H3"&&!(n.tagName==="SECTION"&&n.id==="footnotes");){const $=n.nextElementSibling;i.appendChild(n),n=$}a.replaceWith(i)}),h(0,s=r.body.innerHTML),await D(),c.addEventListener("click",function(a){const e=a.target.closest("summary");if(e&&e.parentElement.tagName==="DETAILS"){const i=e.parentElement,t=e.textContent?.trim()||"";!i.open?N.capture("section opened",{section_name:t}):N.capture("section closed",{section_name:t})}}),window.MathJax&&typeof window.MathJax.startup?.promise?.then=="function"&&(await window.MathJax.startup.promise,await window.MathJax.typesetPromise([c]))});function _(m){F[m?"unshift":"push"](()=>{c=m,h(1,c)})}return[s,c,_]}class st extends R{constructor(o){super(),z(this,o,U,Q,k,{})}}export{st as component};
