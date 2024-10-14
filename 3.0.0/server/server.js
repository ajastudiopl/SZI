const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const app = express();

// Middleware do parsowania JSON
app.use(express.json());

// Middleware CORS
app.use(cors());

// Ścieżki do plików
const configPath = path.join(__dirname, 'config.json');
const sessionPath = path.join(__dirname, 'session_data.json');

// Funkcja do odczytu konfiguracji
function readConfig() {
    if (!fs.existsSync(configPath)) {
        return { serverIP: 'localhost' };
    }
    const data = fs.readFileSync(configPath, 'utf8');
    try {
        return JSON.parse(data);
    } catch (error) {
        console.error('Błąd parsowania config.json:', error);
        return { serverIP: 'localhost' };
    }
}

// Funkcja do zapisu konfiguracji
function writeConfig(newConfig) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
        console.log('Konfiguracja zapisana:', newConfig);
    } catch (error) {
        console.error('Błąd zapisu config.json:', error);
    }
}

// Funkcja do odczytu danych sesji
function readSessionData() {
    if (!fs.existsSync(sessionPath)) {
        const defaultData = {
            scenes: [],
            users: []
        };
        fs.writeFileSync(sessionPath, JSON.stringify(defaultData, null, 2), 'utf8');
        return defaultData;
    }
    const data = fs.readFileSync(sessionPath, 'utf8');
    try {
        const parsedData = JSON.parse(data);
        return parsedData;
    } catch (error) {
        console.error('Błąd parsowania session_data.json:', error);
        return { scenes: [], users: [] };
    }
}

// Funkcja do zapisu danych sesji
function writeSessionData(newData) {
    try {
        fs.writeFileSync(sessionPath, JSON.stringify(newData, null, 2), 'utf8');
        console.log('Dane sesji zapisane.');
    } catch (error) {
        console.error('Błąd zapisu session_data.json:', error);
    }
}

// Konfiguracja Multer do przesyłania plików audio
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueSuffix);
    }
});

const upload = multer({ storage: storage });

// --- Endpointy ---

app.get('/config', (req, res) => {
    const config = readConfig();
    res.json(config);
});

app.post('/config', (req, res) => {
    const { serverIP } = req.body;
    if (!serverIP) {
        console.log('Brak serverIP w żądaniu');
        return res.status(400).json({ error: 'serverIP jest wymagany' });
    }
    const config = readConfig();
    config.serverIP = serverIP;
    writeConfig(config);
    res.json({ message: 'Konfiguracja zaktualizowana.', config });
});

app.get('/load', (req, res) => {
    const sessionData = readSessionData();
    const config = readConfig();
    sessionData.serverIP = config.serverIP;
    sessionData.port = config.port;

    const type = req.query.type;
    if (type) {
        sessionData.scenes = sessionData.scenes.filter(scene => scene.type === type);
    }

    res.json(sessionData);
});

app.post('/save', (req, res) => {
    const { scenes, users } = req.body;
    console.log('Otrzymano dane do zapisu:', { scenes, users });

    if (!Array.isArray(scenes) || !Array.isArray(users)) {
        return res.status(400).json({ error: 'scenes i users muszą być tablicami.' });
    }

    try {
        const sessionData = readSessionData();
        sessionData.scenes = sessionData.scenes.filter(scene => scene.type !== 'regular');
        const newRegularScenes = scenes.filter(scene => scene.type === 'regular');
        sessionData.scenes = sessionData.scenes.concat(newRegularScenes);
        sessionData.users = users;
        writeSessionData(sessionData);
        res.json({ message: 'Dane sesji zapisane' });
    } catch (error) {
        res.status(500).json({ error: 'Błąd serwera podczas zapisywania danych' });
    }
});

app.get('/users', (req, res) => {
    const sessionData = readSessionData();
    const usersList = sessionData.users;
    res.json({ users: usersList });
});

app.post('/upload-audio', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Brak pliku audio w żądaniu.' });
    }

    const audioURL = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ audioURL });
});

app.post('/save-scenes', (req, res) => {
    const { scenes } = req.body;
    console.log('Otrzymano dane scen do zapisu:', JSON.stringify(scenes, null, 2));

    if (!Array.isArray(scenes)) {
        return res.status(400).json({ error: 'scenes muszą być tablicą.' });
    }

    try {
        const sessionData = readSessionData();
        sessionData.scenes = sessionData.scenes.filter(scene => scene.type !== 'timeline');
        const newTimelineScenes = scenes.filter(scene => scene.type === 'timeline');
        sessionData.scenes = sessionData.scenes.concat(newTimelineScenes);
        writeSessionData(sessionData);
        res.json({ message: 'Sceny zostały zapisane.' });
    } catch (error) {
        res.status(500).json({ error: 'Błąd serwera podczas zapisywania scen.' });
    }
});

