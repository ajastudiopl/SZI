# SZI
Do działania należy wpisać w ustawieniach lokalny adres IP i wybrać zapisz.  

Strona editmode (główna) 
http://localhost:3000/editmode.html

Strona usera
http://localhost:3000/user.html?userId=user1

Strona Liveshow
http://localhost:3000/liveshow.html

Stabilna wersja działa przeze LAN, 

POPRAWKI: 

Wysyła przez sieć komunikaty przez WebSocket do odbiorców. 
*Liveshow działa też przez LAN 
*zapisuje IP w pliku 
*zapisuje i wczytuje sesje ze scenami i serami.
W zakładce Users: 
*Po wpisaniu nazwy użytkownika tworzy się nowego usera przez wciśnięcie enter a kursor automatycznie przechodzi do okna z nowym userem.

 Nowe: 
* wprowadzono moliwość personalizacji wyglądu z poziomu uytkownika strony user 
Users
* Tło dla strony i dla iframe jest domyślnie czarne 
* Pasek uytkownika jest teraz na dole strony 
Usuwanie Scen:

Dodanie Przyciski "Delete" dla Każdej Sceny:
Każdy element listy scen (li) zawiera teraz przycisk "Delete", który pozwala użytkownikowi usunąć scenę.
Funkcja deleteScene(sceneId):
Wywoływana po kliknięciu przycisku "Delete".
Wysyła żądanie DELETE do serwera, usuwając scenę o podanym id.
Aktualizuje front-end, usuwając scenę z lokalnej listy scenes i renderując zaktualizowaną listę scen i cue punktów.
Jeśli usunięta scena była aktualnie wybrana, wybiera nową scenę lub usuwa waveform, jeśli nie ma żadnych scen.
Ograniczenie Tworzenia Cue Punktów:

Zmiana Funkcji addCueAtCurrentTime:
Upewnia się, że Cue punkty są dodawane tylko wtedy, gdy użytkownik kliknie przycisk "Add Cue at Current Time".
Zapobiega automatycznemu tworzeniu Cue punktów podczas załadowania pliku audio czy innych działań.
Poprawa Funkcji clearCues:
Funkcja ta nie resetuje już listy scen, co pozwala na zachowanie istniejących scen i Cue punktów.
Obsługa Różnych Plików Audio dla Każdej Sceny:

Pole audioURL i audioDuration w Scenie:
Każda scena zawiera teraz audioURL, który przechowuje ścieżkę do pliku audio, oraz audioDuration, który przechowuje czas trwania pliku audio.
Funkcja renderAudioForCurrentScene():
Odpowiada za renderowanie WaveSurfer dla aktualnie wybranej sceny.
Zniszczenie istniejącej instancji WaveSurfer przed załadowaniem nowego pliku audio, aby uniknąć konfliktów.
Aktualizuje audioDuration sceny po załadowaniu pliku audio i zapisuje zmiany na serwerze.
Zmiany w Funkcji handleFileUpload(event):
Usuwa istniejącą instancję WaveSurfer przed stworzeniem nowej.
Ładuje plik audio do aktualnie wybranej sceny i aktualizuje jej audioDuration.
Funkcja saveScenesToServer():
Wysyła wszystkie dane scen na serwer, w tym audioURL i audioDuration.
Poprawa Zapisu Cue Punktów z Przypisanymi Wiadomościami:

Funkcja saveCueEdits():
Aktualizuje Cue punkt z wybranymi użytkownikami i ich wiadomościami.
Po zapisaniu, wywołuje funkcję saveScenesToServer() aby zaktualizować dane na serwerze.
Pobieranie Użytkowników z Serwera:

Funkcja fetchUsers():
Pobiera listę użytkowników z endpointu /users i dynamicznie generuje opcje w selekcie użytkowników w modalu edycji Cue.
Dzięki temu lista użytkowników jest zawsze aktualna i zarządzana centralnie na serwerze.
Renderowanie Scen i Cue Punktów po Załadowaniu Strony:

Funkcja loadScenesFromServer():
Pobiera wszystkie sceny z serwera przy użyciu endpointu /scenes.
Inicjalizuje lokalną listę scenes i ustawia pierwszą scenę jako aktualną.
Jeśli wybrana scena ma przypisany plik audio, renderuje go za pomocą WaveSurfer.
Poprawki w Funkcji addCue():

Zapobieganie Nadmiernemu Tworzeniu Cue:
Upewnia się, że Cue punkty są dodawane tylko wtedy, gdy są ręcznie inicjowane przez użytkownika.
Zapis Cue Punktów na Serwerze:
Po dodaniu Cue punktu, wywoływana jest funkcja saveScenesToServer() aby zapisać zmiany na serwerze.