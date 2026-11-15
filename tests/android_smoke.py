"""Exercise the submitted signed APK through Android UI and document pickers."""
import datetime, hashlib, json, os, pathlib, re, subprocess, time, xml.etree.ElementTree as ET, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-output/android'
OUT.mkdir(parents=True, exist_ok=True)
ADB = os.environ.get('SLEO_ADB', 'adb')
checks = []
serial = os.environ.get('SLEO_SERIAL')

def adb(*args, binary=False, timeout=60):
    cmd = [ADB] + (['-s', serial] if serial else []) + list(args)
    result = subprocess.run(cmd, check=True, capture_output=True, timeout=timeout)
    return result.stdout if binary else result.stdout.decode('utf-8', errors='replace').strip()

def shot(name):
    (OUT / (name + '.png')).write_bytes(adb('exec-out', 'screencap', '-p', binary=True))

def ui(name='latest'):
    adb('shell', 'uiautomator', 'dump', '/sdcard/sleo-test-ui.xml', timeout=40)
    text = adb('shell', 'cat', '/sdcard/sleo-test-ui.xml')
    (OUT / (name + '.xml')).write_text(text, encoding='utf-8')
    return ET.fromstring(text[text.index('<?xml'):])

def find(tree, value, exact=False):
    found=[]
    for e in tree.iter('node'):
        labels=[e.get('text',''),e.get('content-desc','')]
        matches=any(s==value if exact else value in s for s in labels)
        box=list(map(int,re.findall(r'\d+',e.get('bounds',''))))
        if matches and len(box)==4 and box[2]>box[0] and box[3]>box[1]:
            found.append((box,e))
    return sorted(found,key=lambda item: (item[0][1],(item[0][2]-item[0][0])*(item[0][3]-item[0][1])))

def wait_text(value, timeout=45):
    end=time.monotonic()+timeout
    while time.monotonic()<end:
        tree=ui()
        if find(tree,value): return tree
        time.sleep(1)
    raise AssertionError('Missing screen text: '+value)

def tap(value, exact=False, scroll=True):
    for attempt in range(5 if scroll else 1):
        found=find(ui(),value,exact)
        if found:
            b,_=found[0]
            adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
            time.sleep(1.2)
            return
        if scroll: adb('shell','input','swipe','1400','760','1400','250','300')
    raise AssertionError('Cannot tap: '+value)

def record(name, **details):
    checks.append(dict(name=name,passed=True,**details))
    print('PASS '+name,flush=True)

def launch():
    adb('shell','am','start','-W','-n','io.sleo.app/.MainActivity')
    time.sleep(3)

try:
    apk=ROOT/'apk/김도건_Sleo_release.apk'
    apk_hash=hashlib.sha256(apk.read_bytes()).hexdigest()
    adb('install','-r',str(apk))
    launch()
    wait_text('예시로 살펴보기')
    shot('01-release-home')
    record('Signed release APK installs and opens',apk_sha256=apk_hash)
    tap('예시로 살펴보기')
    wait_text('오른쪽 차량이 가까워 보여 속도를 줄였어요.',60)
    shot('02-example-records')
    record('Three example records load')
    tap('이어서 정리',exact=True)
    wait_text('그때 찍힌 영상 찾기')
    shot('03-video-screen')
    record('Selected original video opens in record screen')
    tap('자료 보내기')
    wait_text('용도에 맞게 내보내기')
    tap('자료 묶음 저장하기')
    wait_text('SAVE')
    shot('04-native-save-dialog')
    adb('shell','input','keyevent','4')
    wait_text('저장을 취소했어요.')
    record('Android save cancellation returns to intact record')
    tap('자료 묶음 저장하기')
    wait_text('SAVE')
    tap('SAVE',exact=True,scroll=False)
    wait_text('선택한 위치에 기록 파일을 저장했어요.',60)
    shot('05-native-export-complete')
    paths=adb('shell','find','/sdcard/Download','-maxdepth','1','-name','Sleo_*.zip').splitlines()
    assert paths, 'Export ZIP is absent from Downloads'
    archive=OUT/'native-export.zip'
    adb('pull',paths[-1],str(archive))
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        metadata=json.loads(z.read('record.json'))
        original=z.read(metadata['mediaEntry'])
        source=(ROOT/'app/src/main/assets/www/examples'/metadata['record']['clip']['name']).read_bytes()
        assert original==source, 'Original media bytes changed'
        record('Native ZIP is valid and preserves original video bytes',media_sha256=hashlib.sha256(original).hexdigest(),zip_bytes=archive.stat().st_size)
    adb('shell','am','force-stop','io.sleo.app')
    launch()
    wait_text('오른쪽 차량이 가까워 보여 속도를 줄였어요.')
    record('Records persist after app process restart')
    adb('shell','pm','clear','io.sleo.app')
    launch()
    wait_text('예시로 살펴보기')
    tap('기록 가져오기',exact=True)
    tap('묶음 파일(.zip) 선택하기')
    filename=paths[-1].rsplit('/',1)[-1]
    wait_text(filename)
    tap(filename,exact=True)
    wait_text('기록과 원본 영상을 불러왔어요.',60)
    shot('06-import-after-clearing-data')
    record('ZIP restores record and video into an empty app')
    tap('자료 보내기')
    tap('자료 묶음 저장하기')
    wait_text('SAVE')
    adb('shell','input','keyevent','4')
    wait_text('저장을 취소했어요.')
    record('Restored original video can be packaged again')
except Exception as error:
    checks.append(dict(name='runtime failure',passed=False,error=str(error)))
    try: shot('failure');ui('failure')
    except Exception: pass
    raise
finally:
    environment={}
    for name,args in [('android',['shell','getprop','ro.build.version.release']),('api',['shell','getprop','ro.build.version.sdk']),('screen',['shell','wm','size']),('density',['shell','wm','density']),('webview',['shell','dumpsys','webviewupdate'])]:
        try: environment[name]=adb(*args)
        except Exception as e: environment[name]=str(e)
    result={'tested_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'artifact':'signed release APK','environment':environment,'checks':checks,'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks)}
    (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
