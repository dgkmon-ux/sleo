# Sleo · 슬레오

**말로 남긴 순간을 블랙박스 영상과 함께 정리하는 앱**

운전 기록의 마지막 매듭. 짧게 남긴 기록의 시각으로 영상 후보를 찾고, 확인한 장면과 당시 기억을 나누어 적습니다. 정리한 글과 원본 영상은 ZIP 하나로 저장해 다른 기기에서도 이어 쓸 수 있습니다.

이 저장소는 기존 브라우저 프로토타입의 기능을 유지한 **Android Java WebView 앱**입니다. 화면과 예시 자료를 APK에 담아 기록·영상 정리는 오프라인으로 실행하고, 파일 선택과 ZIP 저장은 Android의 문서 선택창으로 연결합니다.

## 주요 기능

- **기록 남기기:** 시각과 짧은 메모를 사건별로 저장하고 이어서 편집합니다.
- **영상 찾기:** 여러 영상의 파일 이름에 담긴 시작 시각과 실제 재생 길이를 비교합니다. 블랙박스 시계의 오차를 조정하거나 촬영 시작 시각을 직접 입력할 수 있습니다.
- **장면 확인:** 기록 시각 근처로 이동하고, ‘여기부터·여기까지’로 다시 볼 구간을 표시합니다.
- **글 정리:** 영상에서 확인한 내용과 내가 기억하는 상황을 구분해 신고용 또는 개인 보관용 글로 정리합니다.
- **자료 이동:** 설명문·기록 정보·선택한 원본 영상을 ZIP으로 저장하고 가져옵니다. 영상이 없는 글 기록도 저장할 수 있습니다.
- **작업 이어 쓰기:** 기록과 선택한 영상을 앱 안에 보관합니다. 원본 영상은 자르거나 다시 인코딩하지 않습니다.

주행 상태와 짧은 음성 요청은 시연 도구의 버튼으로 재현합니다. 실제 Gleo 음성 요청, 차량 위치·주행 신호와 AI 문장 생성은 후속 개발 범위입니다.

## 브라우저에서 먼저 보기

[브라우저 프로토타입 ZIP](demo/Sleo_프로토타입.zip)을 내려받아 압축을 푼 뒤 `Sleo_실행.html`을 Chrome 또는 Edge에서 여세요. 시연 영상과 기획서에 담은 원본 프로토타입이며, 아래 APK는 같은 기능에 Android 파일 선택·저장을 연결한 버전입니다.

## APK 설치

배포 파일: [김도건_Sleo_release.apk](apk/김도건_Sleo_release.apk)

서명한 release APK이며 Android 9(API 28) 이상을 대상으로 합니다. 파일을 Android 기기에 옮겨 설치하거나, USB 디버깅이 연결된 기기·에뮬레이터에서 아래 명령을 실행합니다.

```sh
adb install -r "apk/김도건_Sleo_release.apk"
adb shell am start -n io.sleo.app/.MainActivity
```

패키지 이름은 `io.sleo.app`, 앱 버전은 `1.0.0`입니다.

## 시연 순서

1. 앱을 열고 **예시로 살펴보기**를 누릅니다. 상단 **시연 도구 → 예시 불러오기**에서도 같은 자료를 열 수 있습니다.
2. 첫 기록의 **이어서 정리**를 눌러 기록 시각과 겹치는 영상 후보를 확인합니다.
3. 영상을 재생하고 **여기부터·여기까지**로 구간을 표시합니다. 필요하면 **이 장면의 시각으로 맞추기**로 발생 시각을 조정합니다.
4. **내용 정리**에서 영상에 보이는 내용과 기억하는 상황을 나누어 적고 용도를 선택합니다.
5. **자료 보내기 → 자료 묶음 저장하기**를 눌러 Android 저장창에서 파일 이름과 위치를 선택합니다.
6. **기록 가져오기**에서 저장한 ZIP을 선택해 글과 영상을 다시 엽니다. 다른 기기로 옮길 때는 Android 파일 앱의 공유 기능을 사용할 수 있습니다.

직접 촬영한 영상을 사용하려면 **새 기록 남기기**에서 메모를 만든 뒤 **영상 파일 여러 개 고르기**로 파일을 선택합니다. 시연 도구의 주행 상태를 바꾸면 상세 화면 잠금과 짧은 기록 저장 흐름도 확인할 수 있습니다.

예시 영상은 생성한 도로 이미지로 만든 시연 자료이며 실제 사고나 교통법규 위반의 증거 영상이 아닙니다.

## 실행 환경과 Pleos Connect 개발 범위

