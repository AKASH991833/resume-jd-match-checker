'use strict';
(function(){
var $=function(s){return document.querySelector(s)};
function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('show')},2000)}
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
var TERMS=[],seen={};
Object.keys(window.SKILLS).forEach(function(g){window.SKILLS[g].forEach(function(e){var al=e.split('|'),canon=al[0];if(seen[canon])return;seen[canon]=1;
  var alts=al.slice().sort(function(a,b){return b.length-a.length}).map(esc).map(function(a){return a.replace(/\\ /g,'\\s+')});
  TERMS.push({c:canon,g:g,re:new RegExp('(?<![a-z0-9+#.])(?:'+alts.join('|')+')(?![a-z0-9+#]|\\.[a-z0-9])','gi')})})});
function count(re,text){re.lastIndex=0;var n=0,m;while((m=re.exec(text))){n++;if(m[0].length===0)re.lastIndex++}return n}
function modeOf(line,cur){var l=line.toLowerCase();
  if(/(preferred|nice to have|good to have|bonus|desirable|an advantage|added advantage)/.test(l)&&l.length<80)return 'pref';
  if(/(required|requirements|must have|mandatory|qualifications|what you.ll need|what we.re looking for|you have)/.test(l)&&l.length<80)return 'req';
  if(/(responsibilit|about the|about us|benefits|what you.ll do|we offer|job description|overview)/.test(l)&&l.length<80)return 'neu';return cur}
function analyseJD(jd){
  var lines=jd.split(/\n/),mode='neu',hits={};
  lines.forEach(function(line){mode=modeOf(line,mode);var lm=mode;if(/\b(is a plus|are a plus|a plus|nice to have|preferred)\b/i.test(line)&&line.length>25)lm='pref';
    TERMS.forEach(function(t){var n=count(t.re,line);if(n){var h=hits[t.c]||(hits[t.c]={c:t.c,g:t.g,n:0,mult:0});h.n+=n;var m=lm==='req'?1.5:lm==='pref'?.6:1;if(m>h.mult)h.mult=m}})});
  return Object.keys(hits).map(function(k){var h=hits[k];h.w=(1+.5*Math.min(h.n-1,3))*h.mult;h.pref=h.mult<1;return h}).sort(function(a,b){return b.w-a.w})}
