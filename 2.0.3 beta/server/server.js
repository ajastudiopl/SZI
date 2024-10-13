// server/server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws'); // Upewnij się, że ten moduł jest zaimportowany
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
            users: [
                { id: 'user1', name: 'Jan Kowalski' },
                { id: 'user2', name: 'Anna Nowak' },
                // Dodaj więcej użytkowników w zależności od potrzeb
            ]
        };
        fs.writeFileSync(sessionPath, JSON.stringify(defaultData, null, 2), 'utf8');
        return defaultData;
    }
    const data = fs.readFileSync(sessionPath, 'utf8');
    try {
        return JSON.parse(data);
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
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueSuffix);
    }
});

const upload = multer({ storage: storage });

// --- Istniejące Endpointy ---

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
let sessionData = {};
if (fs.existsSync(sessionPath)) {
    try {
        const data = fs.readFileSync(sessionPath, 'utf8');
        sessionData = JSON.parse(data);
        console.log('Zwrócono dane sesji');
    } catch (error) {
        console.error('Błąd odczytu session_data.json:', error);
        return res.status(500).json({ error: 'Błąd serwera podczas odczytu danych sesji.' });
    }
} else {
    // Domyślne sceny i użytkownicy, jeśli session_data.json nie istnieje
    const defaultScenes = [
        { order: 1, title: 'Scena 1', content: 'Opis sceny 1', users: { user1: 'Instrukcja 1' } },
        { order: 2, title: 'Scena 2', content: 'Opis sceny 2', users: { user2: 'Instrukcja 2' } },
        // Dodaj więcej scen w zależności od potrzeb
    ];
    const defaultUsers = [
        { id: 'user1', name: 'Jan Kowalski' },
        { id: 'user2', name: 'Anna Nowak' },
        // Dodaj więcej użytkowników w zależności od potrzeb
    ];
    sessionData = { scenes: defaultScenes, users: defaultUsers };
    console.log('Zwrócono listę domyślnych scen i użytkowników');
}

app.get('/load', (req, res) => {
    const sessionData = readSessionData();

    // Dodanie serverIP i port do odpowiedzi
    const config = readConfig();
    sessionData.serverIP = config.serverIP;
    sessionData.port = config.port;

    res.json(sessionData);
});

// Endpoint do zapisu danych scen i użytkowników
app.post('/save', (req, res) => {
    const { scenes, users } = req.body;
    console.log('Otrzymano dane do zapisu:', { scenes, users });

    if (!scenes || !users) {
        return res.status(400).json({ error: 'scenes i users są wymagane' });
    }

    try {
        const sessionData = { scenes, users };
        fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), 'utf8');
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

// --- Nowe Endpointy Dodane dla Timeline ---

// Endpoint do przesyłania plików audio
app.post('/upload-audio', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Brak pliku audio w żądaniu.' });
    }

    const config = readConfig();
    const audioURL = `${config.serverIP}:${config.port}/uploads/${req.file.filename}`;
    // Możesz dodać więcej informacji, np. długość pliku, jeśli masz mechanizm do jej obliczania

    res.json({ audioURL });
});

// Endpoint do zapisu scen z timeline.html
app.post('/save-scenes', (req, res) => {
    const { scenes } = req.body;
    console.log('Otrzymano dane scen do zapisu:', scenes);

    if (!scenes || !Array.isArray(scenes)) {
        return res.status(400).json({ error: 'scenes są wymagane i muszą być tablicą.' });
    }

    try {
        const sessionData = readSessionData();
        // Zastąp istniejące sceny nowymi scenami w kolejności otrzymanej
        sessionData.scenes = scenes.map(scene => ({
            id: scene.id || uuidv4(),
            title: scene.title || `Scene ${sessionData.scenes.length + 1}`,
            description: scene.description || '',
            audioURL: scene.audioURL || '',
            audioDuration: scene.audioDuration || 0,
            cues: scene.cues || []
        }));
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
    res.json({ scenes: sessionData.scenes });
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

// --- Koniec Nowych Endpointów ---

// Serwowanie plików statycznych z katalogu 'public'
app.use(express.static(path.join(__dirname, '../public')));


// Serwer HTTP
const httpPort = 3000;

app.listen(httpPort, '0.0.0.0', () => {
    console.log(`Serwer HTTP działa na porcie ${httpPort}`);
});

// Serwer WebSocket (przykład z użyciem ws)

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
