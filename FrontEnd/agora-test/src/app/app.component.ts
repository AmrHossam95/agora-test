// @ts-nocheck
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import AgoraRTC, { 
  IAgoraRTCClient, 
  IAgoraRTCRemoteUser, 
  ICameraVideoTrack, 
  ILocalAudioTrack, 
  ILocalVideoTrack, 
  IRemoteAudioTrack, 
  IRemoteVideoTrack,
  ScreenEncoderConfigurationPreset,
  VideoEncoderConfigurationPreset
} from 'agora-rtc-sdk-ng';

import { HttpClient } from "@angular/common/http";
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'agora-test';
  agoraClient : IAgoraRTCClient;
  screeClient : IAgoraRTCClient;

  @ViewChild('local')
  localVideo!: ElementRef;

  @ViewChild('remoteVideo')
  remoteVideo!: ElementRef;

  @ViewChild('remoteScreen')
  remoteScreen!: ElementRef;



  clientOptions:IclientOptions =
  {
      // Pass your App ID here.
      appId: 'd21fd5bea4e4402b870c100d7172619e',
      // Set the channel name.
      channel: 'helloAgora',
      // Pass your temp token here.
      token: '',
      // Set the user ID.
      uid: 0,
  };

  // A variable to hold a local audio track.
  localAudioTrack!: ILocalAudioTrack;
  // A variable to hold a local video track.
  localVideoTrack!: ICameraVideoTrack;
  // A variable to hold a remote audio track.
  remoteAudioTrack!: IRemoteAudioTrack | undefined ;
  // A variable to hold a remote video track.
  remoteVideoTrack!: IRemoteVideoTrack | undefined;


  //screenTrack
  localScreenTrack!:  ILocalVideoTrack | undefined;
  screenTrack!: IRemoteVideoTrack | undefined;

  screenIsShared: boolean = false;
  videoIsPublished: boolean = false;
  screenMode: string = "motion";

  UpNetworkQuality: string = "";
  DownNetworkQuality: string ="";
  remoteUpNetworkQuality: string = "";
  remoteDownNetworkQuality: string = "";

  connectionState: string = "";
  autoChangeVideoQuality: boolean = true;


  currentQuality: number = 0;
  screenQuality: number = 0;
  canChangeQuality : boolean = true;



  networkProfile = {
    timeToUnlockQuality:  60000, //ms, when quality level becomes locked, ti will remain locked for this period
    downgradeAllowance: 3, // video is allowed to downgrade 3 times from certain quality level before it becomes locked
    historyMaxLength: 4,
    snapshotsConunter: 0, // once reaches historyMaxLength, it will repeat again from 0
    
    local: {
      upLink: {
        history: []
      },
      downLink: {
        history: []
      }
    },
    remote: {
      upLink: {
        history: []
      },
      downLink: {
        history: []
      }
    },
    qualityProfiles : [
      {
        name: "180p_4",
        isLocked: false,
        lockTimes: 0,
        downgradedTimes: 0
      },
      {
        name: "360p_7",
        isLocked: false,
        lockTimes: 0,
        downgradedTimes: 0
      },
      {
        name: "480p",
        isLocked: false,
        lockTimes: 0,
        downgradedTimes: 0
      }
    ]
  };


  screenProfiles = [
    "1080p"
  ];

  localResolution = {
    width:0,
    height:0
  }

  remoteResolution = {
    width:0,
    height:0
  }
  
  remoteUser : IAgoraRTCRemoteUser;
  screenRemoteUser: IAgoraRTCRemoteUser;


  //whiteboard
  wbConfig: WhiteWebSdkConfiguration = {
    "appIdentifier" : "WNvdwAlNEe61yUX5hW-c6g/h4vLmWcAnoOk5Q",
    "region": "us-sv"
  }

  constructor(private _httpClient: HttpClient){
    this.agoraClient =  AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    this.screeClient =  AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    //this.connectionStateHandler();
    this.initializeQualityHistory();
    this.networkMonitoringHandler();

/*     setInterval(()=>{
      this.getNetworkStats();
    }, 1000); */

  }

  initializeQualityHistory(){
    this.networkProfile.local.upLink.history = Array(this.networkProfile.historyMaxLength).fill(0);
    this.networkProfile.local.downLink.history = Array(this.networkProfile.historyMaxLength).fill(0);
    this.networkProfile.remote.upLink.history = Array(this.networkProfile.historyMaxLength).fill(0);
    this.networkProfile.remote.downLink.history = Array(this.networkProfile.historyMaxLength).fill(0);
  }

  connectionStateHandler(){
    //get state change
    this.agoraClient.on("connection-state-change", (currState, prevState, reason)=>{
      
      this.connectionState = `current: ${currState}, prev: ${prevState}, reason: ${reason}`;

      console.log("currentState: ", currState);
      console.log("prevState: ", prevState);
      console.log("reason: ", reason);

    });
  }

  networkMonitoringHandler(){
    this.agoraClient.on("network-quality",async  (quality) => {
      console.log("-----------network quality-----------");
      console.log(quality);

      switch (quality.uplinkNetworkQuality) {
        case 1:
          this.networkProfile.local.upLink.history.shift();
          this.networkProfile.local.upLink.history.push(true);
          this.UpNetworkQuality = "excellent";
          break;
        default:
          this.networkProfile.local.upLink.history.shift();
          this.networkProfile.local.upLink.history.push(false);
          this.UpNetworkQuality = "bad";
          break;
      }

      switch (quality.downlinkNetworkQuality) {
        case 1:
          this.networkProfile.local.downLink.history.shift();
          this.networkProfile.local.downLink.history.push(true);
          this.DownNetworkQuality = "excellent";
          break;
        default:
          this.networkProfile.local.downLink.history.shift();
          this.networkProfile.local.downLink.history.push(false);
          this.DownNetworkQuality = "bad";
          break;
      }

      if(this.localVideoTrack){
        this.localResolution.width = this.localVideoTrack.getMediaStreamTrack().getSettings().width;
        this.localResolution.height = this.localVideoTrack.getMediaStreamTrack().getSettings().height;  
      }
      
      console.log("--------- local network history  -----------")
      console.log("uplink", this.networkProfile.local.upLink.history);
      console.log("downlink", this.networkProfile.local.downLink.history);



      //remote
      let Q = this.agoraClient.getRemoteNetworkQuality();
      if(Q[this.remoteUser?.uid]){
        console.log("--- crazy remote quality -------", Q, this.remoteUser);

        switch (Q[this.remoteUser?.uid].uplinkNetworkQuality) {
          case 1:
            this.networkProfile.remote.upLink.history.shift();
            this.networkProfile.remote.upLink.history.push(true);
            this.remoteUpNetworkQuality = "excellent";
            break;
          default:
            this.networkProfile.remote.upLink.history.shift();
            this.networkProfile.remote.upLink.history.push(false);
            this.remoteUpNetworkQuality = "bad";
            break;
        }
  
        switch (Q[this.remoteUser?.uid].downlinkNetworkQuality) {
          case 1:
            this.networkProfile.remote.downLink.history.shift();
            this.networkProfile.remote.downLink.history.push(true);
            this.remoteDownNetworkQuality = "excellent";
            break;
          default:
            this.networkProfile.remote.downLink.history.shift();
            this.networkProfile.remote.downLink.history.push(false);
            this.remoteDownNetworkQuality = "bad";
            break;
        }

        console.log("--------- remote network history  -----------")
        console.log("uplink", this.networkProfile.remote.upLink.history);
        console.log("downlink", this.networkProfile.remote.downLink.history);      
      }

      if(this.remoteVideoTrack){
        this.remoteResolution.width = this.remoteVideoTrack.getMediaStreamTrack().getSettings().width;
        this.remoteResolution.height = this.remoteVideoTrack.getMediaStreamTrack().getSettings().height;
      }

      
      if(this.localVideoTrack){
              //handle upgrade & downgrade
        this.networkProfile.snapshotsConunter++;

        if(this.networkProfile.snapshotsConunter == 4 && this.autoChangeVideoQuality){
          //decide 
          if(this.networkProfile.local.upLink.history[0] && 
            this.networkProfile.local.upLink.history[1] &&
            this.networkProfile.local.upLink.history[2] &&
            this.networkProfile.local.upLink.history[3] && 
            (!Q[this.remoteUser?.uid] || Q[this.remoteUser?.uid] && 
              this.networkProfile.remote.downLink.history[0] && 
              this.networkProfile.remote.downLink.history[1] &&
              this.networkProfile.remote.downLink.history[2] &&
              this.networkProfile.remote.downLink.history[3] )){
              console.info("------- going to upgrade ---------");
                //upgrade
                if(this.currentQuality != this.networkProfile.qualityProfiles.length-1 && 
                  !this.networkProfile.qualityProfiles[this.currentQuality+1].isLocked){
                    this.changeQuality(1);
                }
            }
              
          else {
            //downgrade
            if(this.currentQuality != 0){
         
              if(this.networkProfile.qualityProfiles[this.currentQuality].downgradedTimes 
                == this.networkProfile.downgradeAllowance){

                  this.networkProfile.qualityProfiles[this.currentQuality].isLocked = true;
                  this.networkProfile.qualityProfiles[this.currentQuality].lockTimes++;
                  let lockedQuality = this.currentQuality;
                  console.info("-------- quality locked --------", lockedQuality,this.networkProfile.qualityProfiles);
                  let to = setTimeout(()=>{
                    this.networkProfile.qualityProfiles[lockedQuality].isLocked = false;
                    this.networkProfile.qualityProfiles[lockedQuality].downgradedTimes = 0;
                    console.info("-------- quality unlocked --------", lockedQuality,this.networkProfile.qualityProfiles);
                  }, this.networkProfile.timeToUnlockQuality);

              }
              console.info("------ going to downgrade -----------");
              await this.changeQuality(-1);
              this.networkProfile.qualityProfiles[this.currentQuality].downgradedTimes++;
            }
          }
  
          this.networkProfile.snapshotsConunter = 0
        }
      }


   });
  }

  getNetworkStats(){

    console.log("------ local Video Stats -------");
    let stats = this.agoraClient.getLocalVideoStats()
    this.localWatchedQuality = {
      width: stats.sendResolutionWidth,
      height: stats.sendResolutionHeight
    };
    console.log(stats);

    console.log("------ local Audio stats ---------");
    console.log(this.agoraClient.getLocalAudioStats());

    console.log("------ Remote Video Stats -------"); 
    let remoteStats = this.agoraClient.getRemoteVideoStats();
    this.remoteWatchedQuality = {
      width: remoteStats[this.remoteUser?.uid]?.receiveResolutionWidth,
      height: remoteStats[this.remoteUser?.uid]?.receiveResolutionHeight
    }
    console.log(remoteStats);

    console.log("------ Remote Audio stats -------");
    console.log(this.agoraClient.getRemoteAudioStats());

    console.log("------- screen local video stats-------");
    console.log(this.screeClient.getLocalVideoStats());
  }

  ngOnInit(){
    this.agoraClientSetup();
    this.whiteBoardSetup();
    window.addEventListener("beforeunload", async ()=>{
      if(this.agoraClient){
        this.agoraClient.unpublish(); //unpublish all tracks
        await this.agoraClient.leave();
      }

      if(this.screeClient){
        this.screeClient.unpublish(); //unpublish all tracks
        await this.screeClient.leave();
      }
    })
  }

  agoraClientSetup(){
    this.agoraClient.on("user-joined", (user)=>{
      console.log(" ---- doomed user joined -------");
      console.log(user);
      this.remoteUser = user;
    });
    this.agoraClient.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType)=> {
      console.log(user);
      console.log("mediaType: ", mediaType);
      
      await this.agoraClient.subscribe(user, mediaType);
      console.log("subscribe success");
      
      if(mediaType == "video"){
        this.remoteVideoTrack = user.videoTrack;
        this.remoteVideoTrack?.play(this.remoteVideo.nativeElement);
      }
      else if(mediaType == "audio"){
        this.remoteAudioTrack = user.audioTrack;
        this.remoteAudioTrack?.play();
      }
    });
    this.agoraClient.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType)=>{});

    this.screeClient.on('user-published', async(user: IAgoraRTCRemoteUser, mediaType)=>{
      if(mediaType == "video"){
        console.log("------- screen share publish handler -------");
        console.log(user);
        console.log("mediaType: ", mediaType);

        await this.screeClient.subscribe(user, mediaType);

        this.screenTrack = user.videoTrack;
        this.screenTrack?.play(this.remoteScreen.nativeElement);

        //lower local video quality
        this.lowerVideoQualityToLowestWhenScreenSharing();
      }
    });

    this.screeClient.on("user-unpublished", async(user: IAgoraRTCRemoteUser, mediaType)=>{
      console.log(" -------- screen unshared ---------")
      this.autoChangeVideoQuality = true;
      this.networkProfile.snapshotsConunter = 0;
    })


    this.onConnect();
  }


  whiteBoardSetup(){

    let wbInstance = new WhiteWebSdk(this.wbConfig);

    this._httpClient.get<{roomId: string, roomToken: string}>(`${window.location.href}wb-data`)
    .subscribe(
      res => {
        wbInstance.joinRoom({
          "uid": Math.ceil(Math.random() * 10e10).toString(),
          "uuid": res.roomId,
          "roomToken": res.roomToken
        })
        .then((room) => {
          console.log("room joined successfully");
          room.bindHtmlElement(document.getElementById("whiteboard"));
        })
        .catch(e=>{
          console.log("room joining failed");
          console.error(e);
        });
      }
    )
  }

  onConnect(){
    this.generatePubToken();
  }

  generatePubToken(){

    this._httpClient.get<IToken>(`${window.location.href}token/publish/helloAgora`).subscribe(
      { 
        next: (res: IToken)=>{
          this.clientOptions.token = res.token;
          this.clientOptions.uid = res.uid;
          this.agoraClient.join(
            this.clientOptions.appId,
            "helloAgora",
            this.clientOptions.token,
            this.clientOptions.uid
          )
          .then((uid)=>{
            this.setUpAgoraTracks();
          })
          .catch((err)=>{
            console.log("join failed: ", err);
          });
        },
        error: (err)=>{
          console.log(err);
        },
        complete: ()=>{
          console.log("token generated successfully");
        }
    });

    this._httpClient.get<IToken>(`${window.location.href}token/publish/helloAgoraShare`).subscribe({
      next: (res: IToken)=>{
        this.screeClient.join(
          this.clientOptions.appId,
          "helloAgoraShare",
          res.token,
          res.uid)
          .catch((error)=>{
            console.log("share channel join failed");
            console.log(error);
          });
      },
      error: (err)=>{
        console.log(err);
      },
      complete: ()=>{
        console.log("share token generated successfully");
      }
    });
  }

  async setUpAgoraTracks(){
    // setup video

/*     //setup audio
    await this.agoraClient.publish([this.localAudioTrack, this.localVideoTrack]);

    //play video
    this.localVideoTrack.play(this.localVideo.nativeElement); */
  }

  async startOrStopVideo(){
    if(this.videoIsPublished){
      //stop video
      this.localVideoTrack.stop();
      this.localAudioTrack.stop();
      await this.agoraClient.unpublish([ this.localVideoTrack, this.localAudioTrack]);
      this.localAudioTrack.close();
      this.localVideoTrack.close();
      this.videoIsPublished = false;
    }
    else{
      //start publishing
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
        "optimizationMode": "motion", 
        "encoderConfig": this.networkProfile.qualityProfiles[this.currentQuality].name,
        "facingMode": "user"
      });

      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();

      this.localVideoTrack.play(this.localVideo.nativeElement);
      await this.agoraClient.publish([ this.localVideoTrack, this.localAudioTrack]);
      this.videoIsPublished = true;
    }
  }

  async changeQuality(step: number){
    this.canChangeQuality = false;
    if(step == 1){
      if(this.currentQuality == this.networkProfile.qualityProfiles.length -1)
      {
        this.canChangeQuality = true;
        return;
      }
        

/*       await this.agoraClient.unpublish(this.localVideoTrack);
      this.localVideoTrack.close();
      //start publishing
      let tempVideo = await AgoraRTC.createCameraVideoTrack({
        "optimizationMode": "motion", 
        "encoderConfig": this.qualityProfiles[this.currentQuality + 1],
        "facingMode": "user"
      });

      await this.agoraClient.publish(tempVideo);
      tempVideo.play(this.localVideo.nativeElement);

      this.localVideoTrack = tempVideo; */
      await this.localVideoTrack.setEncoderConfiguration(this.networkProfile.qualityProfiles[this.currentQuality +1].name)
      this.currentQuality++;

      console.log(`---- qualiy up graded to :${this.networkProfile.qualityProfiles[this.currentQuality]}---- `);
    }
    else{
      if( this.currentQuality == 0){
        this.canChangeQuality = true;
        return;
      }


/*         await this.agoraClient.unpublish(this.localVideoTrack);
        this.localVideoTrack.close();
        //start publishing
      let tempVideo = await AgoraRTC.createCameraVideoTrack({
        "optimizationMode": "motion", 
        "encoderConfig": this.qualityProfiles[this.currentQuality-1],
        "facingMode": "user"
      });
      await this.agoraClient.publish(tempVideo);
      tempVideo.play(this.localVideo.nativeElement);
      this.localVideoTrack = tempVideo; */
      await this.localVideoTrack.setEncoderConfiguration(this.networkProfile.qualityProfiles[this.currentQuality -1])
      this.currentQuality--;

      console.log(`---- qualiy down graded to :${this.networkProfile.qualityProfiles[this.currentQuality]}---- `);
    }

    this.canChangeQuality = true;
  }


  async onClickScreenSharingBtn(){
    if(!this.screenIsShared){

      //start sharing
      this.localScreenTrack = await AgoraRTC.createScreenVideoTrack({
        "optimizationMode":this.screenMode, 
        "encoderConfig": this.screenProfiles[0]},
        "disable");
      this.localScreenTrack.on("track-ended", ()=>{
        this.onClickScreenSharingBtn();
      });

      this.localScreenTrack.play(this.remoteScreen.nativeElement);
      this.screeClient.publish(this.localScreenTrack);

      //enable sharing
      this.screenIsShared = true;

      //lower video quality
      this.lowerVideoQualityToLowestWhenScreenSharing();

    }
    else{

      //stop screen sharing
      this.screeClient.unpublish(this.localScreenTrack);
      this.localScreenTrack?.close();

      //disable sharing
      this.screenIsShared = false;

      //enable autochanging quality
      this.autoChangeVideoQuality = true;
      this.networkProfile.snapshotsConunter =0;

    }
  }


  async lowerVideoQualityToLowestWhenScreenSharing(){
    this.autoChangeVideoQuality = false;
    if(this.localVideoTrack){
      await this.localVideoTrack.setEncoderConfiguration(this.networkProfile.qualityProfiles[0].name);
      this.currentQuality=0;
    }
      

  }


  async toggleScreenShaingMode(){
    if(this.screenMode == "motion"){
      await this.localScreenTrack?.setOptimizationMode("detail");
      this.screenMode = "detail";
    }
    else{
      await this.localScreenTrack?.setOptimizationMode("motion");
      this.screenMode = "motion";
    }
  }

  async changeScreenQuality(step: number){
    if(step == 1){
      if(this.screenQuality == this.screenProfiles.length - 1)
        return;
      
      let tempTrack = await AgoraRTC.createScreenVideoTrack({
        "optimizationMode": this.screenMode as any, "encoderConfig": this.screenProfiles[this.screenQuality + 1] },
        "disable");

      tempTrack.on("track-ended", ()=>{
        this.onClickScreenSharingBtn();
      });

      await this.screeClient.unpublish(this.localScreenTrack);
      this.localScreenTrack?.close();
      this.screeClient.publish(tempTrack);
      tempTrack.play(this.remoteScreen.nativeElement);
      this.localScreenTrack = tempTrack;
      this.screenQuality++;
      
    }
    else{
      if(this.screenQuality == 0)
        return;
      
      let tempTrack = await AgoraRTC.createScreenVideoTrack({
        "optimizationMode": this.screenMode as any, "encoderConfig": this.screenProfiles[this.screenQuality - 1] },
        "disable");

      tempTrack.on("track-ended", ()=>{
        this.onClickScreenSharingBtn();
      });

      await this.screeClient.unpublish(this.localScreenTrack);
      this.localScreenTrack?.close();
      this.screeClient.publish(tempTrack);
      tempTrack.play(this.remoteScreen.nativeElement);
      this.localScreenTrack = tempTrack;
      this.screenQuality--;
    }
  }



}

interface IToken{
  token: string;
  uid: number;
}

interface IclientOptions {
    // Pass your App ID here.
    appId: string,
    // Set the channel name.
    channel: string,
    // Pass your temp token here.
    token: string,
    // Set the user ID.
    uid: number
};
