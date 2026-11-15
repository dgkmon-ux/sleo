# 제3자 구성요소 고지

Sleo의 외부 라이브러리, 빌드 도구와 서체는 각 프로젝트의 라이선스를 따릅니다.

## AndroidX WebKit

- 구성요소: `androidx.webkit:webkit:1.11.0`
- 제공 프로젝트: Android Open Source Project / AndroidX
- 용도: APK 내부 화면을 제공하는 `WebViewAssetLoader`와 웹·Android 간 메시지 연결
- 라이선스: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- 공식 자료: [AndroidX WebKit](https://developer.android.com/jetpack/androidx/releases/webkit)

WebKit과 함께 해결되는 AndroidX 의존성에도 각 배포물의 저작권·라이선스 고지가 적용됩니다. Android System WebView는 기기 또는 에뮬레이터가 제공하는 실행 구성요소이며, 이 저장소에 WebView 엔진을 복사해 배포하지 않습니다.

## Gradle과 Android Gradle Plugin

| 구성요소 | 버전 | 용도 | 라이선스 |
| --- | --- | --- | --- |
| Gradle Wrapper / Gradle | 8.7 | 재현 가능한 빌드 실행 | Apache License 2.0 |
| Android Gradle Plugin | 8.6.1 | Android 소스·리소스 빌드와 APK 생성 | Apache License 2.0 |

Gradle Wrapper 스크립트에 포함된 원저작자 고지를 유지합니다.

> Copyright © 2015–2021 the original authors.

원문: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)  
프로젝트: [Gradle](https://github.com/gradle/gradle), [Android 빌드 도구](https://developer.android.com/build)

## Pretendard

- 서체: Pretendard Variable
- 저작권자: Kil Hyung-jin
- 라이선스: SIL Open Font License 1.1
- 예약 서체명: Pretendard
- 프로젝트: [Pretendard](https://github.com/orioncactus/pretendard)

원저작권 고지:

> Copyright (c) 2021, Kil Hyung-jin (https://github.com/orioncactus/pretendard),  
> with Reserved Font Name Pretendard.

서체와 함께 동봉한 [Pretendard 라이선스 원문](app/src/main/assets/www/assets/Pretendard-LICENSE.txt)을 보존합니다.

## 예시 영상

`app/src/main/assets/www/examples/`의 영상은 생성형 AI로 만든 도로 정지 이미지에 예시 번호와 시각을 붙여 구성한 앱 시연 자료입니다. 실제 사고·교통법규 위반 촬영물이 아닙니다. 제작 방식과 예시 시각은 같은 폴더의 [예시영상 안내](app/src/main/assets/www/examples/예시영상_안내.txt)에 기록했습니다.
