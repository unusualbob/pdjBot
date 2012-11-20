var phantom = require('phantom');
var config = require('./config');
var smiffJSON = require('./smiff.json');

config.intervals = {
  smiffHour: '28800' // 8 hours
};

var bootTime = new Date()
  , timers = { smiffHour: bootTime.setHours( bootTime.getHours() - (config.intervals.smiffHour / 3600) ) };

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
        evaluate(page, function(config, smiffJSON){
        
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
              
              Playback.streamDisabled=true;
              Playback.stop();
              
              RoomUser.audience.gridData.avatarCap=1;
              RoomUser.redraw();
              DB.settings.avatarcap=1;
              DB.saveSettings();
              
              animSpeed = 5000;
              
              /**Event listeners**/
              API.addEventListener(API.CHAT, function(data){
                if (data.message.substr(0,1) === "/"){
                  command(data);
                } else {
                  
                  var tokens = data.message.split(" ");
                  tokens.forEach(function(token) {
                    if (token.substr(0, 1) === '!') {
                      data.message = '/'+token.substr(1);
                      command(data);
                    }
                  });
                
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
              
              //This is autovote, it was requested that I remove this so /awesome was more awesome
              
              // API.addEventListener(API.DJ_ADVANCE, function(djs) {
                // if ($('#button-vote-positive').length != 0) {
                  // setTimeout(function(){
                    // $('#button-vote-positive').click();
                  // },761);
                // } else {
                  // console.log("couldn't find upvote");
                // }
                
              // });
              
              
              
              /**COMMANDS**/
              function command(data) {
                var cmd = data.message;
                var tokens = cmd.substr(1, cmd.length).split(" ");
                var now = new Date();
                
                console.log("Command " + tokens[0]);
                
                switch (tokens[0])
                {
                  case 'about':
                  case 'commands':
                    socket.emit('chat',"http://github.com/unusualbob/pdjBot");
                    break;
                  case 'cb':
                    //var djs = API.getDJs();
                    API.sendChat('If I were a moderator, I\'d remove you at the end of this song.  I\'m not, so I can\'t, and thus won\'t.');
                  break;
                  case 'idle':
                  case 'djs':
                    getIdleDjs();
                    break;
                  case 'pjs':
                    API.sendChat('Time for bed already?');
                  case 'bjs':
                    API.sendChat('Sorry bjs are not yet supported, and even if they were would you really want an internet bj?');
                  case 'bitch':
                    API.sendChat('Not a lot of things are against the rules, but bitching about the music is. Stop being a bitch.');
                    break;
                  case 'rules':
                    socket.emit('chat','No song limits, no queues, no auto-dj. Pure FFA. DJ\'s over 10 minutes idle (measured by chat) face the [boot]. See /music for music suggestions, though there are no defined or enforced rules on music. More: http://goo.gl/b7UGO');
                    break;
                  case 'afk':
                    API.sendChat('If you\'re AFK at the end of your song for longer than 30 minutes you get warning 1. One minute later you get warning 2, another minute last warning, 30 seconds [boot].');
                    break;
                  case 'afpdj':
                  case 'aftt':
                    API.sendChat('-AFTT- AFPDJ is just as bad as AFK. DJ\'s must pay attention to chat, if you cannot do that then don\'t DJ during prime time. The purpose of these rules is so that active users who can pay attention to chat at their employer\'s expense can sit up on the decks.');
                    break;
                  case 'count':
                    API.sendChat('There are ' + API.getUsers().length + ' users.');
                    break;
                  case 'remaeus' :
                  case 'remæus':
                    API.sendChat("Hey @remæus close a few tabs so your chrome doesn't crash");
                    break;
                  case 'nsfw':
                    API.sendChat('Please give people who are listening at work fair warning about NSFW videos.  It\'s common courtesy for people who don\'t code from home or at an awesome startup like LocalSense!');
                  break;
                  case 'music' :
                    musicTip();
                    break;
                  case 'video':
                    API.sendChat('dat video.');
                  break;
                  case 'votekick':
                    if (typeof(tokens[1]) != 'undefined' && tokens[1].length > 0) {
                      API.sendChat('Who do you want to votekick?  I need a name.');
                    } else {
                      API.sendChat('I am not a moderator of this room, so I cannot accept your vote to kick ' + tokens[1] + '.  Sorry.');
                    }
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
                    // TODO: only allow mods to trigger smiffhour
                    if ( (now - timers.smiffHour) > (config.intervals.smiffHour * 1000) ) {
                      API.sendChat('Smiff Hour unlocked!  For the next several songs, we are going to play a selection of Will Smith songs. origin: Smiff Hour is a time honored tradition dating back to the beginning of the Coding Soundtrack. It is unknown who played the first Willard Smith.');
                      setTimeout(function() {
                        API.sendChat('The hour of the SMIFF has now passed.');
                      }, 3600000); // 3600 seconds = 1 hour
                    } else {
                      API.sendChat('Soon™...');
                    }
                  break;
                  case 'lame' :
                    if ($('#button-vote-negative').length != 0) {
                      $('#button-vote-negative').click();
                      API.sendChat('aww ok');
                    } else {
                      console.log("couldn't find downvote");
                    }
                    break;
                  case 'catfacts':
                    $.getJSON('http://www.corsproxy.com/catfacts-api.appspot.com/api/facts', function(data) {
                      if (data.facts && data.facts.length > 0) {
                        API.sendChat(data.facts[0]);
                      }
                    });
                  break;
                  case 'smiffacts':
                  case 'smiffax':
                  case 'smifffax':
                  case 'smifffacts':
                    if (smiffJSON.facts) {
                      var len = smiffJSON.facts.length;
                      if (len > 0) {
                        var pick = Math.floor(Math.random()*len);
                          if (smiffJSON.facts[pick].length < 251) {
                            API.sendChat(smiffJSON.facts[pick]);
                          } else {
                            API.sendChat(smiffJSON.facts[pick]);
                            setTimeout(function() {
                              API.sendChat(smiffJSON.facts[pick].substr(250));
                            }, 5001);
                          }
                      } else {
                        console.log('no length');
                      }
                    } else {
                      console.log('no facts :/');
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
                    break;
                  case 'erm' :
                    API.sendChat(ermgerd(cmd.substr(4)));
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
              
              function ermgerd(text) {
                text = text.toUpperCase();

                var words = text.split(' '),
                  translatedWords = [];

                for (var j in words) {
                  var prefix = words[j].match(/^\W+/) || '',
                    suffix = words[j].match(/\W+$/) || '',
                    word = words[j].replace(prefix, '').replace(suffix, '');

                  if (word) {
                    // Is translatable
                    translatedWords.push(prefix + translate(word) + suffix);
                  } else {
                    // Is punctuation
                    translatedWords.push(words[j]);
                  }
                }

                return translatedWords.join(' ');
              }
              
              function str_split(string, split_length) {
                // http://kevin.vanzonneveld.net
                // +     original by: Martijn Wieringa
                // +     improved by: Brett Zamir (http://brett-zamir.me)
                // +     bugfixed by: Onno Marsman
                // +      revised by: Theriault
                // +        input by: Bjorn Roesbeke (http://www.bjornroesbeke.be/)
                // +      revised by: Rafał Kukawski (http://blog.kukawski.pl/)
                // *       example 1: str_split('Hello Friend', 3);
                // *       returns 1: ['Hel', 'lo ', 'Fri', 'end']
                if (split_length === null) {
                  split_length = 1;
                }
                if (string === null || split_length < 1) {
                  return false;
                }
                string += '';
                var chunks = [],
                  pos = 0,
                  len = string.length;
                while (pos < len) {
                  chunks.push(string.slice(pos, pos += split_length));
                }

                return chunks;
              };

              function translate(word) {
                // Don't translate short words
                if (word.length == 1) {
                  return word;
                }

                // Handle specific words
                switch (word) {
                  case 'AWESOME':      return 'ERSUM';
                  case 'BANANA':      return 'BERNERNER';
                  case 'BAYOU':      return 'BERU';
                  case 'FAVORITE':
                  case 'FAVOURITE':    return 'FRAVRIT';
                  case 'GOOSEBUMPS':    return 'GERSBERMS';
                  case 'LONG':      return 'LERNG';
                  case 'MY':        return 'MAH';
                  case 'THE':        return 'DA';
                  case 'THEY':      return 'DEY';
                  case 'WE\'RE':      return 'WER';
                  case 'YOU':        return 'U';
                  case 'YOU\'RE':      return 'YER';
                }

                // Before translating, keep a reference of the original word
                var originalWord = word;

                // Drop vowel from end of words
                if (originalWord.length > 2) {  // Keep it for short words, like "WE"
                  word = word.replace(/[AEIOU]$/, '');
                }

                // Reduce duplicate letters
                word = word.replace(/[^\w\s]|(.)(?=\1)/gi, '');

                // Reduce adjacent vowels to one
                word = word.replace(/[AEIOUY]{2,}/g, 'E');  // TODO: Keep Y as first letter

                // DOWN -> DERN
                word = word.replace(/OW/g, 'ER');

                // PANCAKES -> PERNKERKS
                word = word.replace(/AKES/g, 'ERKS');

                // The meat and potatoes: replace vowels with ER
                word = word.replace(/[AEIOUY]/g, 'ER');    // TODO: Keep Y as first letter

                // OH -> ER
                word = word.replace(/ERH/g, 'ER');

                // MY -> MAH
                word = word.replace(/MER/g, 'MAH');

                // FALLING -> FALERNG -> FERLIN
                word = word.replace('ERNG', 'IN');

                // POOPED -> PERPERD -> PERPED
                word = word.replace('ERPERD', 'ERPED');

                // MEME -> MAHM -> MERM
                word = word.replace('MAHM', 'MERM');

                // Keep Y as first character
                // YES -> ERS -> YERS
                if (originalWord.charAt(0) == 'Y') {
                  word = 'Y' + word;
                }

                // Reduce duplicate letters
                word = word.replace(/[^\w\s]|(.)(?=\1)/gi, '');

                // YELLOW -> YERLER -> YERLO
                if ((originalWord.substr(-3) == 'LOW') && (word.substr(-3) == 'LER')) {
                  word = word.substr(0, word.length - 3) + 'LO';
                }

                return word;
              };
              
            }
          }
          else
          {
            console.log("Unknown url: " + url);
          }
        }, config, smiffJSON);
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

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
