const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// 请求日志中间件，用于监控网站流量
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');
    
    // 记录请求日志到控制台
    const logMessage = `${timestamp} - ${method} ${url} - IP: ${ip} - UA: ${userAgent}`;
    console.log(logMessage);
    
    // 可选：将日志写入文件
    const logStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
    logStream.write(logMessage + '\n');
    logStream.end();
    
    next();
});

// 配置静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
// 支持JSON请求
app.use(express.json());

// 用户管理类
class UserManager {
    constructor() {
        this.users = {};
        this.userData = {};
        this.loadUsers();
        this.loadUserData();
    }

    // 加载用户数据
    loadUsers() {
        try {
            const data = fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8');
            this.users = JSON.parse(data);
        } catch (error) {
            // 如果文件不存在或读取失败，初始化空对象
            this.users = {};
            this.saveUsers();
        }
    }

    // 保存用户数据
    saveUsers() {
        fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(this.users, null, 2));
    }

    // 加载用户学习数据
    loadUserData() {
        try {
            const data = fs.readFileSync(path.join(__dirname, 'userData.json'), 'utf8');
            this.userData = JSON.parse(data);
        } catch (error) {
            // 如果文件不存在或读取失败，初始化空对象
            this.userData = {};
            this.saveUserData();
        }
    }

    // 保存用户学习数据
    saveUserData() {
        fs.writeFileSync(path.join(__dirname, 'userData.json'), JSON.stringify(this.userData, null, 2));
    }

    // 用户注册
    register(username, password) {
        if (this.users[username]) {
            return false; // 用户名已存在
        }
        this.users[username] = password;
        this.saveUsers();
        // 初始化用户数据
        this.userData[username] = {
            userAnswers: {},
            wrongQuestions: [],
            stats: {
                totalAnswered: 0,
                correctCount: 0,
                wrongCount: 0,
                avgScore: 0,
                history: []
            },
            typeStates: {}
        };
        this.saveUserData();
        return true;
    }

    // 用户登录
    login(username, password) {
        return this.users[username] === password;
    }

    // 获取用户数据
    getUserData(username) {
        return this.userData[username] || {
            userAnswers: {},
            wrongQuestions: [],
            stats: {
                totalAnswered: 0,
                correctCount: 0,
                wrongCount: 0,
                avgScore: 0,
                history: []
            },
            typeStates: {}
        };
    }

    // 更新用户数据
    updateUserData(username, data) {
        if (!this.userData[username]) {
            this.userData[username] = {
                userAnswers: {},
                wrongQuestions: [],
                stats: {
                    totalAnswered: 0,
                    correctCount: 0,
                    wrongCount: 0,
                    avgScore: 0,
                    history: []
                },
                typeStates: {}
            };
        }
        // 合并数据
        this.userData[username] = {
            ...this.userData[username],
            ...data
        };
        this.saveUserData();
        return this.userData[username];
    }

    // 保存用户答案
    saveUserAnswers(username, mode, answers) {
        if (!this.userData[username]) {
            this.userData[username] = {
                userAnswers: {},
                wrongQuestions: [],
                stats: {
                    totalAnswered: 0,
                    correctCount: 0,
                    wrongCount: 0,
                    avgScore: 0,
                    history: []
                },
                typeStates: {}
            };
        }
        if (!this.userData[username].userAnswers) {
            this.userData[username].userAnswers = {};
        }
        this.userData[username].userAnswers[mode] = answers;
        this.saveUserData();
        return this.userData[username].userAnswers;
    }

    // 保存错题本
    saveWrongQuestions(username, questions) {
        if (!this.userData[username]) {
            this.userData[username] = {
                userAnswers: {},
                wrongQuestions: [],
                stats: {
                    totalAnswered: 0,
                    correctCount: 0,
                    wrongCount: 0,
                    avgScore: 0,
                    history: []
                },
                typeStates: {}
            };
        }
        this.userData[username].wrongQuestions = questions;
        this.saveUserData();
        return this.userData[username].wrongQuestions;
    }

    // 保存统计数据
    saveStats(username, stats) {
        if (!this.userData[username]) {
            this.userData[username] = {
                userAnswers: {},
                wrongQuestions: [],
                stats: {
                    totalAnswered: 0,
                    correctCount: 0,
                    wrongCount: 0,
                    avgScore: 0,
                    history: []
                },
                typeStates: {}
            };
        }
        this.userData[username].stats = stats;
        this.saveUserData();
        return this.userData[username].stats;
    }

    // 保存题型状态
    saveTypeStates(username, typeStates) {
        if (!this.userData[username]) {
            this.userData[username] = {
                userAnswers: {},
                wrongQuestions: [],
                stats: {
                    totalAnswered: 0,
                    correctCount: 0,
                    wrongCount: 0,
                    avgScore: 0,
                    history: []
                },
                typeStates: {}
            };
        }
        this.userData[username].typeStates = typeStates;
        this.saveUserData();
        return this.userData[username].typeStates;
    }
}

