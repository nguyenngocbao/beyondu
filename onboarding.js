window.renderBeyondUOnboarding = function () {
  const profile = { ...(window.beyonduState?.user || {}) };
  let step = 1;
  let stage = 'Sinh viên';
  let goals = [];
  let career = '';
  let levels = {};
  let careerOptions = null;
  let recommendationsLoading = false;
  const app = document.querySelector('#app');
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

  const careerCatalog = [
    { name:'Data Analyst', description:'Phân tích dữ liệu để tìm ra thông tin hữu ích.', icon:'▥', tags:['data','phân tích','kinh tế','hệ thống thông tin','excel','thực tập'], skills:[['Excel',55],['SQL',35],['Power BI',25],['Tư duy phân tích',45]] },
    { name:'UX/UI Designer', description:'Thiết kế sản phẩm số dễ hiểu và dễ sử dụng.', icon:'✳', tags:['thiết kế','mỹ thuật','sáng tạo','công nghệ','người dùng'], skills:[['Figma',35],['Nghiên cứu người dùng',35],['Tư duy thiết kế',45],['Prototyping',25]] },
    { name:'Software Engineer', description:'Xây dựng ứng dụng và tính năng phần mềm.', icon:'⌘', tags:['công nghệ','lập trình','phần mềm','máy tính','kỹ thuật'], skills:[['JavaScript',35],['HTML/CSS',45],['Cấu trúc dữ liệu',25],['Git',35]] },
    { name:'Digital Marketer', description:'Phát triển nội dung và chiến dịch trên nền tảng số.', icon:'◉', tags:['marketing','truyền thông','kinh doanh','sáng tạo','nội dung'], skills:[['Sáng tạo nội dung',45],['SEO',30],['Phân tích dữ liệu',35],['Quảng cáo số',25]] },
    { name:'Product Manager', description:'Kết nối nhu cầu người dùng với hướng phát triển sản phẩm.', icon:'⌁', tags:['kinh doanh','công nghệ','quản trị','sản phẩm','người dùng'], skills:[['Nghiên cứu người dùng',40],['Phân tích dữ liệu',35],['Lập kế hoạch',35],['Giao tiếp',50]] },
    { name:'Business Analyst', description:'Làm rõ nhu cầu và cải thiện quy trình kinh doanh.', icon:'◈', tags:['kinh doanh','hệ thống thông tin','kinh tế','quy trình','phân tích'], skills:[['Phân tích quy trình',40],['Excel',50],['SQL',25],['Viết yêu cầu',35]] },
    { name:'Content Creator', description:'Tạo nội dung hữu ích phù hợp với một nhóm khán giả.', icon:'✦', tags:['sáng tạo','truyền thông','ngôn ngữ','nội dung','marketing'], skills:[['Viết nội dung',45],['Kể chuyện',40],['Lập kế hoạch nội dung',35],['Phân tích tương tác',25]] },
    { name:'Graphic Designer', description:'Truyền tải ý tưởng bằng hình ảnh và bố cục.', icon:'✧', tags:['thiết kế','mỹ thuật','sáng tạo','đồ họa','truyền thông'], skills:[['Bố cục thị giác',40],['Figma',30],['Adobe Photoshop',30],['Nhận diện thương hiệu',25]] }
  ];

  function fallbackRecommendations() {
    const context = `${profile.major || ''} ${goals.join(' ')}`.toLocaleLowerCase('vi');
    const ranked = careerCatalog.map((item, index) => ({ item, index, score:item.tags.reduce((total, tag) => total + (context.includes(tag.toLocaleLowerCase('vi')) ? 2 : 0), 0) }));
    ranked.sort((a,b) => b.score - a.score || a.index - b.index);
    return ranked.slice(0,4).map(({item}) => ({
      ...item,
      skills:item.skills.map(([name,currentLevel]) => ({ name, currentLevel }))
    }));
  }

  async function loadCareerOptions() {
    if (recommendationsLoading || careerOptions) return;
    recommendationsLoading = true;
    try {
      const response = await fetch('/api/survey-recommendations', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ stage, major:profile.major || '', interests:goals })
      });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.careers) || result.careers.length < 2) throw new Error(result.error || 'Không lấy được gợi ý nghề.');
      careerOptions = result.careers;
    } catch (error) {
      careerOptions = fallbackRecommendations();
      window.showToast?.('Đang dùng gợi ý dự phòng theo ngành học và mục tiêu của bạn.');
    } finally {
      recommendationsLoading = false;
      if (!careerOptions.some(item => item.name === career)) career = careerOptions[0]?.name || '';
      if (step >= 3) draw();
    }
  }

  const selectedCareer = () => careerOptions?.find(item => item.name === career) || careerOptions?.[0];
  const currentSkills = () => selectedCareer()?.skills || [];

  function draw() {
    const percent = Math.round(step / 4 * 100);
    let content = '';
    if (step === 1) {
      const majors = ['Chưa xác định','Công nghệ thông tin & Khoa học dữ liệu','Kinh doanh & Quản trị','Marketing & Truyền thông','Thiết kế & Nghệ thuật','Tài chính & Kế toán','Kỹ thuật & Công nghệ','Y tế & Sức khỏe','Giáo dục & Ngôn ngữ','Du lịch & Dịch vụ','Luật & Quan hệ quốc tế'];
      const selectedMajor = majors.includes(profile.major) ? profile.major : 'Chưa xác định';
      content = `<div class="section-kicker">BƯỚC 1 · BẮT ĐẦU TỪ BẠN</div><h1>Hãy cho mình biết đôi chút</h1><p>Thông tin này giúp gợi ý mục tiêu phù hợp với giai đoạn của bạn.</p><label class="onboard-field">Tên hiển thị<input id="ob-name" value="${safe(profile.name === 'Minh Anh' ? '' : profile.name)}" autocomplete="name" placeholder="Tên của bạn"/></label><label class="onboard-field">Giai đoạn hiện tại<select id="ob-stage">${['Học sinh THPT','Sinh viên','Người mới đi làm','Đang đi làm','Kinh doanh cá nhân'].map(value => `<option ${stage===value?'selected':''}>${value}</option>`).join('')}</select></label><label class="onboard-field">Ngành học hoặc lĩnh vực<select id="ob-major">${majors.map(value => `<option value="${safe(value)}" ${selectedMajor===value?'selected':''}>${safe(value)}</option>`).join('')}</select></label>`;
    } else if (step === 2) {
      content = `<div class="section-kicker">BƯỚC 2 · ĐIỀU BẠN MUỐN ĐẠT ĐƯỢC</div><h1>Bạn muốn cải thiện điều gì?</h1><p>Chọn tối đa ba mục tiêu. Gợi ý nghề ở bước sau sẽ dựa trên lựa chọn này.</p><div class="goal-grid">${['Khám phá nghề phù hợp','Phát triển kỹ năng','Tìm cơ hội thực tập','Chuẩn bị đi làm','Chuyển sang nghề mới','Thăng tiến','Ứng dụng AI vào công việc'].map(value => `<button class="goal-chip ${goals.includes(value)?'selected':''}" data-goal="${safe(value)}">${goals.includes(value)?'✓　':''}${safe(value)}</button>`).join('')}</div>`;
    } else if (step === 3 && !careerOptions) {
      content = `<div class="ai-generating survey-loading"><span class="loading-orb">✦</span><h1>Đang chọn nghề phù hợp</h1><p>BeyondU đang dựa trên giai đoạn, ngành học và mục tiêu bạn vừa nhập.</p><div class="typing-dots"><i></i><i></i><i></i></div></div>`;
    } else if (step === 3) {
      content = `<div class="section-kicker">BƯỚC 3 · GỢI Ý THEO HỒ SƠ CỦA BẠN</div><h1>Hướng nghề nào hợp với bạn?</h1><p>Danh sách này được chọn từ giai đoạn, ngành học và mục tiêu ở hai bước trước.</p><div class="career-choices">${careerOptions.map(item => `<button class="career-choice ${career===item.name?'selected':''}" data-career="${safe(item.name)}"><span>${safe(item.icon || '✦')}</span><b>${safe(item.name)}</b><small>${safe(item.description)}</small></button>`).join('')}</div>`;
    } else {
      content = `<div class="section-kicker">BƯỚC 4 · KỸ NĂNG CHO ${safe(career).toLocaleUpperCase('vi')}</div><h1>Bạn đã quen với những kỹ năng nào?</h1><p>Kỹ năng bên dưới được chọn theo nghề và mục tiêu bạn đã cung cấp. Kéo để ước lượng mức hiện tại.</p><label class="onboard-field compact-field">Thời gian bạn muốn đạt mục tiêu<select id="ob-months">${[3,6,9,12].map(month => `<option value="${month}" ${month===6?'selected':''}>${month} tháng</option>`).join('')}</select></label><div class="level-list">${currentSkills().map(({name,currentLevel}) => { const level = levels[name] ?? currentLevel; return `<label class="level-row"><span>${safe(name)}</span><input data-level="${safe(name)}" type="range" min="0" max="100" value="${level}"/><output>${level}%</output></label>`; }).join('')}</div><p class="ai-privacy-note">Câu trả lời được gửi đến Gemini để tạo lộ trình, và lưu trên trình duyệt này.</p>`;
    }

    const waiting = (step === 3 && !careerOptions) || (step === 4 && currentSkills().length < 3);
    app.innerHTML = `<main class="onboard"><a class="brand" href="#/">${window.beyonduLogo?.() || '<span class="brand-word">BeyondU <b>AI</b></span>'}</a><section class="onboard-card"><div class="onboard-progress"><span>HỒ SƠ NGHỀ NGHIỆP</span><span>Bước ${step} / 4</span></div><div class="progress-track"><i style="width:${percent}%"></i></div><div id="onboard-content">${content}<div class="onboard-actions">${step>1?'<button class="button button-outline" id="ob-back">← Quay lại</button>':'<span></span>'}<button class="button button-primary" id="ob-next" ${waiting?'disabled':''}>${step===4?'Tạo lộ trình bằng AI':'Tiếp tục'} <span>→</span></button></div></div></section><p class="onboard-note">Câu trả lời được gửi đến Gemini để tạo gợi ý và lộ trình, rồi lưu trên trình duyệt này.</p></main>`;
    document.querySelector('#ob-stage')?.addEventListener('change', event => { stage = event.target.value; });
    document.querySelectorAll('[data-goal]').forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.goal;
      goals = goals.includes(value) ? goals.filter(item => item !== value) : goals.length < 3 ? [...goals, value] : goals;
      careerOptions = null; career = ''; levels = {};
      draw();
    }));
    document.querySelectorAll('[data-career]').forEach(button => button.addEventListener('click', () => { career = button.dataset.career; levels = {}; draw(); }));
    document.querySelectorAll('[data-level]').forEach(input => input.addEventListener('input', () => { levels[input.dataset.level] = Number(input.value); input.nextElementSibling.value = `${input.value}%`; }));
    document.querySelector('#ob-back')?.addEventListener('click', () => { if (step > 1) { step--; draw(); } });
    document.querySelector('#ob-next')?.addEventListener('click', async () => {
      if (step === 1) {
        stage = document.querySelector('#ob-stage').value;
        profile.name = document.querySelector('#ob-name').value.trim();
        profile.major = document.querySelector('#ob-major').value;
        if (!profile.name) { window.showToast?.('Nhập tên hiển thị để tiếp tục.'); return; }
        step = 2; draw(); return;
      }
      if (step === 2) {
        if (!goals.length) { window.showToast?.('Chọn ít nhất một mục tiêu để cá nhân hóa gợi ý.'); return; }
        careerOptions = null; career = ''; levels = {};
        step = 3; draw(); void loadCareerOptions(); return;
      }
      if (step === 3) { step = 4; draw(); return; }

      const button = document.querySelector('#ob-next');
      button.disabled = true;
      const profileForAI = {
        name: profile.name || 'Bạn', stage, major: profile.major || '', interests: goals, careerGoal: career,
        targetMonths: Number(document.querySelector('#ob-months').value),
        skillLevels: currentSkills().map(skill => ({ name:skill.name, level:levels[skill.name] ?? skill.currentLevel }))
      };
      document.querySelector('#onboard-content').innerHTML = `<div class="ai-generating"><span class="loading-orb">✦</span><h1>Đang tạo lộ trình riêng cho bạn</h1><p>BeyondU đang đối chiếu mục tiêu, kỹ năng và thời gian của bạn.</p><div class="typing-dots"><i></i><i></i><i></i></div></div>`;
      try {
        await window.createPersonalizedRoadmap(profileForAI);
        location.hash = '/app/dashboard';
        window.showToast?.('Lộ trình cá nhân của bạn đã sẵn sàng.');
      } catch (error) {
        document.querySelector('#onboard-content').innerHTML = `<div class="ai-generating"><span class="error-mark">!</span><h1>Chưa thể tạo lộ trình</h1><p>${safe(error.message || 'Kiểm tra kết nối rồi thử lại.')}</p><button class="button button-primary" id="ob-retry">Thử lại</button></div>`;
        document.querySelector('#ob-retry')?.addEventListener('click', () => draw());
      }
    });
  }

  draw();
};
