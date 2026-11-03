# 마을 주민 한국어 음성

마을 주민 5명의 첫 인사·다시 만난 인사·소식·과학 설명을 한국어 음성 20개로 만들었다. 게임은 MP3만 읽으며, 플레이 중 음성 합성 서버나 API에 접속하지 않는다. 화면 대사와 음성 대사는 같은 원문에서 가져온다.

## 제작과 사용 권리

- 모델: [Supertone Supertonic 2](https://huggingface.co/Supertone/supertonic-2), 공개 기본 목소리 M3·F2·M5·M1·F4.
- 모델 고정 버전: `75e6727618a02f323c720cba9478152d4bc16ca4`.
- 모델/기본 목소리 라이선스: [OpenRAIL-M 원문](https://huggingface.co/Supertone/supertonic-2/blob/75e6727618a02f323c720cba9478152d4bc16ca4/LICENSE). 2·3항은 비용이나 로열티 없이 사용할 권리를 부여하며, 상업적 사용을 금지하지 않는다. 6항은 제공자가 생성 결과에 권리를 주장하지 않는다고 명시한다. 금지된 유해 용도 등 원문의 사용 조건은 계속 적용된다.
- 추론 코드: [공식 Supertonic Node helper](https://github.com/supertone-oss-archive/supertonic/blob/1e9799e964ea4c0dad7cde993b65c3c813a7b373/nodejs/helper.js), MIT. 저장소는 보관 상태이며 현재 제공되는 코드와 모델을 내려받아 로컬에서 실행했다.
- 원문 사본: `public/audio/voices/model-license.txt`, `public/audio/voices/source-license.txt`.
- 인물의 목소리를 녹음하거나 복제하지 않았다. 공개 모델의 기본 목소리로 프로젝트 대사를 합성했다. 유료 API, 체험 크레딧, 클라우드 가입을 사용하지 않았다.
- 약 264MB의 모델과 생성 도구는 개발 컴퓨터의 임시 폴더에만 있다. 게임 배포에는 MP3·목록·라이선스만 들어간다.

## 목소리 배정

| 주민 | 기본 목소리 | 속도 | 대사 방향 |
| --- | --- | --- | --- |
| 우체부 | M3 | 1.00 | 밝고 경쾌한 인사 |
| 재료 연구원 | F2 | 0.98 | 호기심이 느껴지는 또렷한 설명 |
| 시계탑 지기 | M5 | 0.98 | 차분하고 여유 있는 설명 |
| 수조 관리인 | M1 | 0.98 | 다정한 안내 |
| 발명가 | F4 | 1.00 | 활기찬 초대 |

역할에 맞는 성별의 기본 음색과 말하기 속도를 배정했다. 표의 대사 방향은 연출 의도이며, 별도의 감정 생성 기능을 사용한 것은 아니다.

## 출력

`public/audio/voices/resident-{1..5}-{hello|again|news|science}.mp3`

- 한국어, 44.1kHz, 모노, MP3 96kbps.
- 문장 단위로 생성한 뒤 0.19초 간격으로 연결했다. 긴 문장의 끝이 생략되는 현상을 줄이기 위한 처리다.
- 음량을 -18 LUFS 기준으로 맞추고 시작 부분에 아주 짧은 페이드를 적용했다.
- `manifest.json`에 원문·음성 ID·속도·길이·파일 크기·SHA-256을 기록했다.

## 다시 만들기

이 작업은 웹앱 빌드에 필요하지 않다. 다른 컴퓨터에서도 기존 MP3를 그대로 사용할 수 있다. 대사를 수정할 때만 현재 OS에 맞는 별도의 생성 환경을 준비한다. 프로젝트의 기존 `node_modules`나 lockfile은 바꾸지 않는다.

1. 프로젝트 밖 임시 폴더를 하나 만들고 `npm install --prefix <임시폴더> onnxruntime-node@1.23.2`로 Windows 또는 macOS용 런타임을 설치한다.
2. 위 고정 모델 버전의 `onnx/` 폴더에 있는 6개 파일과 `voice_styles/`의 기본 음성 JSON을 임시 폴더의 같은 구조로 내려받는다.
3. 위 고정 코드 버전의 `nodejs/helper.js`를 임시 폴더의 `helper.mjs`로 저장한다. MIT 원문도 함께 보관한다.
4. 현재 OS용 FFmpeg 경로를 지정해 다음 명령을 실행한다.

```sh
node scripts/generate-resident-voices.mjs --runtime "<임시폴더>" --ffmpeg "<현재 OS의 FFmpeg 실행 파일>"
```

스크립트는 `src/resident-chat.ts`의 인사·소식과 `src/expedition.ts`의 과학 설명을 읽는다. 각 대사가 5개인지 검사하고, 음성에 NaN·무음·비정상 길이가 있으면 중단한다. 모델은 확률적으로 생성하므로 재생성 결과의 해시는 바뀔 수 있다.

## 검증 범위

Windows x64, Node 24에서 생성했다. 네 ONNX 파일의 SHA-256이 공식 Hugging Face LFS 해시와 일치하는지 확인했다. 모든 MP3의 유효한 파형과 길이를 검사했고 로컬 Whisper base 한국어 받아쓰기로 문장 누락을 대조했다. 받아쓰기는 동음이의어·띄어쓰기를 틀릴 수 있으며 사람의 청취 평가를 대신하지 않는다. 현재 도구는 오디오 입력을 지원하지 않아 자연스러운 억양에 대한 직접 청취 평가는 수행하지 않았다. macOS에서 재생성하는 과정은 아직 실행하지 않았다.
