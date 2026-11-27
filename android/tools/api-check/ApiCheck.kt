package vn.tyzo.sub
import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
fun main(){
 var status=200;var response="{\"saved\":false}"
 val server=HttpServer.create(InetSocketAddress("127.0.0.1",0),0)
 server.createContext("/"){e->e.requestBody.use{it.readBytes()};val bytes=response.toByteArray();e.sendResponseHeaders(status,bytes.size.toLong());e.responseBody.use{it.write(bytes)}};server.start()
 val web="http://127.0.0.1:${server.address.port}"
 fun refused(fn:()->Unit){check(runCatching{fn()}.exceptionOrNull()is ApiError)}
 try{
 val save={Api.historySave(web,"fixture","id","model","vi",1,listOf(Cue(0.0,1.0,"x","y")))}
 refused(save);response="{\"saved\":true}";refused(save);response="{\"saved\":true,\"id\":\"server-id\"}";save()
 println("PASS history requires saved=true and receipt id")
 status=500;refused{Api.unlink(web,"fixture")};status=200;response="{\"ok\":false}";refused{Api.unlink(web,"fixture")};response="{\"ok\":true}";Api.unlink(web,"fixture")
 println("PASS unlink rejects server/network failure and requires acknowledgement")
 response="{\"token\":\"fixture\",\"email\":\"a@example.invalid\"}";refused{Api.link(web,"12345678","fixture")}
 response="{\"token\":\"fixture\",\"email\":\"a@example.invalid\",\"userId\":\"account-A\"}";check(Api.link(web,"12345678","fixture").userId=="account-A");check(Api.me(web,"fixture").userId=="account-A")
 println("PASS stable authenticated account identity parsed; old server fails closed")
 server.stop(0)
 val offline=runCatching{Api.unlink(web,"fixture")}.exceptionOrNull()
 check(offline is ApiError && offline.status==0)
 println("PASS offline unlink reports failure")
 }finally{server.stop(0);Api.client.dispatcher.executorService.shutdownNow();Api.client.connectionPool.evictAll()}
}
