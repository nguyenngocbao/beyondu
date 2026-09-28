import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const geminiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 30_000) throw new Error('Yêu cầu quá lớn.');
  }
  return JSON.parse(raw || '{}');
}

async function askGemini(systemPrompt, userPrompt, jsonResponse = false) {
  if (!geminiKey) throw new Error('Chưa cấu hình GEMINI_API_KEY trên máy chủ.');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      ...(jsonResponse ? { generationConfig: { responseMimeType: 'application/json', temperature: 0.65 } } : {})
    })
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) throw new Error('Gemini đang bận hoặc quá tải. Hãy thử lại sau ít phút.');
    if (response.status === 401 || response.status === 403) throw new Error('Gemini API key chưa hợp lệ hoặc chưa được cấp quyền.');
    throw new Error('Yêu cầu Gemini chưa hợp lệ. Hãy kiểm tra model và cấu hình API.');
  }
  return data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim() || '';
}

async function api(req, res, url) {
  if (req.method !== 'POST' || !['/api/survey-recommendations', '/api/generate-roadmap', '/api/assistant'].includes(url.pathname)) return json(res, 404, { error: 'Không tìm thấy API.' });
  try {
    const body = await readBody(req);
    if (url.pathname === '/api/survey-recommendations') {
      const { stage, major, interests } = body;
      if (typeof stage !== 'string' || !stage.trim() || !Array.isArray(interests) || interests.length > 8) return json(res, 400, { error: 'Hãy hoàn thành hai bước khảo sát đầu tiên.' });
      const profile = { stage: stage.slice(0, 100), major: String(major || '').slice(0, 120), interests: interests.map(item => String(item).slice(0, 100)) };
      const system = 'Bạn là cố vấn hướng nghiệp Việt Nam. Từ giai đoạn học tập, ngành/lĩnh vực và tối đa ba mục tiêu của người dùng, hãy đề xuất đúng 4 nghề phù hợp, ưu tiên nghề thực tế và có thể bắt đầu học. Tạo JSON tiếng Việt đúng cấu trúc {"careers":[{"name":string,"description":string,"icon":string,"skills":[{"name":string,"currentLevel":integer}]}]}. Mỗi nghề có 4 kỹ năng thiết yếu khác nhau, sát với nghề; currentLevel là ước lượng khởi điểm 0..100, không cần chính xác tuyệt đối. Mô tả ngắn, cụ thể. Không lặp nghề, không thêm nội dung ngoài JSON.';
      const text = await askGemini(system, JSON.stringify(profile), true);
      let result;
      try { result = JSON.parse(text); } catch { throw new Error('AI chưa tạo được gợi ý nghề đúng định dạng.'); }
      if (!Array.isArray(result.careers) || result.careers.length < 2) throw new Error('AI chưa tạo đủ gợi ý nghề.');
      result.careers = result.careers.slice(0, 4).map(career => ({
        name: String(career.name || 'Nghề phù hợp').slice(0, 80),
        description: String(career.description || '').slice(0, 180),
        icon: String(career.icon || '✦').slice(0, 4),
        skills: (Array.isArray(career.skills) ? career.skills : []).slice(0, 6).map(skill => ({ name: String(skill.name || 'Kỹ năng nền tảng').slice(0, 80), currentLevel: Math.max(0, Math.min(100, Number(skill.currentLevel) || 0)) }))
      })).filter(career => career.skills.length >= 3);
      if (!result.careers.length) throw new Error('AI chưa tạo danh sách kỹ năng phù hợp.');
      return json(res, 200, result);
    }
    if (url.pathname === '/api/generate-roadmap') {
      const { name, stage, major, interests, careerGoal, targetMonths, skillLevels } = body;
      if (![name, stage, careerGoal].every(value => typeof value === 'string' && value.trim().length > 0) || !Array.isArray(skillLevels) || skillLevels.length > 12) {
        return json(res, 400, { error: 'Hãy kiểm tra lại hồ sơ và mức độ kỹ năng.' });
      }
      const safeProfile = { name: name.slice(0, 100), stage: stage.slice(0, 100), major: String(major || '').slice(0, 120), interests: (Array.isArray(interests) ? interests : []).slice(0, 8).map(x => String(x).slice(0, 80)), careerGoal: careerGoal.slice(0, 120), targetMonths: Math.max(1, Math.min(36, Number(targetMonths) || 6)), skillLevels: skillLevels.map(skill => ({ name: String(skill.name || '').slice(0, 80), level: Math.max(0, Math.min(100, Number(skill.level) || 0)) })) };
      const system = 'Bạn là cố vấn nghề nghiệp BeyondU AI. Trả lời tiếng Việt, thực tế, thân thiện, không hứa hẹn việc làm. Tạo lộ trình ngắn gọn phù hợp hồ sơ và mức kỹ năng. Trả về JSON hợp lệ đúng cấu trúc: {"summary":string,"readiness":integer 0..100,"skills":[{"name":string,"currentLevel":integer,"targetLevel":integer}],"phases":[{"title":string,"tasks":[{"title":string,"description":string,"lesson":string,"practice":string,"checkpoint":string,"skill":string,"durationMinutes":integer}]}]}. Tạo 3-5 giai đoạn, mỗi giai đoạn 1-3 nhiệm vụ. Mỗi nhiệm vụ phải có lesson là giải thích thật sự hữu ích bằng tiếng Việt (2-4 câu), practice là thao tác thực hành cụ thể người học có thể làm ngay, checkpoint là câu hỏi kiểm tra hiểu bài. Ưu tiên bước nhỏ; skill phải khớp tên trong skills.';
      const text = await askGemini(system, JSON.stringify(safeProfile), true);
      let roadmap;
      try { roadmap = JSON.parse(text); } catch { throw new Error('AI trả về lộ trình chưa đúng định dạng. Hãy thử tạo lại.'); }
      if (!Array.isArray(roadmap.skills) || !Array.isArray(roadmap.phases) || !roadmap.phases.length) throw new Error('Lộ trình AI trả về chưa đủ thông tin. Hãy thử tạo lại.');
      roadmap.skills = roadmap.skills.slice(0, 12).map(s => ({ name: String(s.name || '').slice(0, 80), currentLevel: Math.max(0, Math.min(100, Number(s.currentLevel) || 0)), targetLevel: Math.max(1, Math.min(100, Number(s.targetLevel) || 70)) }));
      roadmap.phases = roadmap.phases.slice(0, 5).map(p => ({ title: String(p.title || 'Giai đoạn phát triển').slice(0, 100), tasks: (Array.isArray(p.tasks) ? p.tasks : []).slice(0, 3).map(t => ({ title: String(t.title || 'Bài thực hành').slice(0, 120), description: String(t.description || '').slice(0, 240), lesson: String(t.lesson || t.description || '').slice(0, 1200), practice: String(t.practice || 'Thử áp dụng điều vừa học vào một ví dụ của riêng bạn.').slice(0, 800), checkpoint: String(t.checkpoint || 'Bạn sẽ kiểm tra kết quả của mình bằng cách nào?').slice(0, 240), skill: roadmap.skills.find(s => s.name === t.skill)?.name || roadmap.skills[0]?.name || 'Kỹ năng nền tảng', durationMinutes: Math.max(10, Math.min(240, Number(t.durationMinutes) || 30)) })) }));
      return json(res, 200, roadmap);
    }
    const { message, context } = body;
    if (typeof message !== 'string' || message.trim().length < 1 || message.length > 1500) return json(res, 400, { error: 'Tin nhắn cần dưới 1.500 ký tự.' });
    const safeContext = JSON.stringify(context || {}).slice(0, 6000);
    const answer = await askGemini('Bạn là cố vấn nghề nghiệp BeyondU AI, nói tiếng Việt tự nhiên, súc tích và luôn cá nhân hóa theo hồ sơ được cung cấp. Đưa ra một hành động cụ thể tiếp theo. Không giả vờ biết dữ liệu không có trong hồ sơ.', `Hồ sơ và lộ trình của người dùng: ${safeContext}\n\nCâu hỏi: ${message.trim()}`);
    return json(res, 200, { answer });
  } catch (error) {
    console.error('BeyondU API error:', error.message);
    return json(res, 502, { error: error.message || 'Không thể kết nối AI. Vui lòng thử lại.' });
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return api(req, res, url);
  try {
    const pathname = decodeURIComponent(url.pathname);
    const relative = pathname === '/' ? '/index.html' : normalize(pathname);
    const file = await readFile(join(root, relative));
    res.writeHead(200, { 'Content-Type': types[extname(relative)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Không tìm thấy trang.');
  }
}).listen(port, '0.0.0.0', () => console.log(`BeyondU AI đang chạy tại http://localhost:${port}`));
