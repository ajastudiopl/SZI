// js/main.js

// Inicjalizacja zmiennych
let scenes = [];
let users = [];
let currentSceneIndex = null;
let currentAppearanceSceneIndex = null;

// Funkcja obsługująca zakładki
function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tab-content");
    for (const tab of tabcontent) {
        tab.classList.remove("active");
    }
    const tablinks = document.getElementsByClassName("tablink");
    for (const link of tablinks) {
        link.classList.remove("active");
    }
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// Funkcja zapisu danych na serwer
function loadData() {
    fetch(`/load`)
        .then(response => response.json())
        .then(data => {
            // Filtrujemy tylko sceny typu 'regular'
            scenes = (data.scenes || []).filter(scene => scene.type === 'regular');
            users = data.users || [];
            if (users.length === 0) {
                users.push({ id: 'user1', name: '' });
            }
            renderSceneList();
            renderUserList();
            document.getElementById('ip-address').value = data.serverIP || 'localhost';
            saveConfigIP(data.serverIP || 'localhost');
        })
        .catch(error => console.error('Błąd podczas ładowania danych z serwera:', error));
}
// Funkcja ładowania danych z serwera
function loadData() {
    fetch(`/load`) // Użycie relatywnej ścieżki
        .then(response => response.json())
        .then(data => {
            scenes = data.scenes || [];
            users = data.users || [];
            if (users.length === 0) {
                users.push({ id: 'user1', name: '' });
            }
            renderSceneList();
            renderUserList();
            document.getElementById('ip-address').value = data.serverIP || 'localhost';
            saveConfigIP(data.serverIP || 'localhost'); // Automatyczne zapisanie serverIP
        })
        .catch(error => console.error('Błąd podczas ładowania danych z serwera:', error));
}

// Funkcja renderowania listy użytkowników
function renderUserList() {
    const userListDiv = document.getElementById('user-list');
    userListDiv.innerHTML = '<h2>Lista użytkowników</h2>';
    users.forEach((user, index) => {
        const userId = user.id;
        const userDiv = document.createElement('div');
        userDiv.classList.add('user-item');
        userDiv.innerHTML = `
            <label for="${userId}">${userId}:</label>
            <input type="text" id="${userId}" placeholder="Wpisz nazwę użytkownika" value="${user.name}" oninput="updateUser(${index})" onkeypress="handleUserEnter(event, ${index})">
            <button onclick="removeUser(${index})">Usuń</button>
        `;
        userListDiv.appendChild(userDiv);
    });
}

// Funkcja obsługująca naciśnięcie klawisza Enter w polu użytkownika
function handleUserEnter(event, index) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addUser();
    }
}

// Funkcja dodawania nowego użytkownika
function addUser(userName = '') {
    const nextIndex = users.length + 1;
    if (nextIndex > 50) {
        alert('Maksymalna liczba użytkowników to 50.');
        return;
    }
    const userId = 'user' + nextIndex;
    users.push({ id: userId, name: userName });
    renderUserList();
    saveData();
    // Ustawienie fokusu na nowo dodanym użytkowniku
    document.getElementById(userId).focus();
}

// Funkcja usuwania użytkownika
function removeUser(index) {
    if (confirm('Czy na pewno chcesz usunąć tego użytkownika?')) {
        users.splice(index, 1);
        renderUserList();
        saveData();
    }
}

// Funkcja aktualizacji nazwy użytkownika
function updateUser(index) {
    const userInput = document.getElementById(users[index].id).value;
    users[index].name = userInput;
    saveData();
}

// Funkcja dodawania nowej sceny
function addNewScene() {
    const title = document.getElementById('new-scene-title').value.trim();
    const content = document.getElementById('new-scene-content').value.trim();

    if (title) {
        const newSceneId = scenes.length > 0 ? Math.max(...scenes.map(s => s.id)) + 1 : 1;
        // **Dodano właściwość type: 'regular'**
        const newScene = { id: newSceneId, type: 'regular', title, content, users: {}, multimedia: {}, order: scenes.length + 1 };
        scenes.push(newScene);
        saveData();
        renderSceneList();
        document.getElementById('new-scene-title').value = '';
        document.getElementById('new-scene-content').value = '';
    } else {
        alert('Podaj tytuł sceny!');
    }
}

