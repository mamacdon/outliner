Nonymous Outliner provides an improved outline view for the Orion JavaScript editor. It uses UglifyJS's parser to build
an abstract syntax tree of your JavaScript code, then constructs a hierarchical visualization of your functions.
The names are created using the "Function-Object Consumption" algorithm described in the
Splash Wavefront 2011 Paper: Naming Anonymous JavaScript Functions , by Salman Mirghasemi, John J. Barton, and Prof. Claude Petitpierre

Requirements
------------
* Orion 0.3M2 (a build newer than 09-16-2011 is recommended)
* http://orionhub.org is running 0.3M2+ now

Demo
----
1. Open the [Demo site](http://blog.johnjbarton.com:8080/navigate/table.html#/file/D/?depth=1)
2. You can't and don't have to login; ignore the warning. Click Plugins near the top right corner,
3. Navigate to a .js file
4. In the tall gray box on the left side you will see a dark gray
arrow. Use it to select "Nonymous Structural Outline".

(Due to a [bug](https://bugs.eclipse.org/bugs/show_bug.cgi?id=359160) you have to reselect the outliner for each file. 0

JavaScript Libraries Demo
-------------------------

Another demo page shows a number of examples all on one page: 
[http://blog.johnjbarton.com:8080/file/B/lib/nonymous/index.html](http://blog.johnjbarton.com:8080/file/B/lib/nonymous/index.html). 
No need to install the plugin to see this demo.


Installing into Orion
---------------------
1. Log in to Orion, and click the Plugins link on the global toolbar.
2. Paste [http://johnjbarton.github.com/outliner/nonymousPlugin.html](http://johnjbarton.github.com/outliner/nonymousPlugin.html) into the text box and click Install.
   After a moment, you should see a success message.
3. Open a JavaScript file in the Orion editor. You should now see a drop-down menu in the outline pane.
4. Click the drop-down arrow and choose "Nonymous Structural Outline".

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
1. Log in to Orion and click the Plugins link on the global toolbar.
2. Uninstall ```nonymousPlugin.html```.

License
-------
Google BSD, see license.txt.
