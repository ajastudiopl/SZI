// server/server.js
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
        // Domyślne dane, jeśli plik nie istnieje
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
        // Zwraca puste dane w przypadku błędu
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

// Endpoint do pobierania konfiguracji
app.get('/config', (req, res) => {
    const config = readConfig();
    res.json(config);
});

// Endpoint do aktualizacji konfiguracji
app.post('/config', (req, res) => {
    const { serverIP } = req.body;
    if (!serverIP) {
        console.log('Brak serverIP w żądaniu');
        return res.status(400).json({ error: 'serverIP jest wymagany' });
    }
    const config = readConfig();
    config.serverIP = serverIP;
    writeConfig(config);
    console.log('Konfiguracja zaktualizowana:', config);
    res.json({ message: 'Konfiguracja zaktualizowana.', config });
});

// Endpoint do ładowania scen i użytkowników wraz z serverIP
app.get('/load', (req, res) => {
    const sessionData = readSessionData();

    // Dodanie serverIP i port do odpowiedzi
    const config = readConfig();
    sessionData.serverIP = config.serverIP;
    sessionData.port = config.port;

    // Filtrujemy sceny na podstawie parametru 'type'
    const type = req.query.type;
    if (type) {
        sessionData.scenes = sessionData.scenes.filter(scene => scene.type === type);
    }

    res.json(sessionData);
});

// Endpoint do zapisu danych scen i użytkowników
app.post('/save', (req, res) => {
    const { scenes, users } = req.body;
    console.log('Otrzymano dane do zapisu:', { scenes, users });

    if (!Array.isArray(scenes) || !Array.isArray(users)) {
        return res.status(400).json({ error: 'scenes i users muszą być tablicami.' });
    }

    try {
        const sessionData = readSessionData();

        // Usuwamy istniejące sceny typu 'regular'
        sessionData.scenes = sessionData.scenes.filter(scene => scene.type !== 'regular');

        // Dodajemy nowe sceny typu 'regular' z danych przesłanych z klienta
        const newRegularScenes = scenes.filter(scene => scene.type === 'regular');
        sessionData.scenes = sessionData.scenes.concat(newRegularScenes);

        // Aktualizujemy użytkowników
        sessionData.users = users;

        writeSessionData(sessionData);
        console.log('Dane sesji zapisane poprawnie');
        res.json({ message: 'Dane sesji zapisane' });
    } catch (error) {
        console.error('Błąd podczas zapisywania danych sesji:', error);
        res.status(500).json({ error: 'Błąd serwera podczas zapisywania danych' });
    }
});

// Endpoint do pobierania listy użytkowników
app.get('/users', (req, res) => {
    const sessionData = readSessionData();
    const usersList = sessionData.users;
    res.json({ users: usersList });
});

// Endpoint do przesyłania plików audio
app.post('/upload-audio', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Brak pliku audio w żądaniu.' });
    }

    // Tworzymy URL do pliku audio
    const audioURL = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    res.json({ audioURL });
});

// Endpoint do zapisu scen z timeline.html
app.post('/save-scenes', (req, res) => {
    const { scenes } = req.body;
    console.log('Otrzymano dane scen do zapisu:', JSON.stringify(scenes, null, 2));

    if (!Array.isArray(scenes)) {
        return res.status(400).json({ error: 'scenes muszą być tablicą.' });
    }

    try {
        const sessionData = readSessionData();

        // Usuwamy istniejące sceny typu 'timeline'
        sessionData.scenes = sessionData.scenes.filter(scene => scene.type !== 'timeline');

        // Dodajemy nowe sceny typu 'timeline' z danych przesłanych z klienta
        const newTimelineScenes = scenes.filter(scene => scene.type === 'timeline');
        sessionData.scenes = sessionData.scenes.concat(newTimelineScenes);

        writeSessionData(sessionData);
        res.json({ message: 'Sceny zostały zapisane.' });
    } catch (error) {
        console.error('Błąd podczas zapisywania scen:', error);
        res.status(500).json({ error: 'Błąd serwera podczas zapisywania scen.' });
    }
});

// Endpoint do pobierania wszystkich scen
app.get('/scenes', (req, res) => {
    const sessionData = readSessionData();
    const type = req.query.type;
    let scenes = sessionData.scenes;

    // Filtrujemy sceny na podstawie parametru 'type'
    if (type) {
        scenes = scenes.filter(scene => scene.type === type);
    }

    res.json({ scenes });
});

// Endpoint do usuwania sceny
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
        console.error('Błąd podczas usuwania sceny:', error);
        res.status(500).json({ error: 'Błąd serwera podczas usuwania sceny.' });
    }
});

// Endpoint do dodawania sceny z timeline do editmode
app.post('/add-scene', (req, res) => {
    const newScene = req.body;
    console.log('Otrzymano żądanie dodania sceny do editmode:', newScene);

    if (!newScene || !newScene.type) {
        return res.status(400).json({ error: 'Niepoprawne dane sceny.' });
    }

    try {
        const sessionData = readSessionData();

        // Zmiana typu sceny na 'regular'
        newScene.type = 'regular';

        // Zapewniamy unikalne ID sceny
        newScene.id = uuidv4();

        // Dodajemy nową scenę
        sessionData.scenes.push(newScene);

        writeSessionData(sessionData);
        res.json({ message: 'Scena została dodana do listy scen w editmode.' });
    } catch (error) {
        console.error('Błąd podczas dodawania sceny do editmode:', error);
        res.status(500).json({ error: 'Błąd serwera podczas dodawania sceny.' });
    }
});

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
        // Zakładamy, że wiadomości są wysyłane jako tekst (JSON)
        const messageStr = message.toString();
        console.log('Otrzymano wiadomość:', messageStr);

        let parsedMessage;
        try {
            parsedMessage = JSON.parse(messageStr);
        } catch (e) {
            console.error('Błąd parsowania wiadomości JSON:', e);
            return;
        }

        // Broadcastuj wiadomość do wszystkich innych klientów
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
