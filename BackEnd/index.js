const fetch = require("node-fetch");
let express = require('express');
let https = require('https');
var fs = require('fs');
let app = express();


let cors = require("cors");
let { RtcTokenBuilder, RtcRole, RtmTokenBuilder, RtmRole } = require('agora-access-token');

const cert = '33e3f30f86564186a288e31860e7e4db';
const appId = 'd21fd5bea4e4402b870c100d7172619e';
let uid = 0;
const rolePub = RtcRole.PUBLISHER;
const roleSub = RtcRole.SUBSCRIBER;
const expirationTimeInSeconds = 3600;

//whiteboard
const wbSdkToken = "NETLESSSDK_YWs9bl95cXd2SElnc3NQSHp6dCZub25jZT1kMzZkNjQzMC0wYzUxLTExZWUtYTVjMC03Yjg2MGE4ZDIxNjYmcm9sZT0wJnNpZz1hNWRlZGI3YjkyNTc0MTQwYzNjMjlhNzliMTRiYWI3N2MzZTc0ZWMyYzFiNWE0YTYxZTc5YjljMGU0ZDgzMDU5";
const AK ="n_yqwvHIgssPHzzt";
const SK ="TL1SAUAsshJkYq9U0EQuXkIvBe0y-y-x";

let roomId = "";



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


app.get("/rtm-token/:uid", (req, res)=>{
    let token = RtmTokenBuilder.buildToken(
        appId,
        cert,
        req.params.uid,
        1,
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



app.get("/wb-data", async (req, res) => {

    if(!roomId){
        let roomData = await fetch("https://api.netless.link/v5/rooms", {
            "method": "POST",
            "headers": {
                "token": wbSdkToken,
                "Content-Type": "application/json",
                "region": "us-sv"
            },
            body: JSON.stringify({
                "isRecord": false
            })
        })
        .then(r => r.json())
        .catch(e =>{
            console.log(e);
            res.sendStatus(500);
            res.end("room creation failed");
        });

        roomId = roomData.uuid;
    }

    let roomToken = await fetch(`https://api.netless.link/v5/tokens/rooms/${roomId}`,{
        method: "POST",
        headers: {
            "token": wbSdkToken,
            "Content-Type": "application/json",
            "region": "us-sv"
        },
        body: JSON.stringify({
            "lifespan":7200000,
            "role":"admin"
        })
    })
    .then( r=> r.json())
    .catch(e =>{
        console.log(e);
        res.sendStatus(500);
        res.end("room token creation failed");
    })

    console.log("------ room data generated --------")
    console.log("roomId: "+ roomId);
    console.log(roomToken);

    res.json({
        "roomId": roomId,
        "roomToken": roomToken
    });
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