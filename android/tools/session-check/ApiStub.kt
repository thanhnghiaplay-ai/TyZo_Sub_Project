package vn.tyzo.sub
class ApiError(val status: Int, message: String): Exception(message)
object Api {
 var send: () -> Unit = {}
 var lastToken=""
 fun historySave(web:String,token:String,id:String,model:String,target:String,at:Long,cues:List<Cue>) {lastToken=token;send()}
}
