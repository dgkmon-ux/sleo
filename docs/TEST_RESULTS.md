# 실행 검증 기록

2026년 11월 15일, 제출용 서명 release APK를 Android 14 에뮬레이터에 설치해 검사했습니다. [GitHub Actions 실행 결과](https://github.com/dgkmon-ux/sleo/actions/runs/43725234884)는 **통과**입니다.

## 환경

| 항목 | 설정 |
| --- | --- |
| APK | `apk/김도건_Sleo_release.apk` / 1.0.0 |
| Android | AOSP Android 14, API 34, x86_64 |
| Android Emulator | 37.2.13.0 |
| 화면 | 1600 × 900px, 160dpi |
| Android System WebView | 113.0.5672.136 |
| 실행 장소 | GitHub Actions의 Ubuntu 환경 |
| 빌드 | JDK 17, Gradle 8.7, AGP 8.6.1 |
| 서명 | APK Signature Scheme v2, RSA 3072비트 |

APK SHA-256:

```text
c56a798795c6afaca31a321cd5c3d93504580f9469d4e21a771b67465c1b7db9
```

## 확인한 동작

| 검사 | 결과 | 근거 |
| --- | --- | --- |
| 제출 APK 설치·앱 실행 | 통과 | 패키지 설치, 실행 프로세스, 실제 화면 |
| Android 저장창 취소 | 통과 | 앱으로 복귀하며 ZIP이 생성되지 않음 |
| 기록·원본 영상 ZIP 저장 | 통과 | Android 문서 저장창에서 생성한 ZIP을 내려받아 CRC와 기록 내용을 확인 |
| 원본 영상 보존 | 통과 | ZIP의 영상 756,228바이트가 원본 예시 영상과 일치 |
| 앱 프로세스 종료 후 다시 실행 | 통과 | 실행 검사와 기록 3건이 유지된 화면 확인 |
| Android에서 저장한 ZIP을 새 브라우저에서 복원 | 통과 | Chrome 새 컨텍스트에서 메모·영상 크기·SHA-256·15초 재생 길이 확인 |

Android 자동 검사는 설치·취소·저장·재실행의 네 항목으로 기록했습니다. 기록 유지 여부는 재실행 화면을 함께 검토했습니다. 브라우저 복원은 Android에서 실제 생성한 ZIP을 사용한 별도 검사입니다.

- [Android 자동 검사 원본](test-results/android14-release.json)
- [다른 기기 환경에서 복원한 검사 원본](test-results/cross-platform-restore.json)
- [앱 재실행 화면](screens/android-records.png)
- [Android 문서 저장창](screens/android-save-dialog.png)
- [저장 완료 화면](screens/android-export-complete.png)
- [Android ZIP을 브라우저에서 복원한 화면](screens/android-to-browser.png)

## 저장 브리지 단위 검증

실제 `native-bridge.js`에 모의 네이티브 응답을 연결한 **8개 항목이 통과**했습니다. 순차 조각 전송과 바이트 일치, 취소, 쓰기 오류, 응답 순서, 중복 요청과 용량 경계를 검사합니다. 용량 경계 검사는 크기를 모의로 입력하며 300MB 파일을 실제 전송하는 성능 시험과 구분합니다.

실행 명령: `node tests/verify_native_bridge.mjs`  
결과: [native-bridge-results.json](../tests/native-bridge-results.json)

## 다음 검증 범위

Pleos Connect 에뮬레이터와 실제 차량에서 Gleo 요청·주행 상태를 연결해 검사할 예정입니다. 현재 실행 기록은 AOSP Android 앱과 브라우저 간 자료 이동에 대한 결과입니다. Android 문서 선택창을 통한 ZIP 재가져오기는 자동 검사에 포함하지 않았습니다.