function stem(w){return w.replace(/(ing|ed|es|s)$/,'')}
function tokens(text){return (text.toLowerCase().match(/[a-z][a-z+#.\-]{2,}/g)||[]).map(function(x){return x.replace(/[.\-]+$/,'')})}
function otherTerms(jd,skillTexts,resumeSet){
  var cov=jd.toLowerCase();TERMS.forEach(function(t){cov=cov.replace(t.re,' ')});
  var tk=tokens(cov),freq={};
  tk.forEach(function(w){if(w.length<4||window.STOP.has(w)||/^\d/.test(w))return;var k=stem(w);freq[k]=freq[k]||{w:w,n:0};freq[k].n++});
  var out=Object.keys(freq).map(function(k){return {k:k,w:freq[k].w,n:freq[k].n}}).filter(function(x){return x.n>=2}).sort(function(a,b){return b.n-a.n}).slice(0,12);
  return out.map(function(x){return {c:x.w,n:x.n,found:resumeSet.has(x.k)}})}
function analyse(resume,jd){
  var rl=resume.toLowerCase(),rtok=new Set(tokens(resume).map(stem));
  var jt=analyseJD(jd);jt.forEach(function(h){var t=TERMS.filter(function(x){return x.c===h.c})[0];h.found=count(t.re,resume)>0});
  var oth=otherTerms(jd,null,rtok);
  var tw=0,mw=0;jt.forEach(function(h){tw+=h.w;if(h.found)mw+=h.w});oth.slice(0,8).forEach(function(o){tw+=.4;if(o.found)mw+=.4});
  var score=tw?Math.round(mw/tw*100):0;
  return {score:score,jt:jt,oth:oth,tw:tw}}
function health(resume){
  var words=(resume.match(/\S+/g)||[]).length,rl=resume.toLowerCase(),items=[];
  function add(ok,text,warn){items.push({ok:ok,warn:warn,t:text})}
  add(/[\w.+-]+@[\w-]+\.[\w.-]+/.test(resume),'Email address '+(/[\w.+-]+@[\w-]+\.[\w.-]+/.test(resume)?'found':'not found. Add a professional email.'));
  add(/(\+?\d[\d\s-]{8,}\d)/.test(resume),'Phone number '+(/(\+?\d[\d\s-]{8,}\d)/.test(resume)?'found':'not found. Add one number recruiters can call.'));
  var secs=[['Summary or objective',/(summary|objective|profile)/],['Skills section',/skills/],['Experience or internship',/(experience|internship|employment|work history)/],['Projects',/projects?/],['Education',/(education|academic|degree|university|college)/],['Certifications',/(certification|certificate|certified)/]];
  secs.forEach(function(s){var ok=s[1].test(rl);add(ok,s[0]+(ok?' found':' not found'),!ok&&s[0]==='Certifications')});
  add(words>=150&&words<=900,'Length: '+words+' words '+(words<150?'(short, add projects or detail)':words>900?'(long, aim for one or two pages)':'(good)'));
  var bullets=(resume.match(/^\s*[-•*▪●]/gm)||[]).length;add(bullets>=4,'Bullet points: '+bullets+(bullets>=4?'':' (use bullets for projects and jobs)'));
  var av=0;window.ACTION_VERBS.forEach(function(v){if(new RegExp('\\b'+v+'\\b','i').test(resume))av++});add(av>=4,'Action verbs used: '+av+(av>=4?'':' (start bullets with built, set up, automated, fixed...)'));
  var nums=(resume.match(/\b\d+(\.\d+)?\s*(%|\+|x|hours?|users?|tickets?|servers?|months?)/gi)||[]).length;add(nums>=2,'Numbers and results: '+nums+(nums>=2?'':' (add real numbers, like tickets solved or time saved)'));
  add(/(github\.com|linkedin\.com|portfolio)/i.test(resume),'GitHub / LinkedIn / portfolio link '+(/(github\.com|linkedin\.com|portfolio)/i.test(resume)?'found':'not found. Add your GitHub or LinkedIn.'));
  return items}
function chip(text,cls,small){var c=document.createElement('span');c.className='chip '+cls;c.textContent=text;if(small){var s=document.createElement('small');s.textContent=' x'+small;c.append(s)}return c}
function highlight(jd,res){
  var box=$('#jdview');box.replaceChildren();var ranges=[];
  TERMS.forEach(function(t){t.re.lastIndex=0;var m;while((m=t.re.exec(jd))){if(!m[0].length){t.re.lastIndex++;continue}ranges.push({s:m.index,e:m.index+m[0].length,c:t.c})}});
  ranges.sort(function(a,b){return a.s-b.s||b.e-a.e});var out=[],last=-1;ranges.forEach(function(r){if(r.s>=last){out.push(r);last=r.e}});
  var foundMap={};res.jt.forEach(function(h){foundMap[h.c]=h.found});var pos=0;
  out.forEach(function(r){if(r.s>pos)box.append(document.createTextNode(jd.slice(pos,r.s)));var m=document.createElement('mark');m.className='m '+(foundMap[r.c]?'ok':'bad');m.textContent=jd.slice(r.s,r.e);box.append(m);pos=r.e});
  if(pos<jd.length)box.append(document.createTextNode(jd.slice(pos)))}
function run(){
  var resume=$('#resume').value.trim(),jd=$('#jd').value.trim();
  if(resume.length<40){toast('Paste your resume text first');$('#resume').focus();return}
  if(jd.length<40){toast('Paste the job description first');$('#jd').focus();return}
  var r=analyse(resume,jd);
  if(!r.jt.length&&!r.oth.length){toast('No skills found in this job description. Paste the full text.');return}
  $('#out').hidden=false;
  var sc=r.score;$('#score').textContent=sc;var ring=$('#ring');ring.style.setProperty('--p',sc);ring.style.setProperty('--rc',sc>=75?'var(--ok)':sc>=55?'var(--a1)':sc>=35?'var(--warn)':'var(--bad)');
  var v=sc>=75?['Strong match','Your resume covers most of what this job asks for.']:sc>=55?['Decent match','Good base. A few missing keywords are worth adding if they are true for you.']:sc>=35?['Needs work','Several important keywords are missing. Check the red list below.']:['Low match','This job asks for a lot that your resume does not show yet.'];
  $('#verdict').textContent=v[0]+' · '+sc+'%';$('#vsub').textContent=v[1];
  var mt=r.jt.filter(function(h){return h.found}),xt=r.jt.filter(function(h){return !h.found});
  $('#mc').textContent='('+mt.length+')';$('#xc').textContent='('+xt.length+')';
  var m=$('#matched'),x=$('#missing'),o=$('#other');m.replaceChildren();x.replaceChildren();o.replaceChildren();
  mt.forEach(function(h){m.append(chip(h.c,'ok',h.n>1?h.n:0))});if(!mt.length)m.textContent='None found yet.';
  xt.forEach(function(h){x.append(chip(h.c+(h.pref?' (nice to have)':''),'bad',h.n>1?h.n:0))});if(!xt.length)x.textContent='Nothing missing from the skills list. Nice.';
  r.oth.forEach(function(w){o.append(chip(w.c,w.found?'ok':'mid',w.n))});$('#otherCard').hidden=!r.oth.length;
  var hl=health(resume),hu=$('#health');hu.replaceChildren();hl.forEach(function(i){var li=document.createElement('li'),ic=document.createElement('span');ic.className='ic';ic.textContent=i.ok?'✅':(i.warn?'➖':'⚠️');li.append(ic,document.createTextNode(i.t));hu.append(li)});
  var tips=[];var topMiss=xt.filter(function(h){return !h.pref}).slice(0,5).map(function(h){return h.c});
  if(topMiss.length)tips.push('Strongest gaps: '+topMiss.join(', ')+'. If you have used them even in a small project or lab, add one bullet that shows it. If not, learn the basics and build a small project first.');
  var pref=xt.filter(function(h){return h.pref}).slice(0,4).map(function(h){return h.c});if(pref.length)tips.push('Nice-to-have items ('+pref.join(', ')+') are optional. Do not add what you cannot talk about in an interview.');
  var yrs=jd.match(/(\d+)\s*\+?\s*(?:-\s*\d+\s*)?years?/i);if(yrs)tips.push('The job mentions '+yrs[0].trim()+'. Show internships, projects and lab work honestly with dates so a recruiter can see your time on the skill.');
  var bad=hl.filter(function(i){return !i.ok&&!i.warn});if(bad.length)tips.push('Fix the resume health items marked with a warning first. They are quick wins.');
  tips.push('Use the same words as the job where they are true (for example "Linux administration" instead of only "Linux").');
  tips.push('Keep it honest. Recruiters ask about every skill listed.');
  var tl=$('#tips');tl.replaceChildren();tips.forEach(function(t){var li=document.createElement('li');li.textContent=t;tl.append(li)});
  highlight(jd,r);$('#out').scrollIntoView({behavior:'smooth',block:'start'});
  window.__rm={last:r}}
function wc(){$('#rc').textContent=($('#resume').value.match(/\S+/g)||[]).length;$('#jc').textContent=($('#jd').value.match(/\S+/g)||[]).length}
function readFile(inp,target){var f=inp.files[0];if(!f)return;if(f.size>300000){toast('File too big. Paste the text instead.');return}var fr=new FileReader();fr.onload=function(){target.value=String(fr.result).slice(0,30000);wc()};fr.readAsText(f);inp.value=''}
$('#go').addEventListener('click',run);
$('#sample').addEventListener('click',function(){$('#resume').value=window.SAMPLE_RESUME;$('#jd').value=window.SAMPLE_JD;wc();run()});
$('#clear').addEventListener('click',function(){$('#resume').value='';$('#jd').value='';wc();$('#out').hidden=true});
$('#resume').addEventListener('input',wc);$('#jd').addEventListener('input',wc);
$('#fileR').addEventListener('change',function(e){readFile(e.target,$('#resume'))});$('#fileJ').addEventListener('change',function(e){readFile(e.target,$('#jd'))});
window.__rmapi={analyse:analyse,TERMS:TERMS};
if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0)navigator.serviceWorker.register('sw.js').catch(function(){});
})();
