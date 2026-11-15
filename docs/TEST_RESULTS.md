# 실행 검증 기록

배포 APK는 `apk/김도건_Sleo_release.apk`입니다. JDK 17, Gradle 8.7, Android Gradle Plugin 8.6.1로 release 빌드를 완료했고 APK Signature Scheme v2 서명을 확인했습니다.

저장 브리지의 단위 검증은 8개 항목을 통과했습니다. 이 결과는 JavaScript와 모의 네이티브 응답을 사용한 검증이며, Android 실행 결과는 별도로 기록합니다.

제출 APK를 Android 14 에뮬레이터에 설치해 실행하는 검증은 저장소의 **Signed APK Android check** 워크플로에서 확인할 수 있습니다. 작업에는 실제 앱 설치·화면 조작·시스템 저장창 취소·ZIP 저장·원본 바이트 비교·앱 재시작·기록 복원 검증과 스크린샷 수집이 포함됩니다. 실행이 끝난 뒤 결과와 실행 주소를 이 문서에 추가합니다.

Pleos Connect 에뮬레이터와 실제 차량에서의 검증은 후속 개발 단계에서 진행합니다.
