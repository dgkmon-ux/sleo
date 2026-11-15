# Android host

Sleo의 기록·영상 정리 화면을 Android 앱에서 실행합니다. Java 호스트와 Android System WebView를 사용하며, 파일 선택과 ZIP 저장은 Android의 문서 선택창에 연결합니다.

## Build

- JDK 17, Android SDK 34, Gradle 8.7, Android Gradle Plugin 8.6.1
- package: io.sleo.app / minSdk 28 / targetSdk 34
- AndroidX WebKit 1.11.0
- SDK 경로는 로컬 local.properties의 sdk.dir 또는 ANDROID_HOME으로 설정합니다.
- gradle :app:assembleDebug 또는 gradle :app:assembleRelease
- release 서명 환경변수: SLEO_KEYSTORE, SLEO_KEYSTORE_PASSWORD, SLEO_KEY_ALIAS, SLEO_KEY_PASSWORD
- 네 변수가 모두 있으면 release 서명을 적용합니다. 없으면 unsigned release가 만들어집니다. 키와 비밀번호는 저장소에 넣지 않습니다.

## Files and origin

시작 주소는 https://appassets.androidplatform.net/assets/www/index.html 입니다. WebViewAssetLoader가 APK 내부 assets를 제공합니다. HTTP 요청으로 앱 화면을 내려받지 않습니다. file:// 접근과 외부 페이지의 WebView 탐색은 차단하고, 외부 HTTP(S) 링크는 시스템 브라우저로 엽니다.

영상 선택은 ACTION_OPEN_DOCUMENT의 다중 선택, ZIP 가져오기는 단일 선택을 사용합니다. 선택한 원본은 웹 앱의 IndexedDB에 저장됩니다. 앱을 삭제하거나 앱 데이터를 지우면 이 저장소도 삭제됩니다. 보관할 기록은 ZIP으로 내보내야 합니다.

## ZIP bridge contract

AndroidX WebMessageListener의 SleoNative.postMessage를 사용합니다. 허용 origin은 앱 assets origin 하나이며 메인 프레임의 메시지만 처리합니다. addJavascriptInterface는 사용하지 않습니다.

1. open: id, name, size → ACTION_CREATE_DOCUMENT → ready 또는 cancelled/error.
2. chunk: id, sequence, data(base64) → 같은 sequence의 chunk 응답. 한 조각은 최대 192KB이고 순서대로 확인한 뒤 다음 조각을 보냅니다.
3. finish: id → 전체 바이트 수 확인, flush, close → saved.
4. abort: id → 미완성 문서를 닫고 삭제를 시도합니다.

전체 ZIP은 300 × 1024 × 1024바이트 이하입니다. 원본 영상 바이트를 다시 인코딩하지 않습니다. 웹 앱은 saved를 받은 뒤에만 내보낸 버전을 기록합니다. 저장창 취소, 쓰기 실패, 순서 불일치에는 완료로 표시하지 않습니다. document provider가 미완성 파일 삭제를 지원하지 않는 경우 불완전 파일이 남을 수 있으며 저장 성공은 표시되지 않습니다.

## Verification

node tests/verify_native_bridge.mjs

실제 native-bridge.js에 모의 네이티브 응답을 연결한 8개 단위 검증입니다. 조각별 바이트 일치, 취소, 쓰기 오류, 순서 오류, 300MB 경계, 중복 요청, 브리지 미지원 안내를 확인합니다. 테스트 결과는 tests/native-bridge-results.json에 기록합니다.

Android 기기 및 에뮬레이터 검증 결과는 별도 실행 기록을 따릅니다. 이 테스트만으로 기기 검증이나 Pleos 연동 검증을 대신하지 않습니다.

## Demonstration scope

주행 상태와 음성 요청은 화면의 시연 도구로 재현합니다. Gleo, 실제 차량 위치·주행 상태, 기관 접수 API를 연결하지 않습니다. 예시 영상은 앱 기능을 살펴보기 위한 자료입니다. 공식 기관 제출은 사용자가 별도로 진행합니다.

