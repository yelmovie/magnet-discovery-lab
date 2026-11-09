# 효과음·NPC 음성 변경과 권리 범위

기존 자석 도구의 snap·lid·pad·crate 및 탐험 효과음을 유지했다. NPC가 말하는 동안 효과음을 30%로 낮추고 종료 시 원래 크기로 복원한다. 주민·공방·마스코트 음성은 public/audio/voices/manifest.json에 Qwen3-TTS 및 Supertonic 3 모델과 대사·해시가 있다. 기존 효과음의 Kenney/Impact 라이선스 사본은 public/audio에 있다.

## 라이선스 구분

- 이번 변경은 프로젝트 재생 코드와 외부 샘플을 사용하지 않는 Web Audio 합성 수식이다. 새 외부 녹음이나 음성 생성 서비스는 사용하지 않았다.
- CC0는 해당 효과음에만 적용한다. 기존 제공 배경 음악·AI 음성·영상 전체가 무저작권이라는 뜻은 아니다.
- Qwen3-TTS 공식 코드/CustomVoice 모델은 Apache-2.0이다. 모델 라이선스와 생성 오디오의 저작권 지위는 별개이며, 교육 목적의 자체 대사 합성을 공공영역으로 재표시하지 않는다. 공식 모델: https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice
- Supertonic 3 모델은 OpenRAIL-M이다. 제6조는 제한사항을 제외하고 라이선서가 생성 결과에 권리를 주장하지 않는다고 규정한다. 사용 제한은 계속 적용되며 CC0가 아니다: https://huggingface.co/Supertone/supertonic-3/blob/main/LICENSE
- macOS say 음성을 새로 생성하지 않았고, 그 출력의 상업 재배포 권리를 주장하지 않는다. 마이크·음성인식 기능이나 외부 음성 전송을 추가하지 않았다.
- 기존 자막·저장 설정·음량 조절·사용자 입력 후 재생 동작은 유지한다. 실제 스피커의 청감 평가는 별도 확인 대상이다.

## 검증

- `npm test`: 259개 통과. 새 회귀 검사는 음성 중 효과음 감쇠·음소거 알림·테마별 합성음·음성 자원 해제 중 해당 프로젝트 변경을 검사한다.
- `npm run build`: 통과. Vite의 기존 대형 청크 경고는 남는다.
- 실제 설치된 Chrome: 각 프로젝트 음성 모듈과 실제 NPC 파일로 사용자 클릭 후 재생 시간 증가, 음소거 즉시 정지 확인. 미디어 오류와 페이지 오류 0. 재현 명령은 5magnet에서 `node scripts/audio-series-lifecycle.cjs`이다. 테스트 서버는 루프백 주소만 사용하고 종료 시 닫는다.
- 파일 전체의 청감·모든 대사 끝까지 듣기·iPad 실제 장치 출력은 이번 검사 범위가 아니다.