app.get('/scenes', (req, res) => {
    const sessionData = readSessionData();
    const type = req.query.type;
    let scenes = sessionData.scenes;

    if (type) {
        scenes = scenes.filter(scene => scene.type === type);
    }

    res.json({ scenes });
});

app.delete('/scenes/:id', (req, res) => {
    const sceneId = req.params.id;
    console.log(`Otrzymano żądanie usunięcia sceny: ${sceneId}`);

    try {
        const sessionData = readSessionData();
        const initialLength = sessionData.scenes.length;
        sessionData.scenes = sessionData.scenes.filter(scene => scene.id !== sceneId);
        const finalLength = sessionData.scenes.length;

        if (finalLength === initialLength) {
            return res.status(404).json({ error: 'Scena nie znaleziona.' });
        }

        writeSessionData(sessionData);
        res.json({ message: 'Scena została usunięta.' });
    } catch (error) {
        res.status(500).json({ error: 'Błąd serwera podczas usuwania sceny.' });
    }
});

app.post('/add-scene', (req, res) => {
    const newScene = req.body;
    console.log('Otrzymano żądanie dodania sceny do editmode:', newScene);

    if (!newScene || !newScene.type) {
        return res.status(400).json({ error: 'Niepoprawne dane sceny.' });
    }

    try {
        const sessionData = readSessionData();
        newScene.type = 'regular';
        newScene.id = uuidv4();
        sessionData.scenes.push(newScene);
        writeSessionData(sessionData);
        res.json({ message: 'Scena została dodana do listy scen w editmode.' });
    } catch (error) {
        res.status(500).json({ error: 'Błąd serwera podczas dodawania sceny.' });
    }
});

// --- DODATKI ---

// Endpoint do zapisu Cue z wieloma użytkownikami
app.post('/save-cue', (req, res) => {
    const cueData = req.body;
    try {
        saveCue(cueData);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Błąd podczas zapisywania Cue:', error);
        res.status(500).json({ error: 'Błąd podczas zapisywania Cue' });
    }
});

// Funkcja zapisująca Cue
function saveCue(cueData) {
    const cueId = cueData.id;
    const sceneId = cueData.sceneId;

    const sessionData = readSessionData();
    const scene = sessionData.scenes.find(scene => scene.id === sceneId);

    if (!scene) {
        throw new Error('Scene not found');
    }

    let cue = scene.cues.find(c => c.id === cueId);

    if (!cue) {
        cue = {
            id: cueId,
            name: cueData.name,
            time: cueData.time,
            users: [],
            messages: {},
            urls: {},
            triggered: false
        };
        scene.cues.push(cue);
    }

    cue.users = [...cueData.users];
    cueData.users.forEach(user => {
        cue.messages[user] = cueData.messages[user] || '';
        cue.urls[user] = cueData.urls[user] || '';
    });

    writeSessionData(sessionData);
    console.log(`Zapisano Cue ${cueId} dla użytkowników:`, cue.users);
}

// Serwowanie plików statycznych z katalogu 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Serwer HTTP
const httpPort = 3000;

app.listen(httpPort, '0.0.0.0', () => {
    console.log(`Serwer HTTP działa na porcie ${httpPort}`);
});

// Serwer WebSocket
const wsPort = 8080;
const wss = new WebSocket.Server({ port: wsPort }, () => {
    console.log(`Serwer WebSocket działa na porcie ${wsPort}`);
});

wss.on('connection', (ws) => {
    console.log('Nowe połączenie WebSocket');

    ws.on('message', (message) => {
        const messageStr = message.toString();
        console.log('Otrzymano wiadomość:', messageStr);

        let parsedMessage;
        try {
            parsedMessage = JSON.parse(messageStr);
        } catch (e) {
            return;
        }

        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(parsedMessage));
            }
        });
    });

    ws.on('close', () => {
        console.log('Połączenie WebSocket zamknięte');
    });

    ws.on('error', (error) => {
        console.error('Błąd połączenia WebSocket:', error);
    });
});
