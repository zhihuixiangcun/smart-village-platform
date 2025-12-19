// 全局变量
let currentPage = 'home';
let isRecording = false;
let largeTextMode = false;
let highContrastMode = false;
let voiceEnabled = true;
let selectedDialect = 'mandarin';

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    updateDateTime();
    checkNetworkStatus();
    getLocation();
});

// 应用初始化
function initializeApp() {
    // 恢复用户设置
    loadUserSettings();

    // 初始化语音识别
    if ('webkitSpeechRecognition' in window) {
        initializeSpeechRecognition();
    }

    // 添加键盘导航支持
    setupKeyboardNavigation();

    // 监听网络状态
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // 初始化用户偏好
    setupUserPreferences();
}

// 加载用户设置
function loadUserSettings() {
    const settings = localStorage.getItem('userSettings');
    if (settings) {
        const userSettings = JSON.parse(settings);

        if (userSettings.largeTextMode) {
            document.body.classList.add('large-text-mode');
            document.getElementById('largeTextMode').checked = true;
        }

        if (userSettings.highContrast) {
            document.body.classList.add('high-contrast');
            document.getElementById('highContrast').checked = true;
        }

        if (userSettings.dialect) {
            selectedDialect = userSettings.dialect;
            document.getElementById('dialectSelect').value = selectedDialect;
        }
    }
}

// 保存用户设置
function saveUserSettings() {
    const settings = {
        largeTextMode: largeTextMode,
        highContrast: highContrastMode,
        dialect: selectedDialect,
        voiceEnabled: voiceEnabled
    };
    localStorage.setItem('userSettings', JSON.stringify(settings));
}

// 更新日期时间
function updateDateTime() {
    const now = new Date();
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    };
    const dateStr = now.toLocaleDateString('zh-CN', options);

    // 计算农历（简化版）
    const lunarDate = getLunarDate(now);
    document.getElementById('currentDate').textContent = `${dateStr} 农历${lunarDate}`;

    // 每分钟更新
    setTimeout(updateDateTime, 60000);
}

// 获取农历日期（简化版）
function getLunarDate(date) {
    // 这里使用简化算法，实际应用中需要完整的农历转换库
    const lunarMonths = ['正月', '二月', '三月', '四月', '五月', '六月',
                        '七月', '八月', '九月', '十月', '冬月', '腊月'];
    const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                      '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                      '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

    // 简单映射（实际需要复杂的农历计算）
    const month = (date.getMonth() + 11) % 12;
    const day = (date.getDate() + 29) % 30;

    return `${lunarMonths[month]}${lunarDays[day]}`;
}

// 检查网络状态
function checkNetworkStatus() {
    updateNetworkStatus();
}

// 更新网络状态显示
function updateNetworkStatus() {
    const offlineBanner = document.getElementById('offlineBanner');
    if (navigator.onLine) {
        offlineBanner.style.display = 'none';
        // 触发数据同步
        syncOfflineData();
    } else {
        offlineBanner.style.display = 'block';
    }
}

// 同步离线数据
function syncOfflineData() {
    const offlineActions = JSON.parse(localStorage.getItem('offlineActions') || '[]');

    if (offlineActions.length > 0) {
        showToast('正在同步离线数据...', 'info');

        // 模拟数据同步
        setTimeout(() => {
            localStorage.removeItem('offlineActions');
            showToast('数据同步完成', 'success');
        }, 2000);
    }
}

// 获取当前位置
function getLocation() {
    const locationElement = document.getElementById('currentLocation');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lng = position.coords.longitude.toFixed(6);
                locationElement.textContent = `纬度: ${lat}, 经度: ${lng}`;

                // 保存位置信息
                localStorage.setItem('userLocation', JSON.stringify({
                    latitude: lat,
                    longitude: lng,
                    timestamp: new Date().toISOString()
                }));
            },
            (error) => {
                locationElement.textContent = '无法获取位置信息';
                console.error('获取位置失败:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5分钟
            }
        );
    } else {
        locationElement.textContent = '浏览器不支持定位';
    }
}

// 页面导航
function navigateTo(page) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });

    // 显示目标页面
    const targetPage = document.getElementById(page + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = page;
    }

    // 更新底部导航状态
    updateBottomNav(page);

    // 语音反馈
    if (voiceEnabled) {
        speak(`已打开${getPageTitle(page)}`);
    }
}

// 获取页面标题
function getPageTitle(page) {
    const titles = {
        'home': '首页',
        'villageAffairs': '村务管理',
        'services': '生活服务',
        'archives': '村民档案',
        'emergency': '应急求助'
    };
    return titles[page] || '未知页面';
}