// Funkcja kopiowania sceny
function copyScene(index) {
    const sceneToCopy = scenes[index];
    const copiedScene = JSON.parse(JSON.stringify(sceneToCopy)); // Głęboka kopia sceny
    copiedScene.title = sceneToCopy.title + ' (duplikat)'; // Zmieniamy tytuł duplikatu
    copiedScene.id = scenes.length > 0 ? Math.max(...scenes.map(s => s.id)) + 1 : 1; // Nowe unikalne ID
    copiedScene.order = scenes.length + 1; // Ustawiamy odpowiedni numer porządkowy
    scenes.push(copiedScene); // Dodajemy duplikat do listy scen
    saveData(); // Zapisujemy zmiany
    renderSceneList(); // Renderujemy zaktualizowaną listę
}

// Funkcja renderowania listy scen
function renderSceneList() {
    const sceneListDiv = document.getElementById('scene-list');
    sceneListDiv.innerHTML = '';

    // Renderowanie scen bez sortowania, aby zachować oryginalną kolejność
    scenes.forEach((scene, index) => {
        const sceneDiv = document.createElement('div');
        sceneDiv.classList.add('scene');
        sceneDiv.setAttribute('data-index', index);
        sceneDiv.innerHTML = `
            <button class="remove-scene" onclick="removeScene(${index})">X</button>
            <button class="edit-appearance" onclick="editSceneAppearance(${index})">Widok</button>
            <button class="copy-scene" onclick="copyScene(${index})">Copy</button>
            <button class="edit-scene" onclick="editScene(${index})">Edytuj</button>
            <strong>
                <span class="scene-order">${scene.order}</span>.
                <span class="scene-title" onclick="editScene(${index})">${scene.title}</span>
            </strong><br>
            <span class="scene-content">${scene.content}</span>
        `;
        sceneListDiv.appendChild(sceneDiv);
    });

    // Umożliwienie sortowania listy scen
    $("#scene-list").sortable({
        items: ".scene",
        update: function(event, ui) {
            // Zaktualizuj kolejność scen w tablicy bez zmieniania 'order'
            const newOrder = [];
            $(".scene").each(function() {
                const index = $(this).data("index");
                newOrder.push(scenes[index]);
            });
            scenes = newOrder;
            saveData();
            renderSceneList();
        }
    });
}

// Funkcja usuwania sceny
function removeScene(index) {
    if (confirm('Czy na pewno chcesz usunąć tę scenę?')) {
        scenes.splice(index, 1);
        saveData();
        renderSceneList();
    }
}

// Funkcja edytowania sceny
function editScene(index) {
    currentSceneIndex = index;
    const scene = scenes[index];
    document.getElementById('scene-title-header').textContent = `${scene.order}. ${scene.title}`;
    document.getElementById('scene-description-header').value = scene.content;

    // Reset "Select All Users" checkbox
    document.getElementById('select-all-users').checked = false;

    const sendToManyUsersDiv = document.getElementById('send-to-many-users');
    sendToManyUsersDiv.innerHTML = '';
    users.forEach((user) => {
        const userCheckboxHtml = `
            <label>
                <input type="checkbox" class="send-to-many-user-checkbox" data-user-id="${user.id}">
                ${user.name}
            </label><br>
        `;
        sendToManyUsersDiv.innerHTML += userCheckboxHtml;
    });

    document.getElementById('content-to-many').value = '';

    const selectUsersContentDiv = document.getElementById('select-users-content');
    selectUsersContentDiv.innerHTML = '';
    let tabindexCounter = 1; // Initialize tabindex counter
    users.forEach((user) => {
        const userContent = scene.users[user.id] || '';
        const multimediaContent = scene.multimedia[user.id] || { type: 'Brak', value: '' };
        const userChecked = scene.userSelections && scene.userSelections[user.id] !== undefined ? scene.userSelections[user.id] : true;
        const userHtml = `
            <div>
                <label>
                    <input type="checkbox" class="user-checkbox" data-user-id="${user.id}" ${userChecked ? 'checked' : ''} onchange="toggleUserContent('${user.id}')" tabindex="-1">
                    ${user.name}
                </label>
                <div id="user-content-wrapper-${user.id}" style="${userChecked ? '' : 'display: none;'}">
                    <label for="user-content-${user.id}-${index}">Treść dla użytkownika:</label>
                    <textarea id="user-content-${user.id}-${index}" oninput="saveEditedScene(${index})" tabindex="${tabindexCounter++}">${userContent}</textarea>
                    <label for="attachment-${user.id}-${index}">Załącznik:</label>
                    <select id="attachment-type-${user.id}-${index}" onchange="saveAttachment(${index}, '${user.id}')" tabindex="-1">
                        <option value="Brak" ${multimediaContent.type === 'Brak' ? 'selected' : ''}>Brak</option>
                        <option value="Obraz" ${multimediaContent.type === 'Obraz' ? 'selected' : ''}>Obraz</option>
                        <option value="Dźwięk" ${multimediaContent.type === 'Dźwięk' ? 'selected' : ''}>Dźwięk</option>
                        <option value="Wideo" ${multimediaContent.type === 'Wideo' ? 'selected' : ''}>Wideo</option>
                    </select>
                    <input type="text" id="attachment-value-${user.id}-${index}" placeholder="URL lub ścieżka do pliku" value="${multimediaContent.value}" oninput="saveAttachment(${index}, '${user.id}')" tabindex="-1">
                </div>
            </div>
        `;
        selectUsersContentDiv.innerHTML += userHtml;
    });

    document.getElementById('editSceneModal').style.display = 'block';

    // Add click listener for outside modal
    setTimeout(() => {
        window.addEventListener('click', outsideClickListener);
    }, 0);

    // Add event listeners to textareas for Tab navigation
    const textareas = document.querySelectorAll(`#select-users-content textarea`);

    textareas.forEach((textarea, idx) => {
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const nextIndex = idx + 1;
                if (nextIndex < textareas.length) {
                    textareas[nextIndex].focus();
                }
            }
        });
    });
}

