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
testowy dopisek