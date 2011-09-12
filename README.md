Outliner is an improved outline view for the Orion JavaScript editor. It uses UglifyJS's parser to
build an abstract syntax tree of your JavaScript code, then constructs a tree of your functions. A few
simple heuristics are used to infer the names of anonymous functions.

Installing onto local Orion server
----------------------------------
1. Browse to ```[your orion directory]/eclipse/plugins/org.eclipse.orion.client.core_0.2.0.vXXXXXXXX-XXXX/web/```.
2. Open the file ```defaults.pref``` and change this line:

        "/plugins/jslintPlugin.html":true,
   to

        // "/plugins/jslintPlugin.html":true,
3. Launch your Orion server (if it's not already running), and reload http://localhost:8080/defaults.pref in your browser to make sure it's not cached.
4. Log in to your Orion server, go to the Plugins page, and uninstall ```jslintPlugin.html```.
5. Paste [http://mamacdon.github.com/outliner/newoutlinePlugin.html](http://mamacdon.github.com/outliner/newoutlinePlugin.html) into the box and click Install.
   After a moment, you should see a success message.
6. Open a JavaScript file in the Orion editor. You'll see the outline tree in the left-hand pane.

<!-- The first 3 steps are a workaround for [Orion Bug 355895](https://bugs.eclipse.org/bugs/show_bug.cgi?id=355895). -->
<!-- 
Installing onto orionhub
------------------------
We can use Orionhub to simulate a local Orion server. We'll install the Outliner plugin into our "simulated" server.
1. Log into Orionhub.
2. Go to the Repositories page and clone the Orion client repository:
        git://git.eclipse.org/gitroot/orion/org.eclipse.orion.client.git
3. Go to the Sites page and create a new site configuration.
4. *While holding the SHIFT key*, click the Add button and choose ```org.eclipse.orion.client``` from the list.
   This should create a number of entries in the table.
5. Click *Start* to launch the site. Note the URL where the site is running; this is now your "local server".
6. Go to the Navigator and browse to ```org.eclipse.orion.client/bundles/org.eclipse.orion.client.core/web```.
7. Follow the instructions in "Installing" above, starting from Step 2.
-->

Uninstalling
------------
1. Open ```defaults.pref``` and uncomment the jslintPlugin line.
2. Uninstall ```newoutlinePlugin.html```.

Requirements
------------
* Orion 0.3 pre-M2 (any build newer than 08/28 will work)

License
-------
[Eclipse Distribution License v 1.0](http://www.eclipse.org/org/documents/edl-v10.html)
