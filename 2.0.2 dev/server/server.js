// server/server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

// Middleware do parsowania JSON
app.use(express.json());

// Middleware CORS (opcjonalnie)
app.use(cors());

// Ścieżka do pliku konfiguracyjnego
const configPath = path.join(__dirname, 'config.json');

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

// Ścieżka do pliku sesji
const sessionPath = path.join(__dirname, 'session_data.json');

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
        console.log('Dane sesji zapisane:', newData);
    } catch (error) {
        console.error('Błąd zapisu session_data.json:', error);
    }
}

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
    // Możesz dodać dodatkową walidację adresu IP tutaj
    const config = readConfig();
    config.serverIP = serverIP;
    writeConfig(config);
    console.log('Konfiguracja zaktualizowana:', config);
    res.json({ message: 'Konfiguracja zaktualizowana', config });
});

// Endpoint do ładowania scen i użytkowników wraz z serverIP
app.get('/load', (req, res) => {
    const sessionData = readSessionData();

    // Dodanie serverIP do odpowiedzi
    const config = readConfig();
    sessionData.serverIP = config.serverIP;

    res.json(sessionData);
});

// Endpoint do zapisu danych scen i użytkowników
app.post('/save', (req, res) => {
    const { scenes, users } = req.body;
    console.log('Otrzymano dane do zapisu:', { scenes, users });

    if (!scenes || !users) {
        console.log('Brak scenes lub users w żądaniu');
        return res.status(400).json({ error: 'scenes i users są wymagane' });
    }

    try {
        const sessionData = readSessionData();
        // Aktualizacja użytkowników
        sessionData.users = users;
        // Aktualizacja scen - dodawanie nowych scen do istniejących
        scenes.forEach(newScene => {
            // Sprawdzenie czy scena o danym ID już istnieje
            const exists = sessionData.scenes.some(scene => scene.id === newScene.id);
            if (!exists) {
                sessionData.scenes.push(newScene);
            } else {
                console.log(`Scena o ID ${newScene.id} już istnieje. Pomijanie dodania.`);
            }
        });
        writeSessionData(sessionData);
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
    console.log('Zwrócono listę użytkowników');
    res.json({ users: usersList });
});

// --- Dodane Nowe Endpointy ---

// Endpoint do zapisu scen z timeline.html
app.post('/save-scenes', (req, res) => {
    const { scenes } = req.body;
    console.log('Otrzymano dane scen do zapisu:', scenes);

    if (!scenes) {
        console.log('Brak scenes w żądaniu');
        return res.status(400).json({ error: 'scenes są wymagane' });
    }

    try {
        const sessionData = readSessionData();
        // Dodawanie lub aktualizacja scen
        scenes.forEach(newScene => {
            // Sprawdzenie czy scena o danym ID już istnieje
            const sceneIndex = sessionData.scenes.findIndex(scene => scene.id === newScene.id);
            if (sceneIndex === -1) {
                // Dodanie nowej sceny
                sessionData.scenes.push(newScene);
                console.log(`Dodano nową scenę: ${newScene.id}`);
            } else {
                // Aktualizacja istniejącej sceny
                sessionData.scenes[sceneIndex] = {
                    ...sessionData.scenes[sceneIndex],
                    ...newScene,
                    cues: mergeCues(sessionData.scenes[sceneIndex].cues, newScene.cues)
                };
                console.log(`Zaktualizowano scenę: ${newScene.id}`);
            }
        });
        writeSessionData(sessionData);
        res.json({ message: 'Sceny zostały zapisane' });
    } catch (error) {
        console.error('Błąd podczas zapisywania scen:', error);
        res.status(500).json({ error: 'Błąd serwera podczas zapisywania scen' });
    }
});

// Funkcja do łączenia Cue w scenie (dodawanie nowych i aktualizacja istniejących)
function mergeCues(existingCues, newCues) {
    newCues.forEach(newCue => {
        const cueIndex = existingCues.findIndex(cue => cue.id === newCue.id);
        if (cueIndex === -1) {
            // Dodanie nowego Cue
            existingCues.push(newCue);
            console.log(`Dodano nowy Cue: ${newCue.id}`);
        } else {
            // Aktualizacja istniejącego Cue
            existingCues[cueIndex] = {
                ...existingCues[cueIndex],
                ...newCue
            };
            console.log(`Zaktualizowano Cue: ${newCue.id}`);
        }
    });
    return existingCues;
}

// Endpoint do pobierania wszystkich scen
app.get('/scenes', (req, res) => {
    const sessionData = readSessionData();
    console.log('Zwrócono listę scen');
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
            console.log(`Scena o ID ${sceneId} nie została znaleziona.`);
            return res.status(404).json({ error: 'Scena nie znaleziona' });
        }

        writeSessionData(sessionData);
        console.log(`Scena o ID ${sceneId} została usunięta.`);
        res.json({ message: 'Scena została usunięta' });
    } catch (error) {
        console.error('Błąd podczas usuwania sceny:', error);
        res.status(500).json({ error: 'Błąd serwera podczas usuwania sceny' });
    }
});

// --- Koniec Dodanych Endpointów ---

// Serwowanie plików statycznych z katalogu 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Serwer HTTP
const httpPort = 3000;
app.listen(httpPort, '0.0.0.0', () => {
    console.log(`Serwer HTTP działa na porcie ${httpPort}`);
});

// Serwer WebSocket (przykład z użyciem ws)
const WebSocket = require('ws');
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