// 更新底部导航状态
function updateBottomNav(activePage) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // 映射页面到导航项索引
    const pageToNavIndex = {
        'home': 0,
        'villageAffairs': 1,
        'services': 2,
        'archives': 3
    };

    const index = pageToNavIndex[activePage];
    if (index !== undefined) {
        document.querySelectorAll('.nav-item')[index].classList.add('active');
    }
}

// 切换标签页
function switchTab(tabName) {
    // 更新标签状态
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.closest('.tab-item').classList.add('active');

    // 显示对应内容
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// 语音识别相关
let recognition;
function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = getDialectLanguage(selectedDialect);

    recognition.onstart = function() {
        isRecording = true;
        updateVoiceUI(true);
    };

    recognition.onresult = function(event) {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // 更新识别结果
        if (finalTranscript) {
            processVoiceCommand(finalTranscript);
        }
    };

    recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        showToast('语音识别失败，请重试', 'error');
        stopVoiceRecording();
    };

    recognition.onend = function() {
        stopVoiceRecording();
    };
}

// 获取方言对应语言代码
function getDialectLanguage(dialect) {
    const langMap = {
        'mandarin': 'zh-CN',
        'cantonese': 'zh-HK',
        'hokkien': 'zh-MIN',
        'sichuan': 'zh-CN',
        'dongbei': 'zh-CN'
    };
    return langMap[dialect] || 'zh-CN';
}

// 开始语音输入
function startVoiceInput(targetId) {
    if (!recognition) {
        showToast('您的浏览器不支持语音识别', 'error');
        return;
    }

    recognition.lang = getDialectLanguage(selectedDialect);
    recognition.start();

    // 保存目标输入框
    recognition.currentTarget = document.getElementById(targetId);
}

// 开始语音搜索
function startVoiceSearch() {
    if (!recognition) {
        showToast('您的浏览器不支持语音识别', 'error');
        return;
    }

    recognition.lang = getDialectLanguage(selectedDialect);
    recognition.start();

    // 保存搜索框
    recognition.currentTarget = document.getElementById('searchInput');
}

// 处理语音命令
function processVoiceCommand(command) {
    console.log('识别到命令:', command);

    // 处理特定输入框的语音输入
    if (recognition.currentTarget) {
        recognition.currentTarget.value = command;
        recognition.currentTarget = null;
        return;
    }

    // 处理语音助手命令
    const intent = analyzeIntent(command);
    executeVoiceIntent(intent, command);
}

// 分析语音意图
function analyzeIntent(command) {
    // 简单的意图识别
    if (command.includes('首页') || command.includes('主页面')) {
        return 'home';
    } else if (command.includes('村务') || command.includes('公告')) {
        return 'villageAffairs';
    } else if (command.includes('服务') || command.includes('办事')) {
        return 'services';
    } else if (command.includes('档案') || command.includes('村民')) {
        return 'archives';
    } else if (command.includes('求助') || command.includes('紧急')) {
        return 'emergency';
    } else if (command.includes('天气')) {
        return 'weather';
    } else if (command.includes('打电话') || command.includes('呼叫')) {
        return 'call';
    } else {
        return 'unknown';
    }
}

// 执行语音意图
function executeVoiceIntent(intent, command) {
    switch (intent) {
        case 'home':
            navigateTo('home');
            break;
        case 'villageAffairs':
            navigateTo('villageAffairs');
            break;
        case 'services':
            navigateTo('services');
            break;
        case 'archives':
            navigateTo('archives');
            break;
        case 'emergency':
            navigateTo('emergency');
            break;
        case 'weather':
            speak('今天25度，晴天，适合外出活动');
            break;
        case 'call':
            // 提取联系人姓名（简化处理）
            const name = command.replace(/打电话给|呼叫/, '').trim();
            if (name.includes('村长')) {
                makeCall('138-xxxx-xxxx');
            } else {
                speak(`找不到联系人${name}`);
            }
            break;
        default:
            speak('对不起，我没有理解您的指令');
    }
}

// 更新语音UI状态
function updateVoiceUI(isRecording) {
    const voiceWave = document.getElementById('voiceWave');
    const voiceBtn = document.getElementById('voiceBtn');

    if (isRecording) {
        voiceWave.classList.add('active');
        if (voiceBtn) {
            voiceBtn.innerHTML = '<i class="fas fa-stop"></i><span>停止录音</span>';
            voiceBtn.classList.add('recording');
        }
    } else {
        voiceWave.classList.remove('active');
        if (voiceBtn) {
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i><span>开始说话</span>';
            voiceBtn.classList.remove('recording');
        }
    }
}

// 停止语音录音
function stopVoiceRecording() {
    if (recognition && isRecording) {
        recognition.stop();
    }
    isRecording = false;
    updateVoiceUI(false);
}