// Funkcja przełączania opcji "Send to many"
function toggleSendToManyOptions() {
    const optionsDiv = document.getElementById('send-to-many-options');
    if (optionsDiv.style.display === 'none' || optionsDiv.style.display === '') {
        optionsDiv.style.display = 'block';
    } else {
        optionsDiv.style.display = 'none';
    }
}

// Funkcja zaznaczania wszystkich użytkowników
function toggleSelectAllUsers() {
    const selectAllChecked = document.getElementById('select-all-users').checked;
    const checkboxes = document.querySelectorAll('.send-to-many-user-checkbox');
    checkboxes.forEach((checkbox) => {
        checkbox.checked = selectAllChecked;
    });
}

// Funkcja zapisywania treści dla wybranych użytkowników
function saveContentToMany() {
    const content = document.getElementById('content-to-many').value;
    const scene = scenes[currentSceneIndex];
    const checkboxes = document.querySelectorAll('.send-to-many-user-checkbox');
    checkboxes.forEach((checkbox) => {
        const userId = checkbox.getAttribute('data-user-id');
        if (checkbox.checked) {
            scene.users[userId] = content;
            if (!scene.userSelections) scene.userSelections = {};
            scene.userSelections[userId] = true;
        }
    });
    saveData();
}

// Funkcja przełączania zawartości użytkownika
function toggleUserContent(userId) {
    const checkbox = document.querySelector(`.user-checkbox[data-user-id="${userId}"]`);
    const contentWrapper = document.getElementById(`user-content-wrapper-${userId}`);
    if (checkbox.checked) {
        contentWrapper.style.display = '';
    } else {
        contentWrapper.style.display = 'none';
        // Usunięcie treści i załączników dla tego użytkownika
        const scene = scenes[currentSceneIndex];
        if (!scene.userSelections) scene.userSelections = {};
        scene.userSelections[userId] = false;
        delete scene.users[userId];
        delete scene.multimedia[userId];
        saveData();
    }
}

// Funkcja nasłuchiwania kliknięcia poza modalem
function outsideClickListener(event) {
    const modal = document.getElementById('editSceneModal');
    if (!modal.contains(event.target) && event.target !== modal && event.target.closest('#editSceneModal') === null) {
        closeEditModal();
    }
}

// Funkcja zamykania modala edycji sceny
function closeEditModal() {
    document.getElementById('editSceneModal').style.display = 'none';
    window.removeEventListener('click', outsideClickListener);
}

// Funkcja zapisywania tytułu sceny
function saveEditedTitle() {
    const sceneTitle = document.getElementById('scene-title-header').textContent;
    scenes[currentSceneIndex].title = sceneTitle;
    saveData();
    renderSceneList();
}

// Funkcja zapisywania opisu sceny
function saveEditedDescription() {
    const sceneDescription = document.getElementById('scene-description-header').value;
    scenes[currentSceneIndex].content = sceneDescription;
    saveData();
    renderSceneList();
}

