// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Narrow, auditable goal/format checks. This is not a complete semantic parser.
const withoutData = text => text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`|[“「『][^”」』\n]*[”」』]|"[^"\n]*"/gu, span => ' '.repeat(span.length));
const goalKinds = [
  { id:'clarity', source:'清楚|清晰|明白|易懂', candidate:/清楚|清晰|明白|易懂|容易理解|便于理解|一目了然|\bclear(?:er)?\b|\bclarity\b|easy to understand|easier to understand/iu },
  { id:'readability', source:'易读|可读', candidate:/易读|可读|便于阅读|容易阅读|readab/iu },
  { id:'ease-of-use', source:'易用|好用|易操作', candidate:/易用|好用|易操作|容易操作|便于使用|易于使用|usable|usability|easier to use/iu },
  { id:'speed', source:'快|流畅', candidate:/更快|加快|提速|速度|流畅|效率|\bfast(?:er)?\b|\bspeed\b|\bsmooth/iu }
];
const normalizeSubject = text => text.toLowerCase().replace(/^(?:这个|那个|现有的?|当前的?|已有的?|the\s+|this\s+|current\s+)/iu, '').replace(/页面/gu,'页').replace(/[\s的]+/gu,'').trim();
export function explicitGoals(text) {
  const prose = withoutData(text), goals = [];
  for (const kind of goalKinds) {
    const pattern = new RegExp('(?:把|将)([^，。；！？\\n]{1,32}?)(?:改得|变得|做得|调整得|设计得|优化得)(?:更加?|更为)?(' + kind.source + ')|(?:让|使)([^，。；！？\\n]{1,32}?)(?:变得|变|更加|更为|更)(' + kind.source + ')', 'gu');
    for (const match of prose.matchAll(pattern)) {
      const subject = (match[1] ?? match[3]).trim();
      if (subject) goals.push({ subject, property:kind.id, evidence:match[0] });
    }
  }
  for (const match of prose.matchAll(/\bmake\s+(?:the\s+)?([^.!?;\n]{1,50}?)\s+(clearer|more readable|easier to use)\b/giu)) {
    goals.push({ subject:match[1], property:match[2].toLowerCase()==='clearer'?'clarity':match[2].toLowerCase()==='more readable'?'readability':'ease-of-use', evidence:match[0] });
  }
  return goals.filter((goal,index) => goals.findIndex(g => normalizeSubject(g.subject)===normalizeSubject(goal.subject) && g.property===goal.property)===index);
}
function goalPresent(goal, candidate) {
  const subject = normalizeSubject(goal.subject), kind = goalKinds.find(k => k.id === goal.property);
  return withoutData(candidate).split(/[。；!?！？\n]|\.(?:\s|$)/u).some(segment => normalizeSubject(segment).includes(subject) && kind.candidate.test(segment));
}
const formatPatterns = [
  ['one-paragraph', /(?:\b(?:one|single|a)\s+(?:(?:short|concise|brief)\s+)?paragraph\b|(?:一|1|单)(?:个)?(?:简短|简洁)?段(?:落|话)?)/iu],
  ['JSON', /\bjson\b/iu], ['Markdown', /\bmarkdown\b/iu],
  ['bullets', /\bbullet(?:ed)?\s+(?:list|points?)\b|项目符号|无序列表/iu],
  ['table', /\btable\b|表格/iu], ['headings', /\bheadings?\b|分级标题|小标题/iu]
];
function formatKinds(text, directed) {
  const prose = withoutData(text), found = new Set();
  for (const segment of prose.split(/[。!?！？\n;；]/u)) {
    for (const [kind, pattern] of formatPatterns) {
      const occurrence = segment.match(pattern); if (!occurrence) continue;
      // Looking at a JSON input or reviewing a table is not a request to output
      // JSON/a table. Count only explicit presentation directives in candidates.
      const prefix = segment.slice(0, occurrence.index);
      if (directed && !/(?:\b(?:return|respond|answer|output|write|give|deliver|format|present|render|provide)\b[^,;.!?]{0,70}$|\b(?:use|keep)\s+(?:(?:it|the (?:answer|response|output))\s+)?(?:in |as |only |a |one )?$|(?:返回|输出|写成|分成|整理成|排成|请用|仅用|只用|以|用|采用|控制在)[^，。；！？]{0,30}$)/iu.test(prefix)) continue;
      found.add(kind);
    }
  }
  return found;
}
export function intentIssues(original, candidate) {
  const issues = [];
  for (const goal of explicitGoals(original)) if (!goalPresent(goal, candidate)) issues.push({ kind:'omission', detail:`Preserve the explicit ${goal.property} outcome for ${goal.subject}: ${goal.evidence}` });
  const originalFormats = formatKinds(original, false);
  for (const format of formatKinds(candidate, true)) if (!originalFormats.has(format)) issues.push({ kind:'invention', detail:`Remove the new downstream output-format requirement (${format}); the editor's own layout is not a user requirement.` });
  return issues;
}