// 切换语音录音状态
function toggleVoiceRecording() {
    if (isRecording) {
        stopVoiceRecording();
    } else {
        if (recognition) {
            recognition.lang = getDialectLanguage(selectedDialect);
            recognition.start();
        } else {
            showToast('语音识别不可用', 'error');
        }
    }
}

// 打开语音助手页面
function openVoicePage() {
    navigateTo('voice');
}

// 关闭语音页面
function closeVoicePage() {
    navigateTo('home');
}

// 语音播报
function speak(text) {
    if (!voiceEnabled || !('speechSynthesis' in window)) {
        return;
    }

    // 取消之前的播报
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
}

// 发出语音指令
function speakCommand(command) {
    speak(command);
    setTimeout(() => {
        processVoiceCommand(command);
    }, 1500);
}

// 播放最后一次语音回应
function playLastResponse() {
    // 实现重播功能
    speak('对不起，暂时无法重播');
}

// 触发紧急求助
function triggerEmergency() {
    if (confirm('确定要触发紧急求助吗？')) {
        // 获取位置信息
        const location = JSON.parse(localStorage.getItem('userLocation') || '{}');

        // 发送紧急求助信息
        const emergencyData = {
            type: 'emergency',
            timestamp: new Date().toISOString(),
            location: location,
            userId: 'current_user'
        };

        // 保存到离线存储
        saveOfflineAction(emergencyData);

        // 显示成功提示
        showToast('紧急求助已发送，救援人员正在赶来', 'success');

        // 播放语音提示
        speak('紧急求助已发送，请保持冷静，救援人员正在赶来');

        // 震动提醒（如果支持）
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
    }
}

// 选择紧急类型
function selectEmergencyType(type) {
    const typeNames = {
        'medical': '医疗急救',
        'fire': '火灾报警',
        'security': '治安事件',
        'disaster': '灾害求助'
    };

    const typeData = {
        type: type,
        typeName: typeNames[type],
        timestamp: new Date().toISOString(),
        location: JSON.parse(localStorage.getItem('userLocation') || '{}')
    };

    saveOfflineAction(typeData);
    showToast(`${typeNames[type]}请求已发送`, 'success');
    speak(`已发送${typeNames[type]}请求`);
}

// 拨打紧急电话
function callEmergency(number) {
    if (confirm(`确定要拨打 ${number} 吗？`)) {
        // 移动端拨打电话
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            window.location.href = `tel:${number}`;
        } else {
            // 桌面端显示电话号码
            showToast(`请拨打 ${number}`, 'info');
        }
    }
}

// 发布公告
function publishNotice() {
    const title = document.getElementById('noticeTitle').value;
    const content = document.getElementById('noticeContent').value;
    const scope = document.getElementById('noticeScope').value;

    if (!title || !content) {
        showToast('请填写完整的公告信息', 'error');
        return;
    }

    const noticeData = {
        title: title,
        content: content,
        scope: scope,
        timestamp: new Date().toISOString(),
        author: 'current_user'
    };

    // 保存到离线存储
    saveOfflineAction(noticeData);

    // 清空表单
    document.getElementById('noticeTitle').value = '';
    document.getElementById('noticeContent').value = '';

    showToast('公告发布成功', 'success');
    speak('公告发布成功');
}

// 保存草稿
function saveDraft() {
    const title = document.getElementById('noticeTitle').value;
    const content = document.getElementById('noticeContent').value;

    const draftData = {
        title: title,
        content: content,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('noticeDraft', JSON.stringify(draftData));
    showToast('草稿已保存', 'success');
}

// 创建会议
function createMeeting() {
    // 实现创建会议功能
    showToast('创建会议功能开发中', 'info');
}

// 显示用户中心
function showUserCenter() {
    showToast('用户中心功能开发中', 'info');
}

// 显示搜索
function showSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.focus();
    }
}

// 显示添加菜单
function showAddMenu() {
    showToast('添加菜单功能开发中', 'info');
}

// 显示设置
function showSettings() {
    navigateTo('settings');
}

// 显示家庭详情
function showFamilyDetail(familyId) {
    showToast(`查看家庭 ${familyId} 详情`, 'info');
}

// 关闭通知
function closeNotice() {
    const notice = document.getElementById('emergencyNotice');
    notice.style.display = 'none';
}

