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

Editmode: 
Przywrócono prawidłowe działanie serwera więc wersja podstawowa działa poprawnie
*****************************************************************
Wyświetlanie listy wszystkich cue przypisanych do wybranej sceny:

Zmodyfikowałem funkcję renderScenes(), aby po kliknięciu na scenę, jej lista cue była wyświetlana w rozwijanej liście.
Każde cue jest wyświetlane z nazwą i czasem.
Kliknięcie na cue w liście otwiera modal do edycji tego cue.
Przypisanie długości utworów oraz informacji o cue do poszczególnych scen:

W funkcji handleFileUpload() plik audio jest wczytywany i zapisywany w currentScene.audioData.
Podczas przełączania scen w funkcji selectScene(), waveform jest aktualizowany zgodnie z plikiem audio przypisanym do wybranej sceny.
Cue są renderowane na waveformie dla aktualnej sceny w funkcji renderCuesOnWaveform().
Zapisywanie danych z modala na serwerze po kliknięciu przycisku "Zapisz":

W funkcji saveCueEdits() dodałem wywołanie saveScenesToServer(), aby po zapisaniu edycji cue dane zostały przesłane na serwer.
Przycisk "Zapisz" w modalu teraz również zamyka modal.
Dodatkowo, jeśli użytkownik zamknie modal klikając poza nim, funkcja closeEditCueModal() również zapisuje dane.
Inne zmiany:

W funkcji saveScenesToServer() usuwam audioData z danych wysyłanych na serwer, ponieważ nie można przesłać pliku audio jako JSON. Możesz rozważyć zapisanie pliku audio na serwerze w inny sposób, jeśli jest to konieczne.
Podczas ładowania scen z serwera w funkcji loadScenesFromServer(), aktualna scena jest automatycznie wybierana i ładowana.
Instrukcje dla Ciebie:

Testowanie aplikacji:

Tworzenie scen i dodawanie cue:

Utwórz kilka scen, wczytaj różne pliki audio do każdej z nich.
Dodaj cue do każdej sceny w różnych miejscach.
Upewnij się, że po przełączaniu scen waveform i cue są aktualizowane odpowiednio.
Edycja cue:

Kliknij na cue w liście scen, aby otworzyć modal.
Wprowadź wiadomości i URL dla poszczególnych użytkowników.
Po kliknięciu "Zapisz" upewnij się, że dane są zapisywane (możesz to sprawdzić, otwierając modal ponownie).
Zapisywanie na serwerze:

Po wprowadzeniu zmian upewnij się, że dane są zapisywane na serwerze.
Możesz to zweryfikować, odświeżając stronę i sprawdzając, czy sceny i cue są poprawnie ładowane.
Integracja z liveshow:

Upewnij się, że liveshow jest w stanie odbierać wiadomości przez WebSocket i wyświetlać je zgodnie z czasem cue.
Sprawdź, czy wiadomości i URL są poprawnie przesyłane do użytkowników w odpowiednich momentach.
Dalsze uwagi:

Jeśli pliki audio powinny być przechowywane na serwerze, będziesz musiał zaimplementować mechanizm ich przesyłania i przechowywania.
Upewnij się, że serwer obsługuje odpowiednie endpointy do zapisywania i ładowania scen.

########################################################
Przeniesienie cueUsersSelect.onchange poza funkcję renderScenes():

W Twoim kodzie zauważyłem, że przypisanie nasłuchiwacza cueUsersSelect.onchange znajdowało się wewnątrz funkcji renderScenes(), a dokładniej wewnątrz pętli iterującej przez sceny. To powodowało, że nasłuchiwacz był przypisywany wielokrotnie, co mogło prowadzić do błędów.

Przeniosłem przypisanie cueUsersSelect.onchange tuż po zdefiniowaniu elementów DOM, dzięki czemu nasłuchiwacz jest przypisywany tylko raz podczas inicjalizacji strony.

Usunięcie błędnego przypisania cueUsersSelect.onchange w renderScenes():

Usunąłem fragment kodu, w którym nasłuchiwacz cueUsersSelect.onchange był przypisywany wewnątrz renderScenes().
Upewnienie się, że funkcje openEditCueModal() i saveCueEdits() działają poprawnie:

Sprawdziłem te funkcje pod kątem błędów i upewniłem się, że poprawnie odwołują się do zmiennych i elementów DOM.
Sprawdzenie konsoli przeglądarki:

Zalecam uruchomienie aplikacji i sprawdzenie konsoli przeglądarki pod kątem ewentualnych błędów. Jeśli pojawią się jakieś błędy, mogą one wskazywać na inne problemy w kodzie.
########################

Sceny dodają się do editmode ale jeszcze sceny Cue się tam dodają 
do poprawy Liveshow bo nie rozrónia sceny regular i timeline 