var phantom = require('phantom');
var config = require('./config');

phantom.create(function(ph) {
  console.log('start');
  
  ph.createPage(function(page) {
    // Route "console.log()" calls from within the Page context to the main Phantom context (i.e. current "this")
    page.set('onConsoleMessage', function (msg) { 
      if (msg.substring(0, 17) !== "Viewport argument") { //This is to prevent html viewport logs from appearing
        console.log(msg); 
      }
    });

    //Everything starts here, open the main plug.dj webpage.
    page.open(encodeURI("http://www.plug.dj"), function(status){
      
      if ('success' === status)
      {
        //This function is a bitch, it doesn't like variables from outside AT ALL. To hack this add the variable here and at the bottom.
        evaluate(page, function(config){
        
          var url = window.location.href;
           
          if (url === 'http://www.plug.dj/')
          {
            if (0 != $('#twitter').length)
            {
              console.log("Redirect to twitter oauth");
              $('#twitter').click();
            }
            else
            {
              console.log('Successfully logged in, redirect to coding-soundtrack');
              window.location.href = 'http://www.plug.dj/coding-soundtrack/';
            }
          }
          else if (url.substring(0,43) === 'https://api.twitter.com/oauth/authenticate?')
          {
            if (typeof(document.getElementById('username_or_email')) != 'undefined') {
              console.log("Submitting credentials to twitter");
              document.getElementById('username_or_email').value = config.username;
              document.getElementById('password').value = config.password; 
              document.getElementById('oauth_form').submit();
              console.log('Submission complete');
            }
          }
          else if (url === 'https://api.twitter.com/oauth/authenticate')
          {
            var ps = document.getElementsByTagName('p'),
                l = ps.length;
            for (var i=0; i<l; i++)
            {
              if (ps[i].innerHTML.match(/Invalid user name or password/))
              {
                throw "invalid username/password for twitter?";
                return;
              }
            }
          }
          else if (url === 'http://www.plug.dj/coding-soundtrack/')
          {
          
            //INITIALIZE BOT HERE, We check our variable first to make sure we dont init multiple times
            if (!window.jarplug)
            {
              window.jarplug = {};
              window.djData = [];
              console.log("-|-|-|-|-Bot Ready-|-|-|-|-");
              
              /**Event listeners**/
              API.addEventListener(API.CHAT, function(data){
                if (data.message.substr(0,1) === "/"){
                  command(data);
                }
                
                if (data.message === "smiff, upvote" && data.fromID == "14028765") {
                  API.sendChat('ok done');
                }

                console.log(" - " + data.from + " : " + data.message  + " (ID: " + data.fromID + " )");
                
                
                //Update dj idle timers on messages
                djs = API.getDJs();
                for (var i = 0; i < djs.length; ++i) {
                  if (typeof(window.djData[djs[i].id]) != 'undefined') {
                    if (djs[i].id == data.fromID) {
                      window.djData[djs[i].id].lastActive = new Date().getTime();
                    }
                  } else {
                    window.djData[djs[i].id] = {
                        username : djs[i].username
                      , lastActive : new Date().getTime()
                    };
                  }
                }
                
              });
              
              //Update djs object with any new djs
              API.addEventListener(API.DJ_UPDATE, function(djs) {
                var changeTime = (new Date().getTime() - window.lastCheck);
                var djIds = [];
                
                if (window.lastDJS) {
                  if (djs.length > window.lastDJS.length) {
                    console.log("someone added");
                  } else if (djs.length < window.lastDJS.length) {
                    console.log("someone left");
                  }
                }

                for (var i = 0; i < djs.length; ++i) {
                  
                  djIds.push(djs[i].id);
                  
                  if (typeof(window.djData[djs[i].id]) == 'undefined') {
                    window.djData[djs[i].id] = {
                        username : djs[i].username
                      , lastActive : new Date().getTime()
                    };
                  }
                  
                  if (window.lastDJS) {
                    
                    if (window.lastDJS.indexOf(djs[i].id) == -1) {
                      if ( changeTime < 60000) {
                        if ( changeTime < 1500) {
                          API.sendChat(djs[i].username + " grabbed a seat in " + changeTime + "ms!");
                        } else {
                          API.sendChat(djs[i].username + " grabbed a seat in " + (changeTime/1000) + "seconds.");
                        }
                      }
                    }                    
                  }
                  
                  if (i >= djs.length - 1) {
                    window.lastDJS = djIds;
                    window.lastCheck = new Date().getTime();
                  
                  }
                }
                
              });
              
              API.addEventListener(API.DJ_ADVANCE, function(djs) {
                if ($('#button-vote-positive').length != 0) {
                  setTimeout(function(){
                    $('#button-vote-positive').click();
                  },761);
                } else {
                  console.log("couldn't find upvote");
                }
                
              });
              
              
              
              /**COMMANDS**/
              function command(data) {
                var cmd = data.message;
                var tokens = cmd.substr(1, cmd.length).split(" ");
                console.log("Command " + tokens[0]);
                
                switch (tokens[0])
                {
                  case 'about':
                  case 'commands':
                    API.sendChat("http://github.com/unusualbob/pdjBot");
                    break;
                  case 'idle':
                  case 'djs':
                    getIdleDjs();
                    break;
                  case 'bitch':
                    API.sendChat('Not a lot of things are against the rules, but bitching about the music is. Stop being a bitch.');
                    break;
                  case 'rules':
                    API.sendChat('No song limits, no queues, no auto-dj. Pure FFA. DJ\'s over 10 minutes idle (measured by chat) face the [boot]. See /music for music suggestions, though there are no defined or enforced rules on music. More: http://goo.gl/b7UGO');
                    break;
                  case 'afk':
                    API.sendChat('If you\'re afk at the end of your song for longer than 30 minutes you get warning 1. One minute later you get warning 2, another minute last warning, 30 seconds [boot].');
                    break;
                  case 'afpdj':
                  case 'aftt':
                    API.sendChat('-AFTT- AFPDJ is just as bad as AFK. DJ\'s must pay attention to chat, if you cannot do that then don\'t DJ during prime time. The purpose of these rules is so that active users who can pay attention to chat at their employer\'s expense can sit up on the decks.');
                    break;
                  case 'count':
                    API.sendChat('There are ' + API.getUsers().length + ' users.');
                    break;
                  case 'remaeus' :
                    API.sendChat("Hey @remæus close a few tabs so your chrome doesn't crash");
                    break;
                  case 'music' :
                    musicTip();
                    break;
                  case 'smiff' :
                    if (tokens[1] == 'upvote'){
                      if ($('#button-vote-positive').length != 0) {
                        $('#button-vote-positive').click();
                        API.sendChat('okay done');
                      } else {
                        console.log("couldn't find upvote");
                      }
                    }
                    break;
                  case 'smiffhour':
                    API.sendChat('For the next several songs, We are going to play a selection of Will Smith songs. origin: Smiff Hour is a time honored tradition dating back to the beginning of the Coding Soundtrack. It is unknown who played the first Willard Smith.');
                  break;
                  case 'lame' :
                    if ($('#button-vote-negative').length != 0) {
                      $('#button-vote-negative').click();
                      API.sendChat('aww ok');
                    } else {
                      console.log("couldn't find downvote");
                    }
                    break;
                  case 'awesome' :
                    if ($('#button-vote-positive').length != 0) {
                      $('#button-vote-positive').click();
                      API.sendChat('okay done');
                    } else {
                      console.log("couldn't find upvote");
                    }
                    break;
                  case 'mods' :
                  case 'moderators' :
                    callMods(data);
                }
              }
              
              //Simple check to see if a given ID is in the list of admin IDs in config
              function admin(id) {
                if (config.adminIds.indexOf(id) != -1) {
                  return true;
                }
                return false;
              }
              
              //Gets the list of currently idle djs
              function getIdleDjs() {
                console.log('pre api');
                djs = API.getDJs();
                
                var msg = "";
                for (var i = 0; i < djs.length; ++i) {
                  if (typeof(window.djData[djs[i].id]) == 'undefined') {
                    window.djData[djs[i].id] = {
                        username : djs[i].username
                      , lastActive : new Date().getTime()
                    };
                    
                  }
                  
                  idle = idleTime(djs[i].id);
                  
                  if (idle != "" && msg != "") {
                    msg += " || ";
                  }
                  
                  msg += idle;
                  
                  if (i >= djs.length - 1) {
                    if (msg != "") {
                      API.sendChat(msg);
                    } else {
                      API.sendChat("Looks like no one is idle!");
                    }
                  }
                }
              }
              
              //Calculates if a DJ is idle and returns a formatted idle string if so
              function idleTime(id) {
                //console.log("idle: " + window.djData[id].username + " : " + (new Date().getTime() - window.djData[id].lastActive));
              
                idle = Math.floor( ( new Date().getTime() - window.djData[id].lastActive) / 1000 );
                
                minutes = parseInt(idle / 60.0);
                if (minutes < 5) {
                  return "";
                }
                
                seconds = parseInt((idle % 60) * .6);
                
                if (seconds < 10) {
                  seconds = "0" + seconds;
                }
                
                return ( "@" + window.djData[id].username + " - " 
                      + minutes + ":" + seconds);
                
              }
              
              function musicTip() {
                
                time = new Date().getUTCHours() - 4;
                
                if ( 0 <= time && time < 5) {
                  API.sendChat("Evening! Keep the tempo up, it's the only thing keeping the all nighters going.");
                } else if ( 5 <= time && time < 12 ) {
                  API.sendChat("AM! Chill tracks with good beats, most programmers are slow to wake so don't hit them with hard hitting tunes. Wubs are widely discouraged this early.");
                } else if (12 <= time && time < 17 ){
                  API.sendChat('Afternoon! Fresh tracks for fresh people.');
                } else {
                  API.sendChat("Evening! Most people are out of work so things are a lot more fluid and much less harsh. Seats are easy to get, spin a few if you want but don't hog the decks!");
                }
              }
              
              function callMods(data) {
                var mods = API.getModerators();
                var msg = "";
                for (var i = 0; i < mods.length; i++) {
                
                  if (msg == "")
                    msg += "@" + mods[i].username;
                  else
                    msg += ", @" + mods[i].username;
                    
                  if (i >= mods.length - 1) {
                    API.sendChat(msg);
                  }
                }
              }
            }
          }
          else
          {
            console.log("Unknown url: " + url);
          }
        }, config);
      }
      else
      {
        console.log("status: " + status);
        phantom.exit();
      }
    });
 
    //hack so we can pass variables into page.evaluate, dumb thing
    function evaluate(page, func) {
        var args = [].slice.call(arguments, 2);
        var str = 'function() { return (' + func.toString() + ')(';
        for (var i = 0, l = args.length; i < l; i++) {
            var arg = args[i];
            if (/object|string/.test(typeof arg)) {
                str += 'JSON.parse(' + JSON.stringify(JSON.stringify(arg)) + '),';
            } else {
                str += arg + ',';
            }
        }
        str = str.replace(/,$/, '); }');
        return page.evaluate(str);
    }
    
  });

});