// 显示语音速度设置
function showVoiceSpeedSettings() {
    const speeds = [
        { label: '慢速', value: 0.5 },
        { label: '正常', value: 1.0 },
        { label: '快速', value: 1.5 },
        { label: '很快', value: 2.0 }
    ];

    // 简化处理，使用prompt
    const currentSpeed = 1.0;
    const speedValue = prompt('选择语速 (0.5-2.0):', currentSpeed);

    if (speedValue && !isNaN(speedValue)) {
        const speed = parseFloat(speedValue);
        if (speed >= 0.5 && speed <= 2.0) {
            localStorage.setItem('voiceSpeed', speed);
            showToast('语速设置已更新', 'success');
        } else {
            showToast('语速值必须在0.5-2.0之间', 'error');
        }
    }
}

// 显示语言选择
function showLanguageSelect() {
    showToast('语言选择功能开发中', 'info');
}

// 显示方言选择
function showDialectSelect() {
    showToast('方言选择功能开发中', 'info');
}

// 切换大字模式
function toggleLargeText() {
    largeTextMode = !largeTextMode;

    if (largeTextMode) {
        document.body.classList.add('large-text-mode');
        showToast('已开启大字模式', 'success');
    } else {
        document.body.classList.remove('large-text-mode');
        showToast('已关闭大字模式', 'success');
    }

    saveUserSettings();
}

// 切换高对比度
function toggleHighContrast() {
    highContrastMode = !highContrastMode;

    if (highContrastMode) {
        document.body.classList.add('high-contrast');
        showToast('已开启高对比度模式', 'success');
    } else {
        document.body.classList.remove('high-contrast');
        showToast('已关闭高对比度模式', 'success');
    }

    saveUserSettings();
}

// 拨打电话
function makeCall(phoneNumber) {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        window.location.href = `tel:${phoneNumber}`;
    } else {
        showToast(`请拨打 ${phoneNumber}`, 'info');
    }
}

// 保存离线操作
function saveOfflineAction(action) {
    const actions = JSON.parse(localStorage.getItem('offlineActions') || '[]');
    actions.push(action);
    localStorage.setItem('offlineActions', JSON.stringify(actions));
}

// Toast提示
function showToast(message, type = 'info') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // 设置样式
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: getToastColor(type),
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: '9999',
        animation: 'toastSlideIn 0.3s ease-out'
    });

    // 添加到页面
    document.body.appendChild(toast);

    // 自动移除
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease-out';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 获取Toast颜色
function getToastColor(type) {
    const colors = {
        'success': '#4CAF50',
        'error': '#F44336',
        'warning': '#FF9800',
        'info': '#2196F3'
    };
    return colors[type] || colors.info;
}

// 添加Toast动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideIn {
        from {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }

    @keyframes toastSlideOut {
        from {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        to {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
    }
`;
document.head.appendChild(style);

// 键盘导航支持
function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(event) {
        // Alt + 数字键快速导航
        if (event.altKey) {
            switch(event.key) {
                case '1':
                    navigateTo('home');
                    break;
                case '2':
                    navigateTo('villageAffairs');
                    break;
                case '3':
                    navigateTo('services');
                    break;
                case '4':
                    navigateTo('archives');
                    break;
                case 'v':
                case 'V':
                    openVoicePage();
                    break;
            }
        }

        // ESC键返回首页
        if (event.key === 'Escape') {
            navigateTo('home');
        }
    });
}

// 设置用户偏好
function setupUserPreferences() {
    // 检测用户偏好的减少动画设置
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.body.classList.add('reduced-motion');
    }

    // 检测用户偏好的高对比度设置
    if (window.matchMedia('(prefers-contrast: high)').matches) {
        document.body.classList.add('high-contrast');
        document.getElementById('highContrast').checked = true;
    }
}

// 导出全局函数供HTML调用
window.navigateTo = navigateTo;
window.switchTab = switchTab;
window.startVoiceInput = startVoiceInput;
window.startVoiceSearch = startVoiceSearch;
window.toggleVoiceRecording = toggleVoiceRecording;
window.openVoicePage = openVoicePage;
window.closeVoicePage = closeVoicePage;
window.speakCommand = speakCommand;
window.playLastResponse = playLastResponse;
window.triggerEmergency = triggerEmergency;
window.selectEmergencyType = selectEmergencyType;
window.callEmergency = callEmergency;
window.publishNotice = publishNotice;
window.saveDraft = saveDraft;
window.createMeeting = createMeeting;
window.showUserCenter = showUserCenter;
window.showSearch = showSearch;
window.showAddMenu = showAddMenu;
window.showSettings = showSettings;
window.showFamilyDetail = showFamilyDetail;
window.closeNotice = closeNotice;
window.showVoiceSpeedSettings = showVoiceSpeedSettings;
window.showLanguageSelect = showLanguageSelect;
window.showDialectSelect = showDialectSelect;
window.toggleLargeText = toggleLargeText;
window.toggleHighContrast = toggleHighContrast;
window.makeCall = makeCall;