# 오피스 영어 퀘스트
회사 업무 시뮬레이션 속 선택형 영어 퀴즈를 풀며 표현과 관계도를 쌓아 가는 3일짜리 비주얼노벨 학습 게임입니다.
## 실행 방법
### 개발 모드
```bash
npm install
npm run dev
```
백엔드는 별도 터미널에서 실행합니다.
```bash
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
### 프로덕션 빌드
```bash
npm run build
```
### GitHub Pages 배포
`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 빌드하고 GitHub Pages에 올립니다.
- 배포 주소: <https://csdcsggdf31.github.io/office-english-quest/>
- 빌드 결과물은 프로젝트 경로(`/office-english-quest/`)에 맞춰 자산 경로가 잡힙니다(`vite.config.ts`의 `base`).
- GitHub Pages에는 FastAPI를 함께 올릴 수 없어서, 배포 빌드에서는 `src/lib/localApi.ts`가 서버 API를 대신합니다. 플레이 기록·답변·날짜 전환·점수판은 브라우저 `localStorage`(`office-english-quest-store-v1`)에 저장되고, 화면 코드는 서버가 있을 때와 같은 응답을 받습니다.
- 개발 서버(`npm run dev`)는 기존처럼 `vite.config.ts`의 프록시를 통해 FastAPI(`127.0.0.1:8000`)로 연결되고, 서버가 없으면 같은 `localStorage` 저장소로 자동 대체됩니다.
## 기술 스택
| 구분 | 구성 |
| --- | --- |
| 프런트엔드 | React 18, TypeScript, Vite |
| 백엔드 | FastAPI |
| 데이터베이스 | 로컬 개발: SQLite (`data/app.db`) · GitHub Pages: 브라우저 `localStorage` |
| 사운드 | Web Audio API로 합성한 BGM 및 효과음 |
| 화면 연출 | CSS 레이어, 그라데이션, 인라인 캐릭터 일러스트 |
## 화면 흐름
```text
홈
 ├─ 새 게임 시작
 │   └─ DAY 1 (8장면)
 │       └─ DAY 1 결과
 │           └─ DAY 2 (8장면)
 │               └─ DAY 2 결과
 │                   └─ DAY 3 (8장면)
 │                       └─ 엔딩 결과 (S / A / B / C)
 │                           └─ 엔딩 도감
 ├─ 이어하기
 │   └─ 저장한 장면부터 게임 재개
 ├─ 엔딩 도감
 │   └─ 해금한 엔딩 요약 보기
 └─ 표현 복습장 / 오답 노트
```
게임 중에는 표현 복습장, 대화 로그, 관계도, AUTO/SKIP 진행 기능을 사용할 수 있습니다.
## 데이터 구조
### 장면 (`scene`)
| 필드 | 설명 |
| --- | --- |
| `id` | 장면 고유 ID. 예: `d1s1` |
| `day` | 진행 날짜(1~3) |
| `time` | 장면 시간 |
| `place` | 장소 또는 장면 제목에 해당하는 정보 |
| `relationKey` | 영향을 받는 인물 관계도 키 |
| `situation` | 장면 상황 설명 |
| `lines` | 인물 대사 및 진행 대사 |
| `fixedQuiz` | 반드시 출제되는 고정 퀴즈 1개 |
| `poolQuiz` | 장면마다 무작위로 선택 출제되는 실무 퀴즈 풀 |
> 현재 구현에서는 장면의 장소·상황·대사 관련 값이 `title`, `setting`, `person`, `line` 등의 필드로 나뉘어 저장됩니다. 다른 환경으로 옮길 때는 위 표처럼 목적별 데이터로 정규화할 수 있습니다.
### 퀴즈 (`quiz`)
| 필드 | 설명 |
| --- | --- |
| `id` | 퀴즈 고유 ID |
| `prompt` | 사용자가 수행할 영어 응답 과제 |
| `options` | 4개의 선택지(정답 1개) |
| `answerIndex` | 정답 선택지 인덱스. 현재는 각 선택지의 `correct` 값으로 관리 |
| `whyWrong` | 오답이 어색한 이유를 설명하는 한국어 피드백 |
| `note` | 표현 노트: `pattern`, `meaning`, `example` |
| `branch` | 정답/오답 이후의 긍정·부정 장면 분기 정보 |
### 게임 상태 (`game`)
| 상태 | 설명 |
| --- | --- |
| `game.score` | 누적 점수 |
| `reputation` | 인사고과 또는 평판에 해당하는 수치 |
| `coins` | 플레이 보상 코인 |
| `flags.projectHealth` | 프로젝트 진행 건전성 |
| `flags.deadlineRisk` | 마감 리스크 |
| `flags.reputation` | 이야기 분기에 쓰이는 평판 값 |
| `learned` | 획득한 표현 노트 목록 |
| `relations` | 소피·동료·대표·바이어 등 인물별 관계도 |
서버 저장 데이터에는 장면 위치, 날짜, 답변 기록, 관계도, 점수, 인사고과, 코인, 플래그와 학습 표현이 함께 저장됩니다.
## 엔딩 판정 규칙
| 등급 | 조건 | 제목 |
| --- | --- | --- |
| S | 점수 2600 이상 그리고 평판 70 이상 | 프로젝트 리드 |
| A | 소피 및 동료 관계도 평균 60 이상 | 신뢰받는 팀원 |
| B | 인사고과 80 이상 | 성장한 신입 |
| C | 위 조건을 충족하지 못한 경우 | 다시 배우는 내일 |
판정은 상위 등급부터 순서대로 적용됩니다. 엔딩을 본 뒤 요약은 브라우저 저장소에 보관되어 홈의 엔딩 도감에서 다시 확인할 수 있습니다.
## 확장 방법
### 장면 추가 절차
1. `src/App.tsx`의 장면 배열에 새 `scene`을 추가합니다.
2. `id`는 날짜와 장면 순서가 드러나게 지정합니다. 예: `d4s1`.
3. `day`, `time`, `title`, `setting`, `person`, `line`, `relationKey`를 채웁니다.
4. `fixedQuiz` 1개와 `poolQuiz`를 추가합니다.
5. 정답과 오답에 맞는 `branch`의 긍정/부정 대사 및 상황을 넣습니다.
6. 날짜 수를 늘리는 경우 날짜 전환과 결과 화면에서 새 날짜로 연결하는 흐름도 함께 추가합니다.
### `poolQuiz` 추가 형식
기존의 퀴즈 생성 도우미 형식을 따릅니다. 선택지는 정답 1개와 오답 3개이며, 오답에는 모두 맥락상 자연스러운 `whyWrong` 설명을 연결합니다.
```ts
q(
  'd1s1p3',
  '소피 · 팀장님',
  'Could you send the update before lunch?',
  '전달 시점까지 포함해 자연스럽게 답하세요.',
  'Absolutely. I’ll send it before lunch.',
  ['I will send it until lunch.', 'I send it before lunch maybe.', 'Please wait for my sending.'],
  ['마감 시점에는 until보다 before 또는 by가 자연스러워요.', '일정 공유에서 maybe는 확신을 낮춰요.', '업무 회신으로는 지나치게 어색한 직역이에요.'],
  'I’ll send it before …',
  '전달 약속과 시점을 함께 밝히는 표현',
  'I’ll send the updated file before lunch.'
)
```
같은 장면의 퀴즈는 요청 확인, 일정, 파일·버전, 회의, 후속 조치처럼 소재를 나누어 무작위 출제 시 중복감을 줄입니다.
### 색상과 타이포그래피
공통 디자인 변수는 다음 위치에서 관리합니다.
- `src/vibe-design/tokens.css`: 기본 색상, 간격, 둥근 모서리, 그림자, 글자 크기 토큰
- `src/vibe-design/fonts.css`: 프로젝트 내장 글꼴 설정
- `src/vibe-design/overrides.css`: 사용자 지정 색상·글꼴 변경용 오버라이드
- `src/app.css`: 게임 무대, 홈, 모달, 반응형 화면의 개별 배치와 연출
색상이나 글꼴을 바꿀 때는 화면 곳곳의 리터럴 값 대신 디자인 변수부터 조정하는 방식을 권장합니다.
### 사운드 모듈
`src/lib/sound.ts`는 외부 음원 파일 없이 Web Audio API로 사운드를 만듭니다.
- `Soundscape.activate()`: 첫 사용자 상호작용 이후 오디오 컨텍스트를 준비하고 BGM 루프를 시작합니다.
- `setMood()`: 아침·낮·밤 분위기에 맞춰 BGM 음계를 전환합니다.
- `play()`: 대사, 선택, 정답, 오답, 관계도, 코인, 장면, 엔딩 효과음을 재생합니다.
- `setEnabled()`, `setBgmLevel()`, `setSfxLevel()`: 브라우저 저장소에 사운드 설정을 저장합니다.
다른 환경에서는 이 모듈의 이벤트 이름(`hover`, `select`, `dialogue`, `correct`, `wrong`, `affinity`, `coin`, `scene`, `ending`)을 오디오 클립 또는 믹서 이벤트에 대응시키면 됩니다.
## 자산 참고
### 캐릭터
캐릭터는 `src/components/Character.tsx` 안의 인라인 SVG 자산과 `src/app.css` 스타일로 구성한 애니메이션풍 일러스트입니다. 별도 이미지 파일을 쓰지 않습니다.
이미지 자산으로 교체하려면 다음을 바꿉니다.
1. `Character.tsx`의 머리카락·얼굴·의상용 하위 요소를 `<img>` 또는 스프라이트 렌더러로 대체합니다.
2. 인물 이름과 표정 상태(`neutral`, `happy`, `worried`)의 매핑은 유지합니다.
3. `app.css`의 `.character-*`, `.hair-*`, `.suit-*`, `.mood-*` 규칙을 이미지 크기·정렬·표정 전환 규칙으로 대체합니다.
### 배경
무대 배경은 `src/app.css`의 `.vn-stage`, `.stage-backdrop`, 장면별 `.scene-*` 규칙에 있는 CSS 그라데이션, 도시 실루엣, 창문·책상 장식 레이어로 표현됩니다.
배경 이미지를 사용하려면 장면별 `.scene-*` 배경 규칙 또는 `stage-backdrop` 레이어에 실제 이미지 경로를 연결합니다. 현재 레이어 순서와 `pointer-events: none` 설정은 유지해 대화창과 선택지의 클릭을 방해하지 않도록 합니다.
## Unity WebGL 포팅 메모
### 1:1로 대응해야 하는 기능
| 웹 프로젝트 요소 | Unity WebGL 대응 방향 |
| --- | --- |
| 화면 상태 머신 | 홈, 플레이, 결과, 엔딩, 복습 모달을 Canvas 패널 또는 상태 머신으로 분리 |
| 장면 진행 | `storyStep`, 현재 장면, 대사 완료 여부, AUTO/SKIP을 C# 상태로 관리 |
| 퀴즈 채점 | 고정 퀴즈 1개 + 풀에서 랜덤 2개 선택, 정답·오답 점수 및 관계도 변화 로직을 동일하게 이식 |
| 분기 | 정답/오답에 따른 `branch.positive`/`branch.negative` 대사와 플래그 반영 |
| 엔딩 판정 | S → A → B → C 우선순위 판정을 C# 서비스로 동일 구현 |
| 저장 API | FastAPI의 게임 생성·조회·답변 저장 API를 UnityWebRequest로 호출하거나, 새 서버 API로 동일한 요청/응답 계약 유지 |
| 복습장 | `learned`, 답변 이력, 오답 이유를 서버 저장값에서 읽어 UI 리스트로 구성 |
| 사운드 이벤트 | 현재 사운드 이벤트 이름을 Unity AudioMixer·AudioSource 클립 트리거로 매핑 |
### 이미지 자산으로 대체할 부분
- CSS 인라인 캐릭터: 인물별 기본/기쁨/걱정 표정 스프라이트 또는 Live2D 모델
- CSS 배경 그라데이션과 장식: 장면별 배경 일러스트, 전경 오브젝트, 라이트 오버레이
- CSS 전환 효과: CanvasGroup 페이드, Animator, Timeline 또는 DOTween 연출
- 버튼·카드 스타일: Unity UI 프리팹과 9-sliced 스프라이트
### 권장 데이터 이전 방식
장면과 퀴즈를 TypeScript 코드에서 분리해 JSON 또는 ScriptableObject로 옮기면 콘텐츠 수정이 쉬워집니다. 단, 기존 저장 기록과 연동해야 한다면 `scene id`, `quiz id`, 관계도 키, 플래그 키는 그대로 유지해야 합니다. 이 식별자가 바뀌면 이어하기와 오답 노트의 과거 기록을 정상적으로 연결할 수 없습니다.
