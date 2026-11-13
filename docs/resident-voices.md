# 캐릭터 한국어 음성

5번 자석 도시의 캐릭터 12명과 36개 대사를 ElevenLabs v4로 합성했다. 지도 주민 20개, 시민 발명 공방 주민 5개, 밀이·당이의 타이틀 2개와 인트로·엔딩 9개를 포함한다. 게임에서 이미 만들어진 로컬 MP3를 재생하므로 API 키나 음성 생성 서버가 필요하지 않다.

| 캐릭터 | 음성 |
| --- | --- |
| 우체부 | Klamon |
| 재료 연구원 | 수진 |
| 시계탑 지기 | Grandfather Namchun |
| 수조 관리인 | SK |
| 발명가 | 선율 v1 |
| 밀이 | oki |
| 당이 | Aria |
| 담임 선생님 | Sara Kim |
| 도서관 사서 | Taek |
| 옆집 할머니 | Haemi |
| 1층 가게 주인 | MyungIn |
| 급식실 조리사 | Eunhye |

대사는 `public/audio/voices/manifest.json`에 목소리 ID, 생성 ID, 길이와 SHA-256으로 기록한다. 로컬 한국어 전사 결과는 `docs/resident-voice-transcription.json`에 있다. 자막과 음성이 어긋나거나 문장이 잘리지 않도록, 인트로·엔딩의 짧은 장면 세 곳은 대사를 줄여 다시 만들었다. 나머지 영상 대사도 전체 음성을 보존하면서 길이를 맞췄다. 영상 자체에 들어 있는 효과음과 게임 배경음은 기존 소스다.

- 지도 주민: `public/audio/voices/resident-{1..5}-{hello|again|news|science}.mp3`
- 공방 주민: `public/audio/voices/workshop-{eraser|pins|bag|door|cup}.mp3`
- 밀이·당이: `public/audio/voices/mascot-{mili|dangi}-title.mp3`, `public/audio/voices/story-{intro|final}-{번호}.mp3`

이전 생성 코드와 라이선스 사본은 과거 버전의 제작 기록이다. 현재 재생과 빌드에는 필요하지 않다.