| 항목 | 설정 |
| --- | --- |
| 앱 호스트 | Java 17 + Android System WebView |
| Android 실행·검증 환경 | Android 14(API 34), AOSP x86_64 에뮬레이터 |
| 에뮬레이터 화면 | 1600 × 900px, density 160dpi |
| Android SDK | compileSdk 34 / minSdk 28 / targetSdk 34 |
| Pleos Connect SDK·에뮬레이터 | 이번 Android 호스트 개발에 사용하지 않음 |
| 후속 Pleos Connect 연동 기준 | 2.1.0 |
| 차량 연동 | Gleo 요청, 위치 권한, 실제 주행 제한을 후속 개발에서 연결 |

현재 UI는 화면 폭에 따라 메뉴와 작업 영역이 재배치되는 반응형 화면입니다. 에뮬레이터 설정을 맞출 때는 다음 명령을 사용할 수 있습니다.

```sh
adb shell wm size 1600x900
adb shell wm density 160
```

기기·에뮬레이터에서 실행한 항목, WebView 버전과 결과는 [테스트 결과](docs/TEST_RESULTS.md)에 기록합니다.

## 소스 빌드

필요한 도구는 **JDK 17, Android SDK 34, Gradle 8.7**입니다. 저장소의 Gradle Wrapper가 8.7을 사용하며, Android Gradle Plugin은 **8.6.1**, AndroidX WebKit은 **1.11.0**으로 고정되어 있습니다.

1. 저장소를 내려받습니다.
2. `JAVA_HOME`을 JDK 17로 설정합니다.
3. Android SDK 위치를 `ANDROID_HOME` 또는 로컬 `local.properties`의 `sdk.dir`에 설정합니다.
4. 저장소 루트에서 빌드합니다.

macOS·Linux:

```sh
./gradlew :app:assembleDebug
./gradlew :app:assembleRelease
```

Windows PowerShell:

```powershell
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:assembleRelease
```

최초 빌드에서는 Gradle과 의존성을 내려받기 위해 네트워크가 필요합니다. 빌드 결과는 `app/build/outputs/apk/debug/`와 `app/build/outputs/apk/release/`에 생성됩니다.

release 서명은 다음 환경변수 네 개를 사용합니다.

| 환경변수 | 값 |
| --- | --- |
| `SLEO_KEYSTORE` | 서명 키 저장소 파일 위치 |
| `SLEO_KEYSTORE_PASSWORD` | 키 저장소 비밀번호 |
| `SLEO_KEY_ALIAS` | 서명 키 별칭 |
| `SLEO_KEY_PASSWORD` | 서명 키 비밀번호 |

네 변수가 모두 설정되면 release에 서명을 적용합니다. 설정하지 않은 로컬 release 빌드는 unsigned APK를 만듭니다. 배포 APK의 서명 키와 비밀번호는 저장소에 포함하지 않습니다.

## 테스트 실행

Node.js에서 Android ZIP 저장 브리지의 단위 검증을 실행합니다.

```sh
node tests/verify_native_bridge.mjs
```

이 검증은 조각별 데이터 전달, 저장 취소·실패, 응답 순서, 용량 경계와 중복 요청 등을 다룹니다. 결과 파일은 `tests/native-bridge-results.json`에 생성되며, Android 에뮬레이터 실행 결과는 [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md)에서 확인합니다.

## 저장 방식과 소스 구성

기록과 선택한 원본 영상은 WebView의 IndexedDB에 저장합니다. 앱을 삭제하거나 앱 데이터를 지우기 전에 보관할 기록을 ZIP으로 내보내세요. 자료 묶음의 최대 크기는 300MB(300 × 1024 × 1024바이트)입니다.

앱 화면은 APK 내부 파일을 `WebViewAssetLoader`로 읽습니다. 영상 선택과 ZIP 가져오기는 Android 문서 선택창, ZIP 저장은 문서 생성창을 사용합니다. 외부 안내·신고 링크는 시스템 브라우저로 열며, 접수는 해당 사이트에서 직접 진행합니다.

| 경로 | 내용 |
| --- | --- |
| `app/src/main/java/io/sleo/app/MainActivity.java` | WebView, 파일 선택·저장과 메시지 연결 |
| `app/src/main/assets/www/` | 기록·영상·글 정리 화면과 예시 자료 |
| `app/src/main/assets/www/native-bridge.js` | ZIP 저장을 Android 호스트에 요청하는 코드 |
| `tests/` | 네이티브 저장 브리지 단위 검증 |
| `apk/김도건_Sleo_release.apk` | 설치용 서명 release APK |

호스트 구조와 저장 프로토콜은 [ANDROID_HOST.md](ANDROID_HOST.md), 사용한 외부 구성요소와 서체 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 정리했습니다.
