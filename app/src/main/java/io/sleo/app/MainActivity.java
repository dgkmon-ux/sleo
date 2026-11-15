package io.sleo.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.util.Base64;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Offline WebView host. No vehicle APIs or external server connection. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String START = ORIGIN + "/assets/www/index.html";
    private static final int PICK_FILE = 100, SAVE_ZIP = 101;
    private static final long MAX_ZIP = 300L * 1024 * 1024;
    private static final int MAX_CHUNK = 192 * 1024;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private volatile Transfer transfer;
    private boolean documentPickerOpen;
    private volatile boolean destroyed;

    private static final class Transfer {
        final String id;
        final long expected;
        final JavaScriptReplyProxy reply;
        volatile boolean busy;
        Uri uri;
        OutputStream stream;
        int nextSequence;
        long written;
        Transfer(String id, long expected, JavaScriptReplyProxy reply) {
            this.id = id; this.expected = expected; this.reply = reply;
        }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xfff6f6f6);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        // Content URIs come only from the system document picker; navigation is blocked below.
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSafeBrowsingEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setSupportMultipleWindows(false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                if (trusted(r.getUrl())) {
                    WebResourceResponse asset = loader.shouldInterceptRequest(r.getUrl());
                    return asset != null ? asset : blocked();
                }
                // Object URLs are local Blob data created by this app.
                if ("blob".equals(r.getUrl().getScheme()) && r.getUrl().toString().startsWith("blob:" + ORIGIN + "/")) return null;
                return blocked();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                if (trusted(r.getUrl())) return false;
                if (r.isForMainFrame() && r.hasGesture()) openExternal(r.getUrl());
                return true;
            }
            @Override public void onPageStarted(WebView v, String url, Bitmap icon) {
                if (!trusted(Uri.parse(url))) v.stopLoading();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> callback, FileChooserParams p) {
                if (!trusted(Uri.parse(v.getUrl() == null ? "" : v.getUrl()))) return false;
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                boolean zip = false;
                for (String type : p.getAcceptTypes()) if (type.toLowerCase().contains("zip")) zip = true;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                if (zip) {
                    intent.setType("*/*");
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/zip","application/x-zip-compressed","application/octet-stream"});
                } else intent.setType("video/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(intent, PICK_FILE); }
                catch (ActivityNotFoundException e) { callback.onReceiveValue(null); fileCallback = null; toast("파일을 고를 앱이 없어요."); }
                return true;
            }
            @Override public boolean onJsConfirm(WebView v, String url, String message, JsResult result) {
                if (!trusted(Uri.parse(url))) { result.cancel(); return true; }
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setPositiveButton("확인", (d,w) -> result.confirm()).setNegativeButton("취소", (d,w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel()).show(); return true;
            }
            @Override public boolean onJsAlert(WebView v, String url, String message, JsResult result) {
                if (!trusted(Uri.parse(url))) { result.cancel(); return true; }
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setPositiveButton("확인", (d,w) -> result.confirm()).setOnCancelListener(d -> result.confirm()).show(); return true;
            }
        });
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "SleoNative", Collections.singleton(ORIGIN),
                (view, message, source, main, proxy) -> {
                    if (!main || !trusted(source) || !trusted(Uri.parse(view.getUrl() == null ? "" : view.getUrl()))) return;
                    String data = message.getData();
                    if (data == null || data.length() > MAX_CHUNK * 4 / 3 + 4096) return;
                    try { receive(new JSONObject(data), proxy); }
                    catch (Exception e) { reply(proxy, "", "error", -1, "저장 요청을 읽지 못했어요."); }
                });
        }
        web.loadUrl(START);
    }

    private static boolean trusted(Uri uri) {
        return uri != null && "https".equals(uri.getScheme())
            && "appassets.androidplatform.net".equals(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443);
    }
    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private void openExternal(Uri uri) {
        if (!"https".equals(uri.getScheme()) && !"http".equals(uri.getScheme())) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException e) { toast("링크를 열 브라우저가 없어요."); }
    }
    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_LONG).show(); }
    private void receive(JSONObject msg, JavaScriptReplyProxy proxy) throws Exception {
        String type = msg.optString("type"), id = msg.optString("id");
        if ("external".equals(type)) { openExternal(Uri.parse(msg.optString("url"))); return; }
        if (!id.matches("[A-Za-z0-9-]{1,80}")) { reply(proxy,id,"error",-1,"저장 요청이 올바르지 않아요."); return; }
        if ("open".equals(type)) {
            long size = msg.optLong("size",-1);
            if (size < 0 || size > MAX_ZIP) { reply(proxy,id,"error",-1,"기록 파일은 300MB 이하로 저장해 주세요."); return; }
            if (transfer != null || documentPickerOpen) { reply(proxy,id,"error",-1,"앞선 저장을 마친 뒤 다시 눌러 주세요."); return; }
            String name = msg.optString("name","Sleo_기록.zip").replaceAll("[\\\\/\\p{Cntrl}:*?\"<>|]", "_");
            if (name.length() > 120) name = name.substring(0,116) + ".zip";
            if (!name.toLowerCase().endsWith(".zip")) name += ".zip";
            transfer = new Transfer(id,size,proxy);
            documentPickerOpen = true;
            Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                .setType("application/zip").putExtra(Intent.EXTRA_TITLE,name);
            try { startActivityForResult(save,SAVE_ZIP); }
            catch (ActivityNotFoundException e) { documentPickerOpen=false; transfer=null; reply(proxy,id,"error",-1,"파일 저장 창을 열 수 없어요."); }
            return;
        }
        Transfer t = transfer;
        if (t == null || !t.id.equals(id)) { reply(proxy,id,"error",-1,"저장 요청을 다시 시작해 주세요."); return; }
        if ("abort".equals(type)) { io.execute(() -> fail(t,"저장을 취소했어요.","cancelled")); return; }
        if (t.busy) { io.execute(() -> fail(t,"파일 조각의 응답 순서를 확인해 주세요.","error")); return; }
        if ("chunk".equals(type)) {
            int sequence = msg.optInt("sequence",-1);
            String encoded = msg.optString("data");
            if (encoded.length() > MAX_CHUNK * 4 / 3 + 4) { io.execute(() -> fail(t,"파일 조각이 너무 커요.","error")); return; }
            t.busy=true;
            io.execute(() -> {
                try {
                    if (transfer != t) return;
                    if (t.stream == null || sequence != t.nextSequence) throw new Exception("파일 순서를 확인할 수 없어요.");
                    byte[] bytes=Base64.decode(encoded,Base64.NO_WRAP);
                    if (bytes.length==0 || bytes.length>MAX_CHUNK || t.written+bytes.length>t.expected || t.written+bytes.length>MAX_ZIP)
                        throw new Exception("파일 크기가 처음 안내한 내용과 달라요.");
                    t.stream.write(bytes); t.written+=bytes.length; t.nextSequence++; t.busy=false;
                    reply(t.reply,t.id,"chunk",sequence,"");
                } catch (Exception e) { fail(t,"파일을 쓰지 못했어요. 저장 공간을 확인해 주세요.","error"); }
            });
        } else if ("finish".equals(type)) {
            t.busy=true;
            io.execute(() -> {
                try {
                    if (transfer != t) return;
                    if (t.stream==null || t.written!=t.expected) throw new Exception("파일이 끝까지 전달되지 않았어요.");
                    t.stream.flush();t.stream.close();t.stream=null;transfer=null;t.busy=false;
                    reply(t.reply,t.id,"saved",t.nextSequence,"");
                } catch (Exception e) { fail(t,"파일을 끝까지 저장하지 못했어요. 다시 시도해 주세요.","error"); }
            });
        } else reply(proxy,id,"error",-1,"지원하지 않는 저장 요청이에요.");
    }
    private void fail(Transfer t,String message,String type) {
        if (transfer != t) return;
        transfer=null;
        try { if (t.stream!=null) t.stream.close(); } catch (Exception ignored) {}
        t.stream=null;
        if (t.uri!=null) try { DocumentsContract.deleteDocument(getContentResolver(),t.uri); } catch (Exception ignored) {}
        reply(t.reply,t.id,type,-1,message);
    }
    private void reply(JavaScriptReplyProxy proxy,String id,String type,int sequence,String message) {
        runOnUiThread(() -> {
            if (destroyed) return;
            try {
                JSONObject result=new JSONObject().put("id",id).put("type",type).put("sequence",sequence).put("message",message);
                proxy.postMessage(result.toString());
            } catch (Exception ignored) {}
        });
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if (request==PICK_FILE) {
            ValueCallback<Uri[]> callback=fileCallback;fileCallback=null;if(callback==null)return;
            ArrayList<Uri> picked=new ArrayList<>();
            if(result==RESULT_OK&&data!=null) {
                ClipData clips=data.getClipData();
                if(clips!=null)for(int i=0;i<clips.getItemCount();i++){Uri uri=clips.getItemAt(i).getUri();if("content".equals(uri.getScheme()))picked.add(uri);}
                else if(data.getData()!=null&&"content".equals(data.getData().getScheme()))picked.add(data.getData());
            }
            callback.onReceiveValue(picked.isEmpty()?null:picked.toArray(new Uri[0]));
        } else if(request==SAVE_ZIP) {
            documentPickerOpen=false;
            Transfer t=transfer;if(t==null)return;
            if(result!=RESULT_OK||data==null||data.getData()==null) { transfer=null;reply(t.reply,t.id,"cancelled",-1,"저장을 취소했어요. 기록은 그대로 남아 있어요.");return; }
            Uri uri=data.getData();
            if(!"content".equals(uri.getScheme())){transfer=null;reply(t.reply,t.id,"error",-1,"선택한 위치에 저장할 수 없어요.");return;}
            t.uri=uri;t.busy=true;
            io.execute(() -> {
                try { if(transfer!=t)return;t.stream=getContentResolver().openOutputStream(uri,"wt");if(t.stream==null)throw new Exception();t.busy=false;reply(t.reply,t.id,"ready",-1,""); }
                catch(Exception e){fail(t,"선택한 위치에 파일을 만들지 못했어요.","error");}
            });
        }
    }
    @Override public void onBackPressed() {
        if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        destroyed=true;
        if(fileCallback!=null){fileCallback.onReceiveValue(null);fileCallback=null;}
        Transfer t=transfer;if(t!=null)io.execute(() -> fail(t,"","cancelled"));
        io.shutdown();if(web!=null){web.stopLoading();web.destroy();web=null;}
        super.onDestroy();
    }
}

