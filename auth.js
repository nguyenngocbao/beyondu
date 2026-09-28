const STORAGE_KEY = 'beyondu-demo-journey';
window.__authStatus = 'loading';

function restoreDemoJourney() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.user && saved?.tasks?.length) window.hydrateBeyondU(saved);
  } catch (error) {
    console.warn('Không đọc được dữ liệu BeyondU đã lưu:', error);
  }
  window.__authStatus = 'authenticated';
  window.dispatchEvent(new Event('beyondu:auth-ready'));
}

function fallbackPersonalizedRoadmap(profile) {
  const skills = profile.skillLevels.slice(0, 6).map((skill, index) => ({
    name: skill.name, currentLevel: skill.level, targetLevel: Math.min(95, Math.max(skill.level + 20, 70))
  }));
  const phases = [
    { title: 'Củng cố nền tảng', skills: skills.slice(0, 2) },
    { title: 'Áp dụng vào tình huống thực tế', skills: skills.slice(2, 4) },
    { title: 'Hoàn thiện dự án nghề nghiệp', skills: skills.slice(0, 2) },
    { title: 'Chuẩn bị ứng tuyển', skills: skills.slice(-2) }
  ].filter(phase => phase.skills.length);
  return {
    source: 'fallback', summary: `Lộ trình ${profile.targetMonths} tháng hướng đến ${profile.careerGoal}, được điều chỉnh theo kỹ năng và mục tiêu bạn đã chia sẻ.`,
    readiness: Math.round(skills.reduce((sum, skill) => sum + Math.min(skill.currentLevel / skill.targetLevel, 1), 0) / Math.max(skills.length, 1) * 100),
    skills, phases: phases.map((phase, phaseIndex) => ({ title: phase.title, tasks: phase.skills.map((skill, taskIndex) => ({
      title: phaseIndex === 0 ? `Nắm vững ${skill.name} cho ${profile.careerGoal}` : phaseIndex === 2 ? `Thực hiện dự án ${profile.careerGoal}` : `Thực hành ${skill.name} theo mục tiêu`,
      description: `Tập trung cải thiện ${skill.name} từ mức ${skill.currentLevel}% để tiến gần yêu cầu nghề nghiệp.`,
      lesson: `${skill.name} là một phần quan trọng trong công việc ${profile.careerGoal}. Bắt đầu từ khái niệm nền tảng, sau đó áp dụng vào một tình huống nhỏ giống công việc thực tế.`,
      practice: `Dành 30 phút tạo một ví dụ thực hành ${skill.name} liên quan đến lĩnh vực ${profile.major || profile.careerGoal}. Ghi lại kết quả và điều bạn học được.`,
      checkpoint: `Bạn có thể giải thích cách mình dùng ${skill.name} để giải quyết một vấn đề cụ thể không?`,
      skill: skill.name, durationMinutes: taskIndex === 0 ? 45 : 35
    })) }))
  };
}

window.createPersonalizedRoadmap = async profile => {
  let generated;
  try {
    const response = await fetch('/api/generate-roadmap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'AI chưa tạo được lộ trình.');
    generated = result;
  } catch (error) {
    console.warn('Dùng lộ trình dự phòng theo khảo sát:', error.message);
    generated = fallbackPersonalizedRoadmap(profile);
  }
  const skills = generated.skills.map((skill, index) => ({ name: skill.name, value: skill.currentLevel, target: skill.targetLevel, icon: ['▦','⌘','▥','∿','◌'][index % 5], color: ['blue','cyan','amber','purple','green'][index % 5] }));
  const tasks = generated.phases.flatMap(phase => phase.tasks.map(task => ({
    title: task.title, detail: task.description, lesson: task.lesson, practice: task.practice, checkpoint: task.checkpoint,
    duration: `${task.durationMinutes} phút`, durationMinutes: task.durationMinutes, skill: task.skill, increase: 5,
    done: false, phase: phase.title
  })));
  const journey = {
    user: { name: profile.name, stage: profile.stage, major: profile.major, goal: profile.careerGoal, deadline: `${profile.targetMonths} tháng` },
    skills, tasks, weekly: 0, streak: 0, xp: 0, dark: false, onboarded: true,
    notifications: ['Lộ trình cá nhân của bạn đã sẵn sàng.'], chat: [], roadmap: generated, plan: 'free', aiQuestionsUsed: 0
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(journey));
  window.hydrateBeyondU(journey);
  return generated;
};

window.persistTaskCompletion = async task => {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (!saved) throw new Error('Chưa có lộ trình được lưu trên thiết bị này.');
  const savedTask = saved.tasks.find(item => item.title === task.title);
  if (savedTask) savedTask.done = true;
  const skill = saved.skills.find(item => item.name === task.skill);
  if (skill) skill.value = Math.min(skill.value + task.increase, 100);
  saved.xp = (saved.xp || 0) + 120;
  saved.weekly = Math.min(5, (saved.weekly || 0) + 1);
  saved.notifications = [`Đã hoàn thành: ${task.title}.`, ...(saved.notifications || [])].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
};

window.askBeyondU = async (message, context) => {
  const savedBeforeRequest = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (savedBeforeRequest?.plan !== 'plus' && (savedBeforeRequest?.aiQuestionsUsed || 0) >= 3) throw new Error('Bạn đã dùng hết 3 lượt hỏi thử. Mở BeyondU Plus để tiếp tục cùng cố vấn AI.');
  const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, context }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Cố vấn AI chưa trả lời được.');
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved) {
    saved.chat = [...(saved.chat || []), { role: 'user', text: message }, { role: 'assistant', text: result.answer }].slice(-50);
    saved.aiQuestionsUsed = (saved.aiQuestionsUsed || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }
  return result.answer;
};

window.clearBeyondUData = () => {
  if (!window.confirm('Xóa hồ sơ khảo sát, lộ trình và tiến độ đã lưu trên trình duyệt này?')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.hash = '/';
  location.reload();
};

window.activateBeyondUPremiumDemo = () => {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (!saved) throw new Error('Hãy tạo lộ trình trước khi mở gói Plus.');
  saved.plan = 'plus';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  window.hydrateBeyondU(saved);
};

restoreDemoJourney();