// 题库管理
class QuestionBankManager {
    constructor() {
        this.banks = {};
        this.subjects = [];
        this.loadAllBanks();
    }

    // 加载所有题库文件
    loadAllBanks() {
        const bankFiles = fs.readdirSync(__dirname).filter(file => 
            file.endsWith('.json') && !file.startsWith('package') && !file.startsWith('users') && !file.startsWith('userData')
        );

        bankFiles.forEach(file => {
            try {
                const subjectName = file.replace('.json', '');
                const data = fs.readFileSync(path.join(__dirname, file), 'utf8');
                this.banks[subjectName] = JSON.parse(data);
                this.subjects.push(subjectName);
                console.log(`Loaded question bank: ${subjectName}`);
            } catch (error) {
                console.error(`Error loading ${file}:`, error);
            }
        });
    }

    // 获取所有科目
    getSubjects() {
        return this.subjects;
    }

    // 获取指定科目
    getSubject(subjectName) {
        return this.banks[subjectName] || null;
    }

    // 获取指定科目下的题型
    getQuestionTypes(subjectName) {
        const subject = this.getSubject(subjectName);
        return subject ? Object.keys(subject) : [];
    }

    // 获取指定科目和题型的题目
    getQuestions(subjectName, type) {
        const subject = this.getSubject(subjectName);
        return subject ? (subject[type] || {}) : {};
    }

    // 获取所有题目
    getAllQuestions() {
        return this.banks;
    }
}

// 初始化用户管理器和题库管理器
const userManager = new UserManager();
const bankManager = new QuestionBankManager();

// API: 获取所有科目
app.get('/api/subjects', (req, res) => {
    res.json({ subjects: bankManager.getSubjects() });
});

// API: 获取指定科目下的题型
app.get('/api/subjects/:subject/types', (req, res) => {
    const { subject } = req.params;
    const types = bankManager.getQuestionTypes(subject);
    res.json({ subject, types });
});

// API: 获取指定科目和题型的题目
app.get('/api/subjects/:subject/questions/:type', (req, res) => {
    const { subject, type } = req.params;
    const questions = bankManager.getQuestions(subject, type);
    res.json({ subject, type, questions });
});

// API: 获取指定科目的所有题目
app.get('/api/subjects/:subject/questions', (req, res) => {
    const { subject } = req.params;
    const questions = bankManager.getSubject(subject);
    res.json({ subject, questions });
});

// API: 用户注册
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }
    const success = userManager.register(username, password);
    if (success) {
        res.json({ success: true, message: '注册成功' });
    } else {
        res.status(400).json({ success: false, message: '用户名已存在' });
    }
});

// API: 用户登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }
    const success = userManager.login(username, password);
    if (success) {
        res.json({ success: true, message: '登录成功' });
    } else {
        res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
});

// API: 获取用户数据
app.get('/api/users/:username/data', (req, res) => {
    const { username } = req.params;
    const userData = userManager.getUserData(username);
    res.json({ success: true, data: userData });
});

// API: 更新用户数据
app.post('/api/users/:username/data', (req, res) => {
    const { username } = req.params;
    const data = req.body;
    const updatedData = userManager.updateUserData(username, data);
    res.json({ success: true, data: updatedData });
});

// API: 保存用户答案
app.post('/api/users/:username/answers/:mode', (req, res) => {
    const { username, mode } = req.params;
    const answers = req.body;
    const updatedAnswers = userManager.saveUserAnswers(username, mode, answers);
    res.json({ success: true, answers: updatedAnswers });
});

// API: 保存错题本
app.post('/api/users/:username/wrongQuestions', (req, res) => {
    const { username } = req.params;
    const questions = req.body;
    const updatedQuestions = userManager.saveWrongQuestions(username, questions);
    res.json({ success: true, wrongQuestions: updatedQuestions });
});

// API: 保存统计数据
app.post('/api/users/:username/stats', (req, res) => {
    const { username } = req.params;
    const stats = req.body;
    const updatedStats = userManager.saveStats(username, stats);
    res.json({ success: true, stats: updatedStats });
});

// API: 保存题型状态
app.post('/api/users/:username/typeStates', (req, res) => {
    const { username } = req.params;
    const typeStates = req.body;
    const updatedTypeStates = userManager.saveTypeStates(username, typeStates);
    res.json({ success: true, typeStates: updatedTypeStates });
});

// API: 获取所有题库数据
app.get('/api/questions', (req, res) => {
    res.json(bankManager.getAllQuestions());
});

// 启动服务器，监听所有网络接口，允许外部设备访问
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`You can access the website at http://localhost:${PORT}`);
    console.log(`外部设备可以通过 http://47.237.95.203:${PORT} 访问`);
});