class MaYuanExam {
    constructor() {
        this.questionBank = {};
        this.subjects = [];
        this.currentSubject = '';
        this.currentType = '';
        this.currentQuestions = [];
        this.originalQuestions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.answeredCount = 0;
        this.userAnswers = {};
        this.isAnswered = false;
        this.currentMode = 'sequence'; // sequence, random, memorize, wrong
        this.wrongQuestions = [];
        this.user = null;
        this.correctJumpTime = 2500; // 答题正确跳转时间 2.5秒
        this.wrongJumpTime = 3500; // 答题错误跳转时间 3.5秒
        
        // 统计数据
        this.stats = {
            totalAnswered: 0,
            correctCount: 0,
            wrongCount: 0,
            avgScore: 0,
            history: []
        };
        
        // 存储各题型的状态，键为 "subject_type"
        this.typeStates = {};
        
        // 禅语列表
        this.zenQuotes = [
            "学习如春起之苗，不见其增，日有所长",
            "不积跬步，无以至千里；不积小流，无以成江海",
            "学而不思则罔，思而不学则殆",
            "业精于勤，荒于嬉；行成于思，毁于随",
            "书山有路勤为径，学海无涯苦作舟",
            "莫等闲，白了少年头，空悲切",
            "盛年不重来，一日难再晨。及时当勉励，岁月不待人",
            "三更灯火五更鸡，正是男儿读书时",
            "黑发不知勤学早，白首方悔读书迟",
            "读书破万卷，下笔如有神",
            "敏而好学，不耻下问",
            "知之为知之，不知为不知，是知也",
            "温故而知新，可以为师矣",
            "学而时习之，不亦说乎",
            "千里之行，始于足下"
        ];
        
        this.init();
    }

