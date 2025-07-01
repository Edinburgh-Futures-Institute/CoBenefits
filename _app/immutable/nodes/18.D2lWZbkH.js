import{s as J,e as g,a as x,H as N,F as P,c as b,p as M,f as m,g as y,b as j,A as k,r as F,q as S,h as A,i as w,y as L,G as B,B as D}from"../chunks/scheduler.CM2kgFFE.js";import{S as O,i as R,c as E,b as H,m as T,t as W,a as q,d as I}from"../chunks/index.BdkIKoLm.js";import{g as z}from"../chunks/globals.D0QH3NT1.js";import{b as v}from"../chunks/paths.B5miYNVp.js";import{N as G}from"../chunks/NavigationBar.DNSgr204.js";import{F as V}from"../chunks/Footer.DfO87FEo.js";const{document:C}=z;function K(h){let i,f=`window.MathJax = {
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
  `,a,p="",_,c,l,u,s,d,r,n,o;return l=new G({}),n=new V({}),{c(){i=g("script"),i.textContent=f,a=g("script"),a.innerHTML=p,c=x(),E(l.$$.fragment),u=x(),s=g("div"),d=new N(!1),r=x(),E(n.$$.fragment),this.h()},l(t){const e=P("svelte-sp5bra",C.head);i=b(e,"SCRIPT",{"data-svelte-h":!0}),M(i)!=="svelte-1wdi56k"&&(i.textContent=f),a=b(e,"SCRIPT",{src:!0,"data-svelte-h":!0}),M(a)!=="svelte-1jz3o7s"&&(a.innerHTML=p),e.forEach(m),c=y(t),H(l.$$.fragment,t),u=y(t),s=b(t,"DIV",{class:!0});var $=j(s);d=k($,!1),$.forEach(m),r=y(t),H(n.$$.fragment,t),this.h()},h(){F(a.src,_="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js")||S(a,"src",_),d.a=null,S(s,"class","pandoc-html")},m(t,e){A(C.head,i),A(C.head,a),w(t,c,e),T(l,t,e),w(t,u,e),w(t,s,e),d.m(h[0],s),h[2](s),w(t,r,e),T(n,t,e),o=!0},p(t,[e]){(!o||e&1)&&d.p(t[0])},i(t){o||(W(l.$$.fragment,t),W(n.$$.fragment,t),o=!0)},o(t){q(l.$$.fragment,t),q(n.$$.fragment,t),o=!1},d(t){t&&(m(c),m(u),m(s),m(r)),m(i),m(a),I(l,t),h[2](null),I(n,t)}}}function Q(h,i,f){let a="",p;L(async()=>{const l=await(await fetch(`${v}/methods-doc.html`)).text(),s=new DOMParser().parseFromString(l,"text/html");s.querySelectorAll("img[src]").forEach(r=>{const n=r.getAttribute("src");n&&!n.startsWith("http://")&&!n.startsWith("https://")&&!n.startsWith("//")&&!n.startsWith(v)&&!n.startsWith("/")&&r.setAttribute("src",`${v}/${n}`)}),Array.from(s.querySelectorAll("h3")).forEach((r,n)=>{const o=document.createElement("details");n===0&&o.setAttribute("open","");const t=document.createElement("summary");t.textContent=r.textContent||"",o.appendChild(t);let e=r.nextElementSibling;for(;e&&e.tagName!=="H3"&&!(e.tagName==="SECTION"&&e.id==="footnotes");){const $=e.nextElementSibling;o.appendChild(e),e=$}r.replaceWith(o)}),f(0,a=s.body.innerHTML),await B(),window.MathJax&&typeof window.MathJax.startup?.promise?.then=="function"&&(await window.MathJax.startup.promise,await window.MathJax.typesetPromise([p]))});function _(c){D[c?"unshift":"push"](()=>{p=c,f(1,p)})}return[a,p,_]}class nt extends O{constructor(i){super(),R(this,i,Q,K,J,{})}}export{nt as component};
