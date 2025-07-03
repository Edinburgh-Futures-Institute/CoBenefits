import{s as q,e as g,a as x,H as J,F as L,c as y,p as E,f as p,g as b,b as P,A as j,r as B,q as M,h as S,i as w,y as F,G as O,B as D}from"../chunks/scheduler.Uo5vrMzy.js";import{S as R,i as z,c as A,b as T,m as H,t as W,a as I,d as N}from"../chunks/index.CfagcI6h.js";import{g as G}from"../chunks/globals.D0QH3NT1.js";import{b as v}from"../chunks/paths.CdjCCJb3.js";import{N as V}from"../chunks/NavigationBar.C9JJ_Rev.js";import{f as k}from"../chunks/module.jBGXnV9S.js";import{F as K}from"../chunks/Footer.B3lFN2nd.js";const{document:C}=G;function Q(f){let o,h=`window.MathJax = {
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
  `,s,c="",_,m,l,u,r,d,a,e,i;return l=new V({}),e=new K({}),{c(){o=g("script"),o.textContent=h,s=g("script"),s.innerHTML=c,m=x(),A(l.$$.fragment),u=x(),r=g("div"),d=new J(!1),a=x(),A(e.$$.fragment),this.h()},l(t){const n=L("svelte-sp5bra",C.head);o=y(n,"SCRIPT",{"data-svelte-h":!0}),E(o)!=="svelte-1wdi56k"&&(o.textContent=h),s=y(n,"SCRIPT",{src:!0,"data-svelte-h":!0}),E(s)!=="svelte-1jz3o7s"&&(s.innerHTML=c),n.forEach(p),m=b(t),T(l.$$.fragment,t),u=b(t),r=y(t,"DIV",{class:!0});var $=P(r);d=j($,!1),$.forEach(p),a=b(t),T(e.$$.fragment,t),this.h()},h(){B(s.src,_="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js")||M(s,"src",_),d.a=null,M(r,"class","pandoc-html")},m(t,n){S(C.head,o),S(C.head,s),w(t,m,n),H(l,t,n),w(t,u,n),w(t,r,n),d.m(f[0],r),f[2](r),w(t,a,n),H(e,t,n),i=!0},p(t,[n]){(!i||n&1)&&d.p(t[0])},i(t){i||(W(l.$$.fragment,t),W(e.$$.fragment,t),i=!0)},o(t){I(l.$$.fragment,t),I(e.$$.fragment,t),i=!1},d(t){t&&(p(m),p(u),p(r),p(a)),p(o),p(s),N(l,t),f[2](null),N(e,t)}}}function U(f,o,h){let s="",c;F(async()=>{const l=await(await fetch(`${v}/methods-doc.html`)).text(),r=new DOMParser().parseFromString(l,"text/html");r.querySelectorAll("img[src]").forEach(a=>{const e=a.getAttribute("src");e&&!e.startsWith("http://")&&!e.startsWith("https://")&&!e.startsWith("//")&&!e.startsWith(v)&&!e.startsWith("/")&&a.setAttribute("src",`${v}/${e}`)}),Array.from(r.querySelectorAll("h3")).forEach((a,e)=>{const i=document.createElement("details");e===0&&i.setAttribute("open","");const t=document.createElement("summary");t.textContent=a.textContent||"",i.appendChild(t);let n=a.nextElementSibling;for(;n&&n.tagName!=="H3"&&!(n.tagName==="SECTION"&&n.id==="footnotes");){const $=n.nextElementSibling;i.appendChild(n),n=$}a.replaceWith(i)}),h(0,s=r.body.innerHTML),await O(),c.addEventListener("click",function(a){const e=a.target.closest("summary");if(e&&e.parentElement.tagName==="DETAILS"){const i=e.parentElement,t=e.textContent?.trim()||"";!i.open?k.capture("section opened",{section_name:t}):k.capture("section closed",{section_name:t})}}),window.MathJax&&typeof window.MathJax.startup?.promise?.then=="function"&&(await window.MathJax.startup.promise,await window.MathJax.typesetPromise([c]))});function _(m){D[m?"unshift":"push"](()=>{c=m,h(1,c)})}return[s,c,_]}class st extends R{constructor(o){super(),z(this,o,U,Q,q,{})}}export{st as component};