    // 初始化
    async init() {
        await this.loadSubjects();
        this.bindEvents();
        
        // 初始化数据加载
        await this.initDataLoad();
        
        this.initZenQuote(); // 页面加载时只刷新一次禅语
        
        // 绑定窗口关闭事件，主动保存数据
        window.addEventListener('beforeunload', () => {
            this.saveAllData();
        });
        
        // 绑定页面隐藏事件，主动保存数据
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveAllData();
            }
        });
    }

    // 加载所有科目
    async loadSubjects() {
        try {
            const response = await fetch('/api/subjects');
            const data = await response.json();
            this.subjects = data.subjects;
            console.log('Subjects loaded:', this.subjects);
            this.renderSubjectList();
        } catch (error) {
            console.error('Failed to load subjects:', error);
            alert('加载科目失败，请刷新页面重试');
        }
    }

    // 加载指定科目的题目
    async loadQuestions(subject) {
        try {
            const response = await fetch(`/api/subjects/${subject}/questions`);
            const data = await response.json();
            this.questionBank[subject] = data.questions;
            return this.questionBank[subject];
        } catch (error) {
            console.error(`Failed to load questions for ${subject}:`, error);
            alert('加载题目失败，请刷新页面重试');
            return null;
        }
    }

    // 绑定事件
    bindEvents() {
        // 登录/注册模态框事件
        this.bindModalEvents();
        
        // 统计按钮事件
        document.getElementById('statsBtn').addEventListener('click', () => this.showStats());
        
        // 设置按钮事件
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        
        // 使用事件委托绑定模式选择事件
        document.querySelector('.mode-buttons').addEventListener('click', (e) => {
            if (e.target.classList.contains('mode-btn')) {
                const mode = e.target.dataset.mode;
                this.selectMode(mode, e);
            }
        });
        
        // 上一题/下一题按钮
        document.getElementById('prevBtn').addEventListener('click', () => this.prevQuestion());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextQuestion());
        
        // 提交答案按钮
        document.getElementById('submitBtn').addEventListener('click', () => this.submitAnswer(true));
        
        // 重置按钮
        document.getElementById('resetBtn').addEventListener('click', () => this.resetExam());
    }

    // 绑定模态框事件
    bindModalEvents() {
        // 登录模态框
        const loginModal = document.getElementById('loginModal');
        const loginBtn = document.getElementById('loginBtn');
        const closeBtns = document.querySelectorAll('.close');
        const loginForm = document.getElementById('loginForm');
        const registerBtn = document.getElementById('registerBtn');
        
        // 设置模态框
        const settingsModal = document.getElementById('settingsModal');
        const saveSettingsBtn = document.getElementById('saveSettings');
        const correctJumpTimeSlider = document.getElementById('correctJumpTime');
        const correctJumpTimeValue = document.getElementById('correctJumpTimeValue');
        const wrongJumpTimeSlider = document.getElementById('wrongJumpTime');
        const wrongJumpTimeValue = document.getElementById('wrongJumpTimeValue');
        
        // 打开登录模态框
        loginBtn.addEventListener('click', () => {
            loginModal.style.display = 'flex';
        });
        
        // 关闭所有模态框
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                loginModal.style.display = 'none';
                settingsModal.style.display = 'none';
            });
        });
        
        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.style.display = 'none';
            }
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
        
        // 登录表单提交
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        
        // 注册按钮点击
        registerBtn.addEventListener('click', () => {
            this.register();
        });
        
        // 保存设置按钮点击
        saveSettingsBtn.addEventListener('click', () => {
            this.saveSettings();
        });
        
        // 正确答案跳转时间滑块变化
        correctJumpTimeSlider.addEventListener('input', (e) => {
            correctJumpTimeValue.textContent = e.target.value;
        });
        
        // 错误答案跳转时间滑块变化
        wrongJumpTimeSlider.addEventListener('input', (e) => {
            wrongJumpTimeValue.textContent = e.target.value;
        });
        
        // 背景选择变化
        document.querySelectorAll('input[name="background"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleBackgroundUpload(e.target.value);
            });
        });
        
        // 背景图片上传
        document.getElementById('backgroundImage').addEventListener('change', (e) => {
            this.handleBackgroundImageUpload(e);
        });
        
        // 移除背景图片
        document.getElementById('removeBackground').addEventListener('click', () => {
            this.removeBackgroundImage();
        });
    }

    // 渲染科目列表
    renderSubjectList() {
        const subjectList = document.getElementById('subjectList');
        subjectList.innerHTML = '';
        
        this.subjects.forEach(subject => {
            const subjectItem = document.createElement('button');
            subjectItem.className = 'subject-item';
            subjectItem.textContent = subject;
            subjectItem.addEventListener('click', (e) => this.selectSubject(subject, e));
            subjectList.appendChild(subjectItem);
        });
    }

    // 选择科目
    async selectSubject(subject, event) {
        // 更新按钮状态
        document.querySelectorAll('.subject-item').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.currentSubject = subject;
        this.currentType = '';
        
        // 隐藏题目导航区域
        const questionNav = document.getElementById('questionNav');
        questionNav.style.display = 'none';
        
        // 隐藏题目区域，显示题型选择
        document.getElementById('questionSection').style.display = 'none';
        document.getElementById('typeButtons').innerHTML = '';
        
        // 加载该科目的题目
        const questions = await this.loadQuestions(subject);
        if (questions) {
            this.renderTypeButtons();
        }
    }

    // 渲染题型选择按钮
    renderTypeButtons() {
        const typeButtonsContainer = document.getElementById('typeButtons');
        const types = Object.keys(this.questionBank[this.currentSubject] || {});
        
        typeButtonsContainer.innerHTML = '';
        
        types.forEach(type => {
            const button = document.createElement('button');
            button.className = 'type-btn';
            button.textContent = type;
            button.addEventListener('click', (e) => this.selectType(type, e));
            typeButtonsContainer.appendChild(button);
        });
    }
    
    // 选择题型
    async selectType(type, event) {
        // 先保存当前题型的状态
        const oldType = this.currentType;
        const oldSubject = this.currentSubject;
        
        if (oldSubject && oldType) {
            // 保存旧题型的状态
            const key = `${oldSubject}_${oldType}`;
            this.typeStates[key] = {
                score: this.score,
                answeredCount: this.answeredCount,
                userAnswers: { ...this.userAnswers },
                isAnswered: this.isAnswered
            };
            
            // 同时保存到本地存储
            await this.saveTypeStatesToLocalStorage();
        }
        
        // 更新按钮状态
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // 更新当前题型
        this.currentType = type;
        await this.loadQuestionsByType();
    }

    // 保存当前题型的状态
    saveCurrentState() {
        if (!this.currentSubject || !this.currentType) return;
        
        // 错题本模式不需要保存状态到正常题型状态中
        if (this.currentMode === 'wrong') {
            return;
        }
        
        const key = `${this.currentSubject}_${this.currentType}`;
        this.typeStates[key] = {
            score: this.score,
            answeredCount: this.answeredCount,
            userAnswers: { ...this.userAnswers },
            isAnswered: this.isAnswered
        };
        
        // 同时保存到本地存储
        this.saveTypeStatesToLocalStorage();
    }
    
    // 找到第一个未答题的索引
    findFirstUnansweredQuestion() {
        for (let i = 0; i < this.currentQuestions.length; i++) {
            if (this.userAnswers[i] === undefined) {
                return i;
            }
        }
        return 0; // 如果所有题都已答完，返回第一题
    }
    
    // 跳转到第一个未答题
    jumpToFirstUnanswered() {
        const firstUnansweredIndex = this.findFirstUnansweredQuestion();
        if (firstUnansweredIndex !== this.currentIndex) {
            this.currentIndex = firstUnansweredIndex;
            this.renderQuestion();
            this.renderQuestionNav();
        }
    }
    
    // 加载指定题型的状态
    loadStateByType(subject, type) {
        const key = `${subject}_${type}`;
        const state = this.typeStates[key];
        
        if (state) {
            this.score = state.score;
            this.answeredCount = state.answeredCount;
            
            // 重置用户答案，确保不会有旧模式的答案影响当前模式
            this.userAnswers = {};
            
            // 如果是错题本模式，进度从0开始，不需要加载旧状态
            if (this.currentMode === 'wrong') {
                this.isAnswered = false;
                return;
            }
            
            // 对于非错题本模式，正确映射用户答案到当前题目列表
            const savedAnswers = { ...state.userAnswers };
            
            // 遍历当前题目列表，找到对应的原始题目索引，然后映射用户答案
            for (let currentIndex = 0; currentIndex < this.currentQuestions.length; currentIndex++) {
                const currentQuestion = this.currentQuestions[currentIndex];
                
                // 找到当前题目的正确答案，用于后续比较
                const correctAnswer = currentQuestion.answer;
                
                // 遍历原始题目，找到对应的用户答案
                const originalQuestions = this.questionBank[subject][type];
                if (originalQuestions) {
                    const questionTexts = Object.keys(originalQuestions);
                    for (let originalIndex = 0; originalIndex < questionTexts.length; originalIndex++) {
                        const questionText = questionTexts[originalIndex];
                        if (questionText === currentQuestion.text) {
                            // 找到对应的原始题目索引，映射用户答案
                            if (savedAnswers[originalIndex] !== undefined) {
                                this.userAnswers[currentIndex] = savedAnswers[originalIndex];
                            }
                            break;
                        }
                    }
                }
            }
            
            this.isAnswered = state.isAnswered;
        } else {
            // 没有保存的状态，初始化
            this.score = 0;
            this.answeredCount = 0;
            this.userAnswers = {};
            this.isAnswered = false;
        }
    }
    
    // 保存题型状态
    async saveTypeStatesToLocalStorage() {
        if (!this.user) {
            // 游客模式仍使用本地存储
            const key = 'typeStates';
            localStorage.setItem(key, JSON.stringify(this.typeStates));
            return;
        }
        
        try {
            const response = await fetch(`/api/users/${this.user.username}/typeStates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.typeStates)
            });
            await response.json();
        } catch (error) {
            console.error('保存题型状态失败:', error);
            // 失败时降级到本地存储
            const key = `${this.user.username}_typeStates`;
            localStorage.setItem(key, JSON.stringify(this.typeStates));
        }
    }
    
    // 加载题型状态
    async loadTypeStatesFromLocalStorage() {
        if (!this.user) {
            // 游客模式仍使用本地存储
            const key = 'typeStates';
            const typeStatesStr = localStorage.getItem(key);
            if (typeStatesStr) {
                this.typeStates = JSON.parse(typeStatesStr);
            }
            return;
        }
        
        try {
            const response = await fetch(`/api/users/${this.user.username}/data`);
            const result = await response.json();
            if (result.success && result.data.typeStates) {
                this.typeStates = result.data.typeStates;
            }
        } catch (error) {
            console.error('加载题型状态失败:', error);
            // 失败时降级到本地存储
            const key = `${this.user.username}_typeStates`;
            const typeStatesStr = localStorage.getItem(key);
            if (typeStatesStr) {
                this.typeStates = JSON.parse(typeStatesStr);
            }
        }
    }
    
    // 根据题型加载题目
    async loadQuestionsByType() {
        // 获取原始题目
        const questionsObj = this.questionBank[this.currentSubject][this.currentType] || {};
        this.originalQuestions = Object.entries(questionsObj).map(([questionText, data]) => ({
            text: questionText,
            ...data
        }));
        
        // 根据当前模式处理题目
        this.processQuestionsByMode();
        
        // 重置所有相关状态（确保只保留当前题型的状态）
        this.score = 0;
        this.answeredCount = 0;
        this.userAnswers = {};
        this.isAnswered = false;
        this.currentIndex = 0;
        
        // 加载对应模式的用户答案
        await this.loadUserAnswers();
        
        // 只有在非错题本模式下才加载该题型的其他状态
        // 错题本模式下进度从0开始
        if (this.currentMode !== 'wrong') {
            this.loadStateByType(this.currentSubject, this.currentType);
        }
        
        // 跳转到第一个未答题
        this.jumpToFirstUnanswered();
        
        this.updateScoreBoard();
        this.renderQuestion();
        this.renderQuestionNav();
        this.updateProgressBar(); // 更新进度条
        this.showQuestionSection();
    }

    // 根据模式处理题目
    processQuestionsByMode() {
        switch (this.currentMode) {
            case 'random':
                this.currentQuestions = this.shuffleArray([...this.originalQuestions]);
                break;
            case 'wrong':
                // 错题本模式：只显示做错的题目，如果没有错题则显示空数组
                this.currentQuestions = this.wrongQuestions.length > 0 
                    ? this.wrongQuestions 
                    : [];
                break;
            case 'memorize':
                this.currentQuestions = [...this.originalQuestions];
                break;
            case 'sequence':
            default:
                this.currentQuestions = [...this.originalQuestions];
                break;
        }
    }

    // 随机打乱数组
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // 选择刷题模式
    async selectMode(mode, event) {
        // 更新按钮状态
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.currentMode = mode;
        
        // 如果已经选择了题型，重新加载题目
        if (this.currentType) {
            await this.loadQuestionsByType();
        }
    }

    // 渲染题目导航
    renderQuestionNav() {
        const questionList = document.getElementById('questionList');
        const questionNav = document.getElementById('questionNav');
        
        questionList.innerHTML = '';
        questionNav.style.display = 'block';
        
        this.currentQuestions.forEach((question, index) => {
            const navItem = document.createElement('div');
            navItem.className = 'question-nav-item';
            navItem.textContent = index + 1;
            navItem.addEventListener('click', () => this.goToQuestion(index));
            
            // 根据状态添加样式
            if (index === this.currentIndex) {
                navItem.classList.add('active');
            }
            // 使用题目文本作为键，确保在不同模式下都能正确匹配
            const userAnswer = this.userAnswers[index];
            if (userAnswer !== undefined) {
                navItem.classList.add('answered');
                // 检查是否答错
                // 多选题需要特殊处理，比较排序后的答案
                let isWrong = false;
                if (this.currentType === '多选题') {
                    // 多选题：忽略顺序比较
                    const sortedCorrect = question.answer.split('').sort().join('');
                    const sortedUser = userAnswer.split('').sort().join('');
                    isWrong = sortedUser !== sortedCorrect;
                } else {
                    // 单选题和判断题：直接比较
                    isWrong = userAnswer !== question.answer;
                }
                if (isWrong) {
                    navItem.classList.add('wrong');
                }
            }
            
            questionList.appendChild(navItem);
        });
    }

    // 跳转到指定题目
    goToQuestion(index) {
        this.currentIndex = index;
        this.renderQuestion();
        this.renderQuestionNav();
    }

    // 显示题目区域
    showQuestionSection() {
        // 隐藏统计区域
        document.getElementById('statsSection').style.display = 'none';
        // 显示题目区域
        document.getElementById('questionSection').style.display = 'block';
    }

    // 渲染题目
    renderQuestion() {
        const question = this.currentQuestions[this.currentIndex];
        if (!question) return;
        
        // 更新题型显示
        document.getElementById('questionType').textContent = `${this.currentSubject} - ${this.currentType}`;
        
        // 更新题目文本
        document.getElementById('questionText').textContent = question.text;
        
        // 更新题目索引
        document.getElementById('questionIndex').textContent = 
            `${this.currentIndex + 1}/${this.currentQuestions.length}`;
        
        // 渲染选项
        this.renderOptions(question.options);
        
        // 更新导航按钮状态
        this.updateNavButtons();
        
        // 重置提交按钮和答案结果
        this.resetSubmitState();
        
        // 背题模式：直接显示正确答案
        if (this.currentMode === 'memorize') {
            // 禁用所有选项的点击事件
            document.querySelectorAll('.option').forEach(opt => {
                opt.style.pointerEvents = 'none';
            });
            
            // 显示正确答案
            this.showCorrectAnswer(question.answer);
        } else {
            // 非背题模式：启用选项点击事件
            document.querySelectorAll('.option').forEach(opt => {
                opt.style.pointerEvents = 'auto';
            });
        }
    }
    
    // 显示正确答案（背题模式专用）
    showCorrectAnswer(correctAnswer) {
        // 标记正确答案
        document.querySelectorAll('.option').forEach(opt => {
            if (opt.dataset.option === correctAnswer) {
                opt.classList.add('correct');
            }
        });
        
        // 显示答案结果
        const resultSection = document.getElementById('answerResult');
        const resultMessage = document.getElementById('resultMessage');
        const correctAnswerElement = document.getElementById('correctAnswer');
        
        resultMessage.textContent = '背题模式 - 直接显示正确答案';
        resultMessage.className = 'result-message correct';
        correctAnswerElement.textContent = `正确答案：${correctAnswer}`;
        resultSection.style.display = 'block';
        
        // 标记为已答
        this.isAnswered = true;
        document.getElementById('submitBtn').disabled = true;
    }

    // 渲染选项
    renderOptions(options) {
        const optionsContainer = document.getElementById('options');
        optionsContainer.innerHTML = '';
        
        // 处理判断题
        if (this.currentType === '判断题') {
            // 为判断题手动创建"正确"和"错误"两个选项
            const judgeOptions = ['A. 正确', 'B. 错误'];
            judgeOptions.forEach(option => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'option';
                optionDiv.dataset.option = option[0]; // 选项字母（A, B）
                
                optionDiv.innerHTML = `
                    <div class="option-label">${option[0]}</div>
                    <div class="option-text">${option.slice(2)}</div>
                `;
                
                // 添加选项点击事件
                optionDiv.addEventListener('click', () => this.selectOption(optionDiv));
                
                optionsContainer.appendChild(optionDiv);
            });
        } else {
            // 处理单选题和多选题
            options.forEach((option, index) => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'option';
                optionDiv.dataset.option = option[0]; // 选项字母（A, B, C, D）
                
                optionDiv.innerHTML = `
                    <div class="option-label">${option[0]}</div>
                    <div class="option-text">${option.slice(2)}</div>
                `;
                
                // 添加选项点击事件
                optionDiv.addEventListener('click', () => this.selectOption(optionDiv));
                
                optionsContainer.appendChild(optionDiv);
            });
        }
    }

    // 选择选项
    selectOption(selectedOption) {
        if (this.isAnswered) return;
        
        // 背题模式：直接返回，因为答案已经显示
        if (this.currentMode === 'memorize') {
            return;
        }
        
        const isMultipleChoice = this.currentType === '多选题';
        
        if (isMultipleChoice) {
            // 多选题：允许多选，不自动提交
            selectedOption.classList.toggle('selected');
        } else {
            // 单选题和判断题：单选，自动提交
            // 移除其他选项的选中状态
            document.querySelectorAll('.option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // 添加当前选项的选中状态
            selectedOption.classList.add('selected');
            
            // 直接提交答案，无需点击提交按钮，应该自动跳转
            this.submitAnswer(true);
        }
    }

    // 提交答案
    submitAnswer(shouldAutoJump = false) {
        if (this.isAnswered) return;
        
        // 背题模式：直接返回，因为答案已经显示
        if (this.currentMode === 'memorize') {
            return;
        }
        
        const question = this.currentQuestions[this.currentIndex];
        const correctAnswer = question.answer;
        let userAnswer = '';
        let isCorrect = false;
        
        // 根据题型处理答案
        if (this.currentType === '多选题') {
            // 多选题：收集所有选中的选项
            const selectedOptions = document.querySelectorAll('.option.selected');
            
            // 如果没有选中的选项，提示用户选择答案
            if (selectedOptions.length === 0) {
                alert('请至少选择一个答案');
                return;
            }
            
            // 组合用户答案
            const userAnswerArray = Array.from(selectedOptions).map(opt => opt.dataset.option);
            userAnswer = userAnswerArray.sort().join('');
            
            // 比较答案（忽略顺序）
            const sortedCorrectAnswer = correctAnswer.split('').sort().join('');
            const sortedUserAnswer = userAnswer.split('').sort().join('');
            isCorrect = sortedUserAnswer === sortedCorrectAnswer;
        } else if (this.currentType === '判断题') {
            // 判断题：获取选中的选项
            const selectedOption = document.querySelector('.option.selected');
            
            // 如果没有选中的选项，提示用户选择答案
            if (!selectedOption) {
                alert('请先选择一个答案');
                return;
            }
            
            const selectedValue = selectedOption.dataset.option;
            // 将A/B映射到"正确"/"错误"
            userAnswer = selectedValue === 'A' ? '正确' : '错误';
            
            isCorrect = userAnswer === correctAnswer;
        } else {
            // 单选题：获取选中的选项
            const selectedOption = document.querySelector('.option.selected');
            
            // 如果没有选中的选项，提示用户选择答案
            if (!selectedOption) {
                alert('请先选择一个答案');
                return;
            }
            
            userAnswer = selectedOption.dataset.option;
            
            isCorrect = userAnswer === correctAnswer;
        }
        
        // 保存用户答案
        this.userAnswers[this.currentIndex] = userAnswer;
        
        // 标记为已答
        this.isAnswered = true;
        this.answeredCount++;
        
        // 更新得分和统计
        if (isCorrect) {
            this.score++;
        } else {
            // 添加到错题本
            this.wrongQuestions.push(question);
        }
        
        // 更新全局统计数据
        this.updateGlobalStats(isCorrect);
        
        // 保存用户答案和错题本
        this.saveUserAnswers();
        this.saveWrongQuestions();
        
        // 自动保存：每完成10道题保存一次
        if (this.answeredCount % 10 === 0) {
            this.saveAllData();
        }
        
        // 更新选项样式
        this.updateOptionStyles(correctAnswer, userAnswer);
        
        // 显示答案结果
        this.showAnswerResult(isCorrect, correctAnswer);
        
        // 更新得分板
        this.updateScoreBoard();
        
        // 更新题目导航
        this.renderQuestionNav();
        
        // 禁用提交按钮
        document.getElementById('submitBtn').disabled = true;
        
        // 更新进度条
        this.updateProgressBar();
        
        // 自动保存：每完成1题保存一次
        this.saveAllData();
        
        // 只有在用户实际点击选项做题时（shouldAutoJump为true），才自动跳转到下一题
        if (shouldAutoJump) {
            const delay = isCorrect ? this.correctJumpTime : this.wrongJumpTime;
            setTimeout(() => {
                this.nextQuestion();
            }, delay);
        }
    }

    // 更新选项样式
    updateOptionStyles(correctAnswer, userAnswer) {
        document.querySelectorAll('.option').forEach(option => {
            const optionValue = option.dataset.option;
            
            if (this.currentType === '多选题') {
                // 多选题：高亮所有正确选项
                if (correctAnswer.includes(optionValue)) {
                    option.classList.add('correct');
                } else if (userAnswer.includes(optionValue)) {
                    option.classList.add('incorrect');
                }
            } else if (this.currentType === '判断题') {
                // 判断题：将正确答案映射到A或B
                const correctOption = correctAnswer === '正确' ? 'A' : 'B';
                const userOption = userAnswer === '正确' ? 'A' : 'B';
                
                if (optionValue === correctOption) {
                    option.classList.add('correct');
                } else if (optionValue === userOption) {
                    option.classList.add('incorrect');
                }
            } else {
                // 单选题：高亮正确选项和错误选项
                if (optionValue === correctAnswer) {
                    option.classList.add('correct');
                } else if (optionValue === userAnswer) {
                    option.classList.add('incorrect');
                }
            }
        });
    }

    // 显示答案结果
    showAnswerResult(isCorrect, correctAnswer) {
        const resultSection = document.getElementById('answerResult');
        const resultMessage = document.getElementById('resultMessage');
        const correctAnswerElement = document.getElementById('correctAnswer');
        
        if (isCorrect) {
            resultMessage.textContent = '回答正确！';
            resultMessage.className = 'result-message correct';
        } else {
            resultMessage.textContent = '回答错误！';
            resultMessage.className = 'result-message incorrect';
        }
        
        correctAnswerElement.textContent = `正确答案：${correctAnswer}`;
        resultSection.style.display = 'block';
    }

    // 更新得分板
    updateScoreBoard() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('answered').textContent = this.answeredCount;
        document.getElementById('total').textContent = this.currentQuestions.length;
    }

    // 更新导航按钮状态
    updateNavButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        prevBtn.disabled = this.currentIndex === 0;
        nextBtn.disabled = this.currentIndex === this.currentQuestions.length - 1;
    }

    // 上一题
    prevQuestion() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.renderQuestion();
            this.renderQuestionNav();
        }
    }

    // 下一题
    nextQuestion() {
        if (this.currentIndex < this.currentQuestions.length - 1) {
            this.currentIndex++;
            this.renderQuestion();
            this.renderQuestionNav();
        }
    }

    // 重置提交状态
    resetSubmitState() {
        this.isAnswered = false;
        
        // 重置当前题目的选中状态
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected', 'correct', 'incorrect');
        });
        
        const submitBtn = document.getElementById('submitBtn');
        
        // 根据题型控制提交按钮的显示和状态
        if (this.currentType === '多选题') {
            submitBtn.style.display = 'block';
            submitBtn.disabled = false;
        } else {
            submitBtn.style.display = 'none';
            submitBtn.disabled = true;
        }
        
        document.getElementById('answerResult').style.display = 'none';
    }

    // 检查当前题目是否已答
    checkAnswered() {
        const userAnswer = this.userAnswers[this.currentIndex];
        if (userAnswer) {
            // 显示用户答案
            document.querySelectorAll('.option').forEach(option => {
                if (option.dataset.option === userAnswer) {
                    option.classList.add('selected');
                }
            });
            
            // 自动提交，但不应该自动跳转
            this.submitAnswer(false);
        }
    }

    // 重置考试
    resetExam() {
        if (confirm('确定要重新答题吗？当前进度将丢失。')) {
            this.currentIndex = 0;
            this.score = 0;
            this.answeredCount = 0;
            this.userAnswers = {};
            this.isAnswered = false;
            
            // 重新根据模式加载题目
            this.processQuestionsByMode();
            
            // 保存重置后的状态
            this.saveUserAnswers();
            this.saveStats();
            
            this.updateScoreBoard();
            this.renderQuestion();
            this.renderQuestionNav();
            this.updateProgressBar(); // 重置进度条
        }
    }

    // 显示统计分析
    showStats() {
        // 隐藏题目区域
        document.getElementById('questionSection').style.display = 'none';
        // 显示统计区域
        document.getElementById('statsSection').style.display = 'block';
        
        // 更新统计数据
        this.updateStatsDisplay();
        // 渲染图表
        this.renderChart();
    }
    
    // 更新统计显示
    updateStatsDisplay() {
        // 重新计算所有统计数据，确保数据准确
        const correctRate = this.stats.totalAnswered > 0 
            ? Math.round((this.stats.correctCount / this.stats.totalAnswered) * 100)
            : 0;
        
        // 计算平均得分：正确数 / 总答题数 * 100
        const avgScore = this.stats.totalAnswered > 0
            ? Math.round((this.stats.correctCount / this.stats.totalAnswered) * 100)
            : 0;
        
        // 更新统计数据显示
        document.getElementById('totalAnswered').textContent = this.stats.totalAnswered;
        document.getElementById('correctRate').textContent = `${correctRate}%`;
        document.getElementById('avgScore').textContent = avgScore;
        document.getElementById('wrongCount').textContent = this.stats.wrongCount;
    }
    
    // 更新全局统计数据
    updateGlobalStats(isCorrect) {
        // 更新全局统计数据
        this.stats.totalAnswered++;
        if (isCorrect) {
            this.stats.correctCount++;
        } else {
            this.stats.wrongCount++;
        }
        this.saveStats();
    }

    // 渲染统计图表
    renderChart() {
        const ctx = document.getElementById('scoreChart').getContext('2d');
        
        // 销毁现有图表
        if (this.scoreChart) {
            this.scoreChart.destroy();
        }
        
        // 获取当前科目的题型
        const types = this.currentSubject ? Object.keys(this.questionBank[this.currentSubject] || {}) : [];
        
        // 如果没有题型，使用默认题型
        const labels = types.length > 0 ? types : ['单选题', '多选题', '判断题'];
        
        // 计算各题型的正确率
        const typeCorrectRates = [];
        
        labels.forEach(type => {
            // 计算该题型的答题数量和正确率
            let answeredCount = 0;
            let correctCount = 0;
            
            // 遍历所有题型状态，统计该题型的答题情况
            Object.keys(this.typeStates).forEach(stateKey => {
                const [subject, stateType] = stateKey.split('_');
                if (subject === this.currentSubject && stateType === type) {
                    const state = this.typeStates[stateKey];
                    if (state.userAnswers) {
                        // 遍历该题型的用户答案
                        for (const [index, userAnswer] of Object.entries(state.userAnswers)) {
                            // 获取该题目的正确答案
                            const questions = this.questionBank[subject][type];
                            if (questions) {
                                const questionTexts = Object.keys(questions);
                                if (questionTexts[index]) {
                                    const question = questions[questionTexts[index]];
                                    const correctAnswer = question.answer;
                                    
                                    let isCorrect = false;
                                    if (type === '多选题') {
                                        // 多选题：忽略顺序比较
                                        const sortedCorrect = correctAnswer.split('').sort().join('');
                                        const sortedUser = userAnswer.split('').sort().join('');
                                        isCorrect = sortedUser === sortedCorrect;
                                    } else {
                                        // 单选题和判断题：直接比较
                                        isCorrect = userAnswer === correctAnswer;
                                    }
                                    
                                    answeredCount++;
                                    if (isCorrect) {
                                        correctCount++;
                                    }
                                }
                            }
                        }
                    }
                }
            });
            
            const correctRate = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
            typeCorrectRates.push(correctRate);
        });
        
        this.scoreChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '正确率 (%)',
                    data: typeCorrectRates,
                    backgroundColor: '#4a90e2',
                    borderColor: '#3366cc',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: '正确率 (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '题型'
                        }
                    }
                }
            }
        });
    }

    // 加载用户信息
    loadUser() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.user = JSON.parse(userStr);
            this.updateUserInfo();
        }
    }

    // 更新用户信息显示
    updateUserInfo() {
        document.getElementById('userName').textContent = this.user.username;
        document.getElementById('loginBtn').textContent = '退出';
        document.getElementById('loginBtn').onclick = () => this.logout();
    }

    // 登录
    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            alert('请输入用户名和密码！');
            return;
        }
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.user = { username };
                localStorage.setItem('user', JSON.stringify(this.user));
                this.updateUserInfo();
                
                // 加载当前用户的数据
                await this.loadStats();
                await this.loadUserAnswers();
                await this.loadWrongQuestions();
                await this.loadTypeStatesFromLocalStorage(); // 加载题型状态
                
                // 重新渲染当前题目，显示用户之前的答案
                if (this.currentQuestions.length > 0) {
                    this.renderQuestion();
                }
                
                // 更新得分板
                this.updateScoreBoard();
                
                // 更新进度条
                this.updateProgressBar();
                
                document.getElementById('loginModal').style.display = 'none';
                alert('登录成功！');
            } else {
                alert(result.message || '用户名或密码错误！');
            }
        } catch (error) {
            console.error('登录失败:', error);
            alert('登录失败，请检查网络连接！');
        }
    }
    
    // 注册
    async register() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            alert('请输入用户名和密码！');
            return;
        }
        
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('注册成功！请登录');
            } else {
                alert(result.message || '注册失败！');
            }
        } catch (error) {
            console.error('注册失败:', error);
            alert('注册失败，请检查网络连接！');
        }
    }

    // 保存所有数据
    async saveAllData() {
        // 保存当前题型状态
        this.saveCurrentState();
        
        // 保存统计数据
        await this.saveStats();
        
        // 保存用户答案和错题本
        await this.saveUserAnswers();
        await this.saveWrongQuestions();
    }
    
    // 初始化数据加载
    async initDataLoad() {
        // 加载用户信息
        this.loadUser();
        
        // 加载统计数据
        await this.loadStats();
        
        // 加载用户答案和错题本
        await this.loadUserAnswers();
        await this.loadWrongQuestions();
        
        // 加载题型状态
        await this.loadTypeStatesFromLocalStorage();
        
        // 加载设置
        this.loadSettings();
    }
    
    // 退出登录
    logout() {
        // 退出前保存所有数据
        this.saveAllData();
        
        this.user = null;
        localStorage.removeItem('user');
        
        // 重置数据为默认值
        this.stats = {
            totalAnswered: 0,
            correctCount: 0,
            wrongCount: 0,
            avgScore: 0,
            history: []
        };
        this.userAnswers = {};
        this.wrongQuestions = [];
        this.score = 0;
        this.answeredCount = 0;
        this.isAnswered = false;
        this.typeStates = {};
        
        // 更新用户信息显示
        document.getElementById('userName').textContent = '游客';
        document.getElementById('loginBtn').textContent = '登录';
        document.getElementById('loginBtn').onclick = () => {
            document.getElementById('loginModal').style.display = 'flex';
        };
        
        // 重新渲染当前题目
        if (this.currentQuestions.length > 0) {
            this.renderQuestion();
        }
        
        // 更新得分板
        this.updateScoreBoard();
        
        // 更新进度条
        this.updateProgressBar();
        
        alert('退出成功！');
    }

    // 加载统计数据
    async loadStats() {
        if (!this.user) {
            // 游客模式仍使用本地存储
            const key = 'stats';
            const statsStr = localStorage.getItem(key);
            if (statsStr) {
                this.stats = JSON.parse(statsStr);
            }
            return;
        }
        
        try {
            const response = await fetch(`/api/users/${this.user.username}/data`);
            const result = await response.json();
            if (result.success && result.data.stats) {
                this.stats = result.data.stats;
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
            // 失败时降级到本地存储
            const key = `${this.user.username}_stats`;
            const statsStr = localStorage.getItem(key);
            if (statsStr) {
                this.stats = JSON.parse(statsStr);
            }
        }
    }
    
    // 保存统计数据
    async saveStats() {
        if (!this.user) {
            // 游客模式仍使用本地存储
            const key = 'stats';
            localStorage.setItem(key, JSON.stringify(this.stats));
            return;
        }
        
        try {
            const response = await fetch(`/api/users/${this.user.username}/stats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.stats)
            });
            await response.json();
        } catch (error) {
            console.error('保存统计数据失败:', error);
            // 失败时降级到本地存储
            const key = `${this.user.username}_stats`;
            localStorage.setItem(key, JSON.stringify(this.stats));
        }
    }
    
    // 保存用户答案
    async saveUserAnswers() {
        if (!this.user) {
            // 游客模式仍使用本地存储
            const baseKey = 'answers';
            const key = `${baseKey}_${this.currentMode}`;
            localStorage.setItem(key, JSON.stringify(this.userAnswers));
            return;
        }
        
        try {
            const response = await fetch(`/api/users/${this.user.username}/answers/${this.currentMode}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.userAnswers)
            });
            await response.json();
        } catch (error) {
            console.error('保存用户答案失败:', error);
            // 失败时降级到本地存储
            const baseKey = `${this.user.username}_answers`;
            const key = `${baseKey}_${this.currentMode}`;
            localStorage.setItem(key, JSON.stringify(this.userAnswers));
        }
    }
    
    // 加载用户答案
    async loadUserAnswers() {
        if (!this.user) {
            // 游客模式仍使用本地存储
            const baseKey = 'answers';
            const key = `${baseKey}_${this.currentMode}`;
            const answersStr = localStorage.getItem(key);
            this.userAnswers = answersStr ? JSON.parse(answersStr) : {};
            return;
        }
        
        try {
            const response = await fetch(`/api/users/${this.user.username}/data`);
            const result = await response.json();
            if (result.success && result.data.userAnswers) {
                this.userAnswers = result.data.userAnswers[this.currentMode] || {};
            } else {
                this.userAnswers = {};
            }
        } catch (error) {
            console.error('加载用户答案失败:', error);
            // 失败时降级到本地存储
            const baseKey = `${this.user.username}_answers`;
            const key = `${baseKey}_${this.currentMode}`;
            const answersStr = localStorage.getItem(key);
            this.userAnswers = answersStr ? JSON.parse(answersStr) : {};
        }
    }
    
    // 保存错题本
    async saveWrongQuestions() {
        if (!this.user) {
            // 游客模式仍使用本地存储
            const key = 'wrongQuestions';
            localStorage.setItem(key, JSON.stringify(this.wrongQuestions));
            return;
        }
        
        try {
            const response = await fetch(`/api/users/${this.user.username}/wrongQuestions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.wrongQuestions)
            });
            await response.json();
        } catch (error) {
            console.error('保存错题本失败:', error);
            // 失败时降级到本地存储
            const key = `${this.user.username}_wrongQuestions`;
            localStorage.setItem(key, JSON.stringify(this.wrongQuestions));
        }
    }
    
    // 加载错题本
    async loadWrongQuestions() {
        if (!this.user) {
            // 游客模式仍使用本地存储
            const key = 'wrongQuestions';
            const wrongQuestionsStr = localStorage.getItem(key);
            if (wrongQuestionsStr) {
                this.wrongQuestions = JSON.parse(wrongQuestionsStr);
            }
            return;
        }
        
        try {
            const response = await fetch(`/api/users/${this.user.username}/data`);
            const result = await response.json();
            if (result.success && result.data.wrongQuestions) {
                this.wrongQuestions = result.data.wrongQuestions;
            }
        } catch (error) {
            console.error('加载错题本失败:', error);
            // 失败时降级到本地存储
            const key = `${this.user.username}_wrongQuestions`;
            const wrongQuestionsStr = localStorage.getItem(key);
            if (wrongQuestionsStr) {
                this.wrongQuestions = JSON.parse(wrongQuestionsStr);
            }
        }
    }
    
    // 显示设置页面
    showSettings() {
        const settingsModal = document.getElementById('settingsModal');
        settingsModal.style.display = 'flex';
        
        // 加载当前设置到表单
        this.loadSettingsToForm();
    }
    
    // 加载设置到表单
    loadSettingsToForm() {
        const settings = this.loadSettings();
        
        // 设置主题选项
        document.querySelector(`input[name="theme"][value="${settings.theme}"]`).checked = true;
        
        // 设置背景选项
        document.querySelector(`input[name="background"][value="${settings.background}"]`).checked = true;
        
        // 切换背景上传区域显示
        this.toggleBackgroundUpload(settings.background);
        
        // 设置答题正确跳转时间
        document.getElementById('correctJumpTime').value = settings.correctJumpTime / 1000;
        document.getElementById('correctJumpTimeValue').textContent = settings.correctJumpTime / 1000;
        
        // 设置答题错误跳转时间
        document.getElementById('wrongJumpTime').value = settings.wrongJumpTime / 1000;
        document.getElementById('wrongJumpTimeValue').textContent = settings.wrongJumpTime / 1000;
    }
    
    // 加载设置
    loadSettings() {
        const defaultSettings = {
            theme: 'light',
            background: 'auto',
            backgroundImage: '',
            correctJumpTime: 2500, // 答题正确默认2.5秒
            wrongJumpTime: 3500 // 答题错误默认3.5秒
        };
        
        // 根据当前用户获取不同的设置键
        const settingsKey = this.user ? `${this.user.username}_settings` : 'settings';
        const settingsStr = localStorage.getItem(settingsKey);
        let settings = settingsStr ? JSON.parse(settingsStr) : defaultSettings;
        
        // 处理旧设置兼容
        if (settings.background === 'default' || settings.background === 'white' || settings.background === 'black') {
            settings.background = 'auto';
        }
        
        // 应用设置
        this.applyTheme(settings.theme);
        this.applyBackground(settings.background, settings.backgroundImage);
        this.correctJumpTime = settings.correctJumpTime;
        this.wrongJumpTime = settings.wrongJumpTime;
        
        return settings;
    }
    
    // 保存设置
    saveSettings() {
        const theme = document.querySelector('input[name="theme"]:checked').value;
        const background = document.querySelector('input[name="background"]:checked').value;
        const correctJumpTime = parseFloat(document.getElementById('correctJumpTime').value) * 1000;
        const wrongJumpTime = parseFloat(document.getElementById('wrongJumpTime').value) * 1000;
        
        // 根据当前用户获取不同的设置键
        const settingsKey = this.user ? `${this.user.username}_settings` : 'settings';
        
        // 获取当前背景图片设置
        const settingsStr = localStorage.getItem(settingsKey);
        const currentSettings = settingsStr ? JSON.parse(settingsStr) : {};
        
        const settings = {
            theme,
            background,
            backgroundImage: currentSettings.backgroundImage || '',
            correctJumpTime,
            wrongJumpTime
        };
        
        // 保存到本地存储
        localStorage.setItem(settingsKey, JSON.stringify(settings));
        
        // 应用设置
        this.applyTheme(theme);
        this.applyBackground(background, settings.backgroundImage);
        this.correctJumpTime = correctJumpTime;
        this.wrongJumpTime = wrongJumpTime;
        
        // 关闭模态框
        document.getElementById('settingsModal').style.display = 'none';
        
        alert('设置已保存！');
    }
    
    // 应用主题
    applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        // 主题切换时，更新背景
        const settingsKey = this.user ? `${this.user.username}_settings` : 'settings';
        const settingsStr = localStorage.getItem(settingsKey);
        const settings = settingsStr ? JSON.parse(settingsStr) : {
            background: 'auto',
            backgroundImage: ''
        };
        this.applyBackground(settings.background, settings.backgroundImage);
    }
    
    // 应用背景
    applyBackground(background, backgroundImage) {
        // 清除之前的背景样式
        document.body.style.backgroundImage = '';
        document.body.style.backgroundColor = '';
        
        if (background === 'custom' && backgroundImage) {
            // 使用自定义背景图片
            document.body.style.backgroundImage = `url(${backgroundImage})`;
            document.body.style.backgroundColor = '';
        } else if (background === 'auto') {
            // 随主题自动切换
            const isDarkTheme = document.body.classList.contains('dark-theme');
            document.body.style.backgroundColor = isDarkTheme ? '#000000' : '#ffffff';
        } else if (background === 'white') {
            // 固定白色背景
            document.body.style.backgroundColor = '#ffffff';
        } else {
            // 固定黑色背景
            document.body.style.backgroundColor = '#000000';
        }
    }
    
    // 切换背景上传区域显示
    toggleBackgroundUpload(backgroundType) {
        const uploadDiv = document.querySelector('.background-upload');
        uploadDiv.style.display = backgroundType === 'custom' ? 'block' : 'none';
    }
    
    // 处理背景图片上传
    handleBackgroundImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageDataUrl = e.target.result;
                
                // 保存到本地存储
                const settingsStr = localStorage.getItem('settings');
                const settings = settingsStr ? JSON.parse(settingsStr) : {};
                settings.backgroundImage = imageDataUrl;
                localStorage.setItem('settings', JSON.stringify(settings));
                
                // 应用背景
                this.applyBackground('custom', imageDataUrl);
                
                alert('背景图片已设置！');
            };
            reader.readAsDataURL(file);
        }
    }
    
    // 移除背景图片
    removeBackgroundImage() {
        // 清除本地存储中的背景图片
        const settingsStr = localStorage.getItem('settings');
        if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            settings.backgroundImage = '';
            localStorage.setItem('settings', JSON.stringify(settings));
        }
        
        // 重置背景
        this.applyBackground('default', '');
        
        // 重置文件输入
        document.getElementById('backgroundImage').value = '';
        
        alert('背景图片已移除！');
    }
    
    // 初始化禅语
    initZenQuote() {
        this.refreshZenQuote();
    }
    
    // 刷新禅语
    refreshZenQuote() {
        const randomIndex = Math.floor(Math.random() * this.zenQuotes.length);
        const quote = this.zenQuotes[randomIndex];
        document.getElementById('zenQuote').textContent = quote;
    }
    
    // 更新进度条
    updateProgressBar() {
        if (this.currentQuestions.length === 0) return;
        
        // 计算当前题目列表中已答的数量
        let currentAnsweredCount = 0;
        for (let i = 0; i < this.currentQuestions.length; i++) {
            if (this.userAnswers[i] !== undefined) {
                currentAnsweredCount++;
            }
        }
        
        const progress = Math.round((currentAnsweredCount / this.currentQuestions.length) * 100);
        document.getElementById('progressText').textContent = `${progress}%`;
        document.getElementById('progressFill').style.width = `${progress}%`;
    }
}

// 页面加载完成后初始化
let exam;
document.addEventListener('DOMContentLoaded', () => {
    exam = new MaYuanExam();
});