// Funkcja zapisywania treści sceny
function saveEditedScene(index) {
    const scene = scenes[index];
    users.forEach((user) => {
        const checkbox = document.querySelector(`.user-checkbox[data-user-id="${user.id}"]`);
        if (checkbox.checked) {
            const userContent = document.getElementById(`user-content-${user.id}-${index}`).value;
            scene.users[user.id] = userContent;
            if (!scene.userSelections) scene.userSelections = {};
            scene.userSelections[user.id] = true;
        } else {
            delete scene.users[user.id];
            delete scene.multimedia[user.id];
            if (!scene.userSelections) scene.userSelections = {};
            scene.userSelections[user.id] = false;
        }
    });
    saveData();
}

// Funkcja zapisywania załączników sceny
function saveAttachment(index, userId) {
    const type = document.getElementById(`attachment-type-${userId}-${index}`).value;
    const value = document.getElementById(`attachment-value-${userId}-${index}`).value;
    scenes[index].multimedia[userId] = { type, value };
    saveData();
}

// Funkcja aktualizacji tytułu sceny w liście
function editSceneTitle(index) {
    const titleElement = document.querySelector(`[data-index="${index}"] .scene-title`);
    const newTitle = titleElement.textContent;
    scenes[index].title = newTitle;
    saveData();
}

// Funkcja aktualizacji opisu sceny w liście
function editSceneContent(index) {
    const contentElement = document.querySelector(`[data-index="${index}"] .scene-content`);
    const newContent = contentElement.textContent;
    scenes[index].content = newContent;
    saveData();
}

// Funkcja nawigacji między scenami w modal
function navigateScene(direction) {
    if (direction === 'prev' && currentSceneIndex > 0) {
        editScene(currentSceneIndex - 1);
    } else if (direction === 'next' && currentSceneIndex < scenes.length - 1) {
        editScene(currentSceneIndex + 1);
    }
}

// Funkcja tworzenia nowej sesji
function newSession() {
    if (confirm('Czy na pewno chcesz rozpocząć nową sesję? Wszystkie dane zostaną usunięte.')) {
        scenes = [];
        users = [];
        saveData();
        renderSceneList();
        renderUserList();
    }
}

// Funkcja zapisywania sesji do pliku
function saveSessionToFile() {
    const sessionData = {
        scenes,
        users,
        serverIP: 'localhost' // Możesz to usunąć, jeśli nie jest potrzebne
    };
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sesja_szi.json';
    link.click();
}

// Funkcja ładowania sesji z pliku
function loadSessionFromFile() {
    const fileInput = document.getElementById('load-session-file');
    const file = fileInput.files[0];
    if (!file) {
        alert('Proszę wybrać plik do wczytania.');
        return;
    }
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            scenes = data.scenes || [];
            users = data.users || [];
            const serverIP = data.serverIP || 'localhost';
            document.getElementById('ip-address').value = serverIP;
            saveConfigIP(serverIP); // Automatyczne zapisanie serverIP na serwerze
            renderSceneList();
            renderUserList();
            saveData(); // Zapisanie aktualnych danych na serwer
        } catch (error) {
            alert('Błąd podczas ładowania sesji: ' + error.message);
            console.error('Błąd podczas ładowania sesji:', error);
        }
    };

    reader.readAsText(file);
}

// Funkcja inicjalizacji WebSocket (opcjonalnie, jeśli używasz WebSocket)
function initWebSocket() {
    // Przykład inicjalizacji WebSocket
    /*
    const socket = new WebSocket(`ws://${window.location.hostname}:8080`);
    socket.onopen = function() {
        console.log('WebSocket połączony');
    };
    socket.onmessage = function(event) {
        // Obsługa otrzymanych wiadomości
    };
    socket.onclose = function() {
        console.log('WebSocket rozłączony');
    };
    socket.onerror = function(error) {
        console.error('WebSocket błąd:', error);
    };
    */
}

// Funkcja obsługi przycisku "Edytuj Sceny"
function editScenes() {
    if (scenes.length > 0) {
        editScene(0); // Otwórz modal zaczynając od pierwszej sceny
    } else {
        alert('Brak scen do edycji.');
    }
}

// Funkcja edytowania wyglądu sceny
function editSceneAppearance(index) {
    currentAppearanceSceneIndex = index;
    const scene = scenes[index];

    // Ustawienia wyglądu
    const appearance = scene.appearance || {
        fontSize: '16px',
        multimediaHeight: '300px',
        // domyślne wartości
    };

    // Ustawienie wartości w inputach
    document.getElementById('font-size').value = parseInt(appearance.fontSize);
    document.getElementById('font-size-value').textContent = appearance.fontSize;
    document.getElementById('multimedia-height').value = parseInt(appearance.multimediaHeight);
    document.getElementById('multimedia-height-value').textContent = appearance.multimediaHeight;

    // Generowanie podglądu sceny
    generateScenePreview(scene, appearance);

    // Wyświetlenie modala
    document.getElementById('editSceneAppearanceModal').style.display = 'block';
}

