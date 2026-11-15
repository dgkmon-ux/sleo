"""Signed APK check at the documented 1600x900, 160dpi test size.

Coordinates come from the same responsive UI at its Android content size.
Screenshots document each real Android interaction. Exported bytes determine
the export result; screenshot production alone does not count as export success.
"""
import datetime, hashlib, json, os, pathlib, subprocess, time, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-output/android';OUT.mkdir(parents=True,exist_ok=True)
C=json.loads((ROOT/'tests/android-coordinates.json').read_text())
checks=[]
def adb(*args,binary=False,timeout=25):
    p=subprocess.run(['adb',*args],capture_output=True,timeout=timeout,check=True)
    return p.stdout if binary else p.stdout.decode('utf-8',errors='replace').strip()
def shot(name):
    (OUT/(name+'.png')).write_bytes(adb('exec-out','screencap','-p',binary=True))
def tap(name,wait=2):
    p=C[name];adb('shell','input','tap',str(p['x']),str(p['y']));time.sleep(wait)
def passed(name,**details):
    checks.append({'name':name,'passed':True,**details});print('PASS '+name,flush=True)
def launch():
    text=adb('shell','am','start','-W','-n','io.sleo.app/.MainActivity')
    assert 'Error' not in text,text
    time.sleep(4)
def downloads():
    # The shell wildcard is quoted so find receives it unchanged.
    return adb('shell',"find /sdcard/Download -maxdepth 1 -name 'Sleo_*.zip'").splitlines()
try:
    apk=ROOT/'apk/김도건_Sleo_release.apk'
    adb('install','-r',str(apk));launch()
    assert adb('shell','pidof','io.sleo.app')
    shot('01-release-home')
    passed('Signed release APK installs and opens',apk_sha256=hashlib.sha256(apk.read_bytes()).hexdigest())
    tap('emptyExample',7);shot('02-example-records')
    tap('openFirst',4);shot('03-video-screen')
    tap('sendTab',3);shot('04-export-screen')
    tap('export',3);shot('05-native-save-dialog')
    adb('shell','input','keyevent','4');time.sleep(2);shot('06-save-cancelled')
    assert not downloads(),'Cancelled save unexpectedly created an archive'
    passed('Cancelling native save leaves no exported archive')
    tap('sendTabAfterCancel',2)
    tap('export',3);shot('07-native-save-reopened')
    adb('shell','input','tap','1535','804');time.sleep(5)
    shot('08-save-result')
    paths=downloads()
    assert paths,'Native save did not create an archive; inspect save-dialog screenshots'
    archive=OUT/'native-export.zip';adb('pull',paths[-1],str(archive))
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        metadata=json.loads(z.read('record.json'))
        source=(ROOT/'app/src/main/assets/www/examples'/metadata['record']['clip']['name']).read_bytes()
        actual=z.read(metadata['mediaEntry'])
        assert source==actual,'Original video bytes changed'
        assert metadata['record']['memo']=='오른쪽 차량이 가까워 보여 속도를 줄였어요.'
        passed('Native Android save produces a valid record ZIP with identical original video',zip_bytes=archive.stat().st_size,media_sha256=hashlib.sha256(actual).hexdigest())
    adb('shell','am','force-stop','io.sleo.app');launch();shot('09-restarted-app')
    passed('App reopens after process restart')
except Exception as error:
    checks.append({'name':'runtime failure','passed':False,'error':str(error)})
    try: shot('failure')
    except Exception: pass
    raise
finally:
    env={}
    for name,args in [('android',['shell','getprop','ro.build.version.release']),('api',['shell','getprop','ro.build.version.sdk']),('screen',['shell','wm','size']),('density',['shell','wm','density']),('webview',['shell','dumpsys','webviewupdate'])]:
        try: env[name]=adb(*args,timeout=10)
        except Exception as e: env[name]=str(e)
    data={'tested_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'artifact':'submitted signed release APK','environment':env,'method':'Android screen taps and exported-file byte validation; screenshots retained','checks':checks,'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks)}
    (OUT/'results.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
