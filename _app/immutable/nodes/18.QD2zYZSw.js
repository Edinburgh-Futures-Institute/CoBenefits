import{s as E,e as w,a as $,H,F as T,c as g,p as v,f as m,g as C,b as W,A as q,r as I,q as M,h as S,i as x,y as J,G as N,B as P}from"../chunks/scheduler.CM2kgFFE.js";import{S as j,i as k,c as L,b as B,m as D,t as F,a as O,d as R}from"../chunks/index.BdkIKoLm.js";import{g as z}from"../chunks/globals.D0QH3NT1.js";import{b}from"../chunks/paths.DCupILFy.js";import{N as G}from"../chunks/NavigationBar.RMTwuz63.js";const{document:y}=z;function V(d){let r,h=`window.MathJax = {\r
      tex: {\r
        inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],\r
        displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]\r
      },\r
      chtml: {\r
        displayAlign: 'left',\r
        displayIndent: '0em',\r
        linebreaks: { automatic: true }\r
      },\r
      options: {\r
        renderActions: {\r
          addMenu: [] // disable context menu\r
        }\r
      }\r
    };\r
  `,n,l="",_,o,i,u,a,p,s;return i=new G({}),{c(){r=w("script"),r.textContent=h,n=w("script"),n.innerHTML=l,o=$(),L(i.$$.fragment),u=$(),a=w("div"),p=new H(!1),this.h()},l(t){const e=T("svelte-sp5bra",y.head);r=g(e,"SCRIPT",{"data-svelte-h":!0}),v(r)!=="svelte-1wdi56k"&&(r.textContent=h),n=g(e,"SCRIPT",{src:!0,"data-svelte-h":!0}),v(n)!=="svelte-1jz3o7s"&&(n.innerHTML=l),e.forEach(m),o=C(t),B(i.$$.fragment,t),u=C(t),a=g(t,"DIV",{class:!0});var f=W(a);p=q(f,!1),f.forEach(m),this.h()},h(){I(n.src,_="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js")||M(n,"src",_),p.a=null,M(a,"class","pandoc-html")},m(t,e){S(y.head,r),S(y.head,n),x(t,o,e),D(i,t,e),x(t,u,e),x(t,a,e),p.m(d[0],a),d[2](a),s=!0},p(t,[e]){(!s||e&1)&&p.p(t[0])},i(t){s||(F(i.$$.fragment,t),s=!0)},o(t){O(i.$$.fragment,t),s=!1},d(t){t&&(m(o),m(u),m(a)),m(r),m(n),R(i,t),d[2](null)}}}function K(d,r,h){let n="",l;J(async()=>{const i=await(await fetch(`${b}/methods-doc.html`)).text(),a=new DOMParser().parseFromString(i,"text/html");a.querySelectorAll("img[src]").forEach(s=>{const t=s.getAttribute("src");t&&!t.startsWith("http://")&&!t.startsWith("https://")&&!t.startsWith("//")&&!t.startsWith(b)&&!t.startsWith("/")&&s.setAttribute("src",`${b}/${t}`)}),Array.from(a.querySelectorAll("h3")).forEach((s,t)=>{const e=document.createElement("details");t===0&&e.setAttribute("open","");const f=document.createElement("summary");f.textContent=s.textContent||"",e.appendChild(f);let c=s.nextElementSibling;for(;c&&c.tagName!=="H3"&&!(c.tagName==="SECTION"&&c.id==="footnotes");){const A=c.nextElementSibling;e.appendChild(c),c=A}s.replaceWith(e)}),h(0,n=a.body.innerHTML),await N(),window.MathJax&&typeof window.MathJax.startup?.promise?.then=="function"&&(await window.MathJax.startup.promise,await window.MathJax.typesetPromise([l]))});function _(o){P[o?"unshift":"push"](()=>{l=o,h(1,l)})}return[n,l,_]}class tt extends j{constructor(r){super(),k(this,r,K,V,E,{})}}export{tt as component};
