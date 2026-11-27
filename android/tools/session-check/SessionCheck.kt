package vn.tyzo.sub
import android.content.Context
import java.nio.file.Files
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
fun main(){
 val ctx=Context(Files.createTempDirectory("tyzo-session-after").toFile())
 val a=Session.Owner("https://fixture.invalid","account-A");val b=Session.Owner("https://fixture.invalid","account-B")
 val old=listOf(Cue(0.0,1.0,"PRIVATE_A","A"));val fresh=listOf(Cue(0.0,1.0,"NEW_A","new"))
 check(Session.save(ctx,a,old,1000));check(Session.load(ctx,b)==null);check(Session.load(ctx,a)!!.second==old)
 check(Session.Owner("https://other.invalid","account-A").key!=a.key)
 check(Session.Owner("https://fixture.invalid/","account-A").key==a.key)
 check(Session.Owner("https://FIXTURE.invalid:443","account-A").key==a.key)
 check(Session.Owner("https://fixture.invalid:444","account-A").key!=a.key)
 check(Session.save(ctx,b,listOf(Cue(0.0,1.0,"PRIVATE_B","B")),1100))
 println("PASS account+origin namespace isolation")
 val entered=CountDownLatch(1);val release=CountDownLatch(1)
 Api.send={entered.countDown();check(release.await(5,TimeUnit.SECONDS))}
 val t=Thread{Session.sync(ctx,a,"token-A")};t.start();check(entered.await(5,TimeUnit.SECONDS))
 check(Session.save(ctx,a,fresh,2000));release.countDown();t.join()
 check(Session.load(ctx,a)!!.second==fresh);check(Session.load(ctx,b)!!.second[0].original=="PRIVATE_B")
 println("PASS late sync cannot overwrite newer save or another account")
 Api.send={throw ApiError(400,"rejected")};check(!Session.sync(ctx,a,"token-A"));check(!Session.sync(ctx,a,"token-A"))
 Api.send={};check(Session.sync(ctx,a,"token-A"));check(Session.sync(ctx,a,"token-A"))
 println("PASS rejected sync remains retryable and successful acknowledgement is durable")
 check(Session.save(ctx,a,fresh,3000));val e2=CountDownLatch(1);val r2=CountDownLatch(1)
 Api.send={e2.countDown();check(r2.await(5,TimeUnit.SECONDS))};val t2=Thread{Session.sync(ctx,a,"token-A")};t2.start();check(e2.await(5,TimeUnit.SECONDS));Session.clear(ctx,a);r2.countDown();t2.join();check(Session.load(ctx,a)==null)
 println("PASS clear wins over old completion")
 val legacy=java.io.File(ctx.filesDir,"phien-gan-nhat.json");legacy.writeText("legacy-private");check(Session.hasUnscopedLegacy(ctx));Api.send={error("legacy must not upload")};check(Session.sync(ctx,a,"token-A"));check(legacy.readText()=="legacy-private")
 java.io.File(ctx.filesDir,"phien-${a.key}.json").writeText("corrupt-private");check(!Session.sync(ctx,a,"token-A"))
 val bad=Context(java.io.File(ctx.filesDir,"not-a-directory").also{it.writeText("keep")});check(!Session.save(bad,a,fresh,4000))
 println("PASS legacy retained, corrupt file not reported synced, failed write reported")
 check(Session.export(fresh,"srt").contains("00:00:00,000 --> 00:00:01,000"))
 check(Session.export(fresh,"vtt").startsWith("WEBVTT"));check(Session.export(fresh,"txt")=="new\n")
 println("PASS SRT/VTT/TXT export unchanged")
}
