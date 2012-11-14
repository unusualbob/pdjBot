pdjBot
======
This is a bot for plug.dj which currently runs in http://plug.dj/coding-soundtrack

This is definitely a work in progress and there are at least a few hacks to get it to work right.

Contributors:
* ging (original gist basis) https://gist.github.com/3896543
* martindale - https://github.com/martindale

#Installing

    git clone git@github.com:unusualbob/pdjBot.git
    cd pdjBot
    npm install

Now copy config.js.sample to config.js and edit its values.

    node bot.js

#FAQ
    I get weird errors from phantom when I try to run it?
This is probably due to bad dependencies in phantom, to fix this cd into node_modules/phantom and edit package.json so that all of the dependencies are <= instead of ~. The newer version of some node modules causes phantom to fail. Now run npm install while still inside the phantom directory, this should install the proper dependencies.