// Funkcja zamykania modala edycji wyglądu sceny
function closeEditAppearanceModal() {
    document.getElementById('editSceneAppearanceModal').style.display = 'none';
}

// Funkcja aktualizacji ustawień wyglądu
function updateAppearance(property, value) {
    const scene = scenes[currentAppearanceSceneIndex];
    if (!scene.appearance) {
        scene.appearance = {};
    }
    scene.appearance[property] = value;

    // Aktualizacja wyświetlanej wartości obok suwaka
    if (property === 'fontSize') {
        document.getElementById('font-size-value').textContent = value;
    } else if (property === 'multimediaHeight') {
        document.getElementById('multimedia-height-value').textContent = value;
    }

    // Aktualizacja podglądu sceny
    generateScenePreview(scene, scene.appearance);
}

// Funkcja generowania podglądu sceny
function generateScenePreview(scene, appearance) {
    const previewDiv = document.getElementById('scene-preview');
    previewDiv.innerHTML = '';

    // Tworzenie elementów podglądu
    const instructionElement = document.createElement('h1');
    instructionElement.textContent = 'Przykładowa instrukcja';
    instructionElement.style.fontSize = appearance.fontSize;

    const multimediaDiv = document.createElement('div');
    multimediaDiv.style.height = appearance.multimediaHeight;
    multimediaDiv.style.backgroundColor = '#eee';
    multimediaDiv.textContent = 'Sekcja multimediów';

    // Dodanie elementów do podglądu
    previewDiv.appendChild(instructionElement);
    previewDiv.appendChild(multimediaDiv);
}

// Funkcja zapisywania zmian wyglądu
function saveAppearanceChanges() {
    // Zapisanie danych i odświeżenie listy scen
    saveData();
    renderSceneList();
    closeEditAppearanceModal();
    alert('Zmiany wyglądu zostały zapisane.');
}

// Funkcja zapisywania adresu IP do serwera (niepotrzebna po użyciu relatywnych ścieżek)
function saveIpAddress() {
    const ipAddress = document.getElementById('ip-address').value.trim();
    if (ipAddress) {
        fetch(`/config`, { // Użycie relatywnej ścieżki
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverIP: ipAddress })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Błąd: ' + data.error);
            } else {
                alert(data.message);
                // Aktualizacja API URL na podstawie nowego IP
                loadData();
            }
        })
        .catch(error => {
            alert('Błąd podczas zapisywania adresu IP: ' + error.message);
            console.error('Błąd podczas zapisywania adresu IP:', error);
        });
    } else {
        alert('Proszę podać prawidłowy adres IP.');
    }
}

// Funkcja zapisywania adresu IP w config.json (niepotrzebna po użyciu relatywnych ścieżek)
function saveConfigIP(serverIP) {
    if (serverIP) {
        fetch(`/config`, { // Użycie relatywnej ścieżki
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverIP })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Błąd: ' + data.error);
            } else {
                console.log('Adres IP zapisany automatycznie.');
            }
        })
        .catch(error => {
            console.error('Błąd podczas automatycznego zapisywania adresu IP:', error);
        });
    }
}

// Funkcja nasłuchiwania klawiszy skrótów
document.addEventListener('keydown', function(event) {
    if (event.code === 'Backquote') { // Klawisz ` (backquote)
        window.location.href = 'liveshow.html';
    }

    if (event.code === 'BracketLeft') { // Klawisz [
        navigateScene('prev');
    }
    if (event.code === 'BracketRight') { // Klawisz ]
        navigateScene('next');
    }

    if (event.code === 'Escape') {
        closeEditModal();
        closeEditAppearanceModal();
    }
});

// Funkcja inicjalizacji po załadowaniu strony
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

// Funkcja aktualizacji numeru porządkowego sceny (nie zmieniać)
function editSceneOrder(index) {
    const orderElement = document.querySelector(`[data-index="${index}"] .scene-order`);
    const newOrder = parseInt(orderElement.textContent);
    if (!isNaN(newOrder)) {
        scenes[index].order = newOrder;
        saveData();
        renderSceneList();
    }
}
