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

// Ścieżka do pliku sesji
const sessionPath = path.join(__dirname, 'session_data.json');

// Endpoint do ładowania scen i użytkowników wraz z serverIP
app.get('/load', (req, res) => {
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
    let usersList = [];
    if (fs.existsSync(sessionPath)) {
        try {
            const data = fs.readFileSync(sessionPath, 'utf8');
            const sessionData = JSON.parse(data);
            usersList = sessionData.users;
            console.log('Zwrócono listę użytkowników');
        } catch (error) {
            console.error('Błąd odczytu session_data.json:', error);
            return res.status(500).json({ error: 'Błąd serwera podczas odczytu użytkowników' });
        }
    } else {
        // Jeśli session_data.json nie istnieje, zwróć domyślnych użytkowników
        const defaultUsers = [
            { id: 'user1', name: 'Jan Kowalski' },
            { id: 'user2', name: 'Anna Nowak' },
            // Dodaj więcej użytkowników w zależności od potrzeb
        ];
        usersList = defaultUsers;
        console.log('Zwrócono domyślną listę użytkowników');
    }

    res.json({ users: usersList });
});

// Serwowanie plików statycznych z katalogu 'public'
// Zakładając, że katalog 'public' znajduje się na poziomie głównym projektu,
// obok katalogu 'server', użyjemy '../public'.
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
