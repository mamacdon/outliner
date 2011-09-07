Outliner is an improved outline view for the Orion JavaScript editor. It uses UglifyJS's parser to
build an abstract syntax tree of your JavaScript code, then constructs a tree of your functions. A few
simple heuristics are used to infer the names of anonymous functions.

Installing onto your local Orion server
---------------------------------------
1.  Clone the outliner repo from Github.
2.  Host the outliner code on a web server somewhere. For bonus points, you can [host it right from your Orion workspace](http://wiki.eclipse.org/Orion/How_Tos/Setup_Orion_Client_Hosted_Site_on_OrionHub).
3.  Open the file ``` org.eclipse.orion.client.core/web/defaults.pref``` and comment out this line:

        "/plugins/jslintPlugin.html":true,
    Then reload http://localhost:8080/defaults.pref in your browser to make sure it's not cached.

    (This is a workaround for [Orion Bug 355895](https://bugs.eclipse.org/bugs/show_bug.cgi?id=355895).)
4. Log in to Orion, go to the Plugins page, and uninstall ```jslintPlugin.html```.
5. Paste the URL where you're hosting ```newoutlinePlugin.html``` into the box and click Install.
   You should see a success message.
6. Open a JavaScript file in the Orion editor. You'll see the outline tree in the left-hand pane.

To uninstall, uncomment the line from Step 3, and uninstall the plugin from Step 5.

Requirements
---------------------------------------
* Orion 0.3 pre-M2 (any build newer than 08/28 will work)
