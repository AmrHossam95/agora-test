
let express = require('express');
let https = require('https');
var fs = require('fs');
let app = express();


let cors = require("cors");
let { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const cert = '33e3f30f86564186a288e31860e7e4db';
const appId = 'd21fd5bea4e4402b870c100d7172619e';
let uid = 0;
const rolePub = RtcRole.PUBLISHER;
const roleSub = RtcRole.SUBSCRIBER;
const expirationTimeInSeconds = 3600;
app.use("/", express.static("dist/agora-test"));
app.use(cors({
    origin: "*"
}));
app.get("/token/:type/:channel", (req, res)=>{

    let type = '';
    if(req.params.type == "publish")
        type = rolePub;
    else
        type = roleSub; 
    //build token 
    let token = RtcTokenBuilder.buildTokenWithUid(
        appId, 
        cert, 
        req.params.channel,
        ++uid, 
        type, 
        Math.floor( Date.now() / 1000) + expirationTimeInSeconds
    );
    res.setHeader("content-Type", "application/json");
    res.json(
        {
            token,
            uid
        }
    );
    res.end();
});

if(process.env.local){
    secureServer = https.createServer({
        key: fs.readFileSync('certs/localhost.key'),
        cert: fs.readFileSync('certs/localhost.cert')
    }, app);
    
    secureServer.listen(3000);
}

else{
    app.listen(process.env.PORT);
}