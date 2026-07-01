import{s as A,d as m,b as y,i as w,B as H,p as v,D as T,c as g,q as C,g as M,e as W,E as j,h as x,j as S,H as q,r as I,F as J,A as N}from"../chunks/BevTp-kf.js";import{S as P,i as k,d as D,t as L,a as B,m as F,c as O,b as R}from"../chunks/C7e0BwVj.js";import{g as z}from"../chunks/D0QH3NT1.js";import{b}from"../chunks/BuDYK3tB.js";import{N as V}from"../chunks/DvHzCNfM.js";const{document:$}=z;function G(d){let r,h=`window.MathJax = {
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
  `,n,l="",_,o,i,u,a,p,s;return i=new V({}),{c(){r=x("script"),r.textContent=h,n=x("script"),n.innerHTML=l,o=S(),R(i.$$.fragment),u=S(),a=x("div"),p=new q(!1),this.h()},l(t){const e=T("svelte-sp5bra",$.head);r=g(e,"SCRIPT",{"data-svelte-h":!0}),C(r)!=="svelte-1wdi56k"&&(r.textContent=h),n=g(e,"SCRIPT",{src:!0,"data-svelte-h":!0}),C(n)!=="svelte-1jz3o7s"&&(n.innerHTML=l),e.forEach(m),o=M(t),O(i.$$.fragment,t),u=M(t),a=g(t,"DIV",{class:!0});var f=W(a);p=j(f,!1),f.forEach(m),this.h()},h(){H(n.src,_="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js")||v(n,"src",_),p.a=null,v(a,"class","pandoc-html")},m(t,e){y($.head,r),y($.head,n),w(t,o,e),F(i,t,e),w(t,u,e),w(t,a,e),p.m(d[0],a),d[2](a),s=!0},p(t,[e]){(!s||e&1)&&p.p(t[0])},i(t){s||(B(i.$$.fragment,t),s=!0)},o(t){L(i.$$.fragment,t),s=!1},d(t){t&&(m(o),m(u),m(a)),m(r),m(n),D(i,t),d[2](null)}}}function K(d,r,h){let n="",l;I(async()=>{const i=await(await fetch(`${b}/methods-doc.html`)).text(),a=new DOMParser().parseFromString(i,"text/html");a.querySelectorAll("img[src]").forEach(s=>{const t=s.getAttribute("src");t&&!t.startsWith("http://")&&!t.startsWith("https://")&&!t.startsWith("//")&&!t.startsWith(b)&&!t.startsWith("/")&&s.setAttribute("src",`${b}/${t}`)}),Array.from(a.querySelectorAll("h3")).forEach((s,t)=>{const e=document.createElement("details");t===0&&e.setAttribute("open","");const f=document.createElement("summary");f.textContent=s.textContent||"",e.appendChild(f);let c=s.nextElementSibling;for(;c&&c.tagName!=="H3"&&!(c.tagName==="SECTION"&&c.id==="footnotes");){const E=c.nextElementSibling;e.appendChild(c),c=E}s.replaceWith(e)}),h(0,n=a.body.innerHTML),await J(),window.MathJax&&typeof window.MathJax.startup?.promise?.then=="function"&&(await window.MathJax.startup.promise,await window.MathJax.typesetPromise([l]))});function _(o){N[o?"unshift":"push"](()=>{l=o,h(1,l)})}return[n,l,_]}class tt extends P{constructor(r){super(),k(this,r,K,G,A,{})}}export{tt as component};